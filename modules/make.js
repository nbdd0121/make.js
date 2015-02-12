var FileManager = require('../FileManager');
var Util = require('../Util');
var Async = require('../Async');
var fs = require('fs');

var options = require("../make").options;

var registeredTargets = Object.create(null);
var genericTargets = [];

var entryCache = Object.create(null);
var depCache = Object.create(null);
var dirtyCache = Object.create(null);
var semaphore = new Async.Semaphore(options.jobs);

function registerTarget(target, dep, actions, phony) {
	dependency = Util.flattenArray(dep);
	actions = Util.flattenArray(actions);
	var descriptor = {
		target: target,
		dependency: dependency,
		actions: actions,
		phony: phony
	};
	if (typeof(target) === 'string') {
		registeredTargets[FileManager.normalize(target)] = descriptor;
	} else {
		genericTargets.push(descriptor);
	}
}

function getRegistryEntry(target) {
	if (target in entryCache) {
		return entryCache[target];
	}

	var result = registeredTargets[FileManager.normalize(target)];
	if (!result) {
		for (var i = 0; i < genericTargets.length; i++) {
			var desc = genericTargets[i];
			if (typeof(desc.target) === 'function') {
				if (desc.target(target)) {
					result = desc;
					break;
				}
			} else {
				if (desc.target.exec(target)) {
					result = desc;
					break;
				}
			}
		}
	}
	entryCache[target] = result;
	return result;
}

function getDependency(target, entry) {
	if (!entry) {
		return [];
	}

	if (target in depCache) {
		return depCache[target];
	}

	/* If no dependency is generated dynamically
	 * we just return the original depedency array */
	for (var i = 0; i < entry.dependency.length; i++) {
		if (typeof(entry.dependency[i]) === 'function') {
			break;
		}
	}
	if (i === entry.dependency.length) {
		return depCache[target] = entry.dependency;
	}

	var dependency = [];
	for (var i = 0; i < entry.dependency.length; i++) {
		var dep = entry.dependency[i];
		if (typeof(dep) === 'function') {
			dependency.push(dep(target));
		} else {
			dependency.push(dep);
		}
	}
	return depCache[target] = Util.flattenArray(dependency);
}

function needToMake(target) {
	if (target in dirtyCache) {
		return dirtyCache[target];
	}

	var entry = getRegistryEntry(target);
	var dependency = getDependency(target, entry);

	if (!entry) {
		if (options.verbose) {
			console.log('Analyzing target ' + target);
			console.log('  Target is not listed as a target, ignoring');
		}
		return dirtyCache[target] = false;
	}
	if (options.alwaysMake) {
		if (options.verbose) {
			console.log('Analyzing target ' + target);
			console.log('  Always-make option set, forced making');
		}
		return dirtyCache[target] = true;
	}

	for (var i = 0; i < dependency.length; i++) {
		if (needToMake(dependency[i])) {
			if (options.verbose) {
				console.log('Analyzing target ' + target);
				console.log('  Needs to make dependencies');
			}
			return dirtyCache[target] = true;
		}
	}

	if (entry.phony) {
		var dirty;
		if (options.verbose) {
			console.log('Analyzing target ' + target);
		}
		if (entry.actions.length !== 0) {
			if (options.verbose) {
				console.log('  Need to perform action');
			}
			dirty = true;
		} else if (options.verbose) {
			console.log('  No actions should be taken');
		}
		return dirtyCache[target] = dirty;
	} else {
		var targetLM = FileManager.lastModified(target);
		var deplm = FileManager.lastModified(dependency);
		if (options.verbose) {
			console.log('Analyzing target ' + target);
			console.log('  Target last modified: ' + new Date(targetLM).toLocaleString());
			console.log('  Dependency last modified: ' + new Date(deplm).toLocaleString());
		}
		return dirtyCache[target] = targetLM <= deplm;
	}
}

function makeTarget$(target, explicit) {
	var entry = getRegistryEntry(target);
	if (!entry) {
		if (explicit || !fs.existsSync(target)) {
			throw new Error('Cannot make target ' + target);
		}
	}

	if (needToMake(target)) {
		var dependency = getDependency(target, entry);
		var promises = new Array(dependency.length);
		for (var i = 0; i < dependency.length; i++) {
			promises[i] = makeTarget$(dependency[i]);
		}
		Async.await(promises);
		if (options.verbose) {
			console.log('Making target ' + target);
		}
		return new Async.Promise(function(resolve, reject) {
			Async.async(function() {
				try {
					semaphore.acquire();
					for (var i = 0; i < entry.actions.length; i++) {
						entry.actions[i](target, dependency);
					}
					semaphore.release();
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
	} else {
		if (explicit || options.verbose) {
			console.log('No need to make target ' + target);
		}
		return Async.Promise.resolve();
	}
}

function makeTarget(target, explicit) {
	Async.await(makeTarget$(target, explicit));
	return;
}

exports.target = function(target, dependency, actions) {
	registerTarget(target, dependency, actions, false);
}

exports.phony = function(target, dependency, actions) {
	registerTarget(target, dependency, actions, true);
}

exports.makeTarget = makeTarget;
exports.asDefault = function(target) {
	registerTarget('default', target, [], true);
}