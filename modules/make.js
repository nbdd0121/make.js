var FileManager = require('../FileManager');
var Util = require('../Util');

var options = require("../make").options;

var registeredTargets = Object.create(null);
var genericTargets = [];

var entryCache = Object.create(null);
var depCache = Object.create(null);
var dirtyCache = Object.create(null);

function registerTarget(target, dep, actions) {
	dependency = Util.flattenArray(dep);
	actions = Util.flattenArray(actions);
	var descriptor = {
		target: target,
		dependency: dependency,
		actions: actions
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
			return dirtyCache[target] = true;
		}
	}
	var targetLM = FileManager.lastModified(target);
	var deplm = FileManager.lastModified(dependency);
	if (options.verbose) {
		console.log('Analyzing target ' + target);
		console.log('  Target last modified: ' + new Date(targetLM));
		console.log('  Dependency last modified: ' + new Date(deplm));
	}
	return dirtyCache[target] = targetLM <= deplm;
}

function makeTarget(target, explicit) {
	var entry = getRegistryEntry(target);
	if (!entry && explicit) {
		throw new Error('Cannot make target ' + target);
	}

	if (needToMake(target)) {
		var dependency = getDependency(target, entry);
		var explicitPropagated = entry.actions.length === 0 && dependency.length === 1;

		for (var i = 0; i < dependency.length; i++) {
			makeTarget(dependency[i], explicitPropagated);
		}
		if (options.verbose) {
			console.log('Making target ' + target);
		}
		for (var i = 0; i < entry.actions.length; i++) {
			entry.actions[i](target, dependency);
		}
	} else {
		if (explicit || options.verbose) {
			console.log('No need to make target ' + target);
		}
		return false;
	}
}

exports.target = function(target, dependency, actions) {
	registerTarget(target, dependency, actions);
}

exports.makeTarget = makeTarget;
exports.asDefault = function(target) {
	registerTarget('default', target, []);
}