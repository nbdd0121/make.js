var Async = require('../Async');
var FileManager = require('../FileManager');
var Util = require('../Util');

var options = require("../make").options;

if (!global.Promise) {
	exports.Promise = require("promise");
} else {
	exports.Promise = Promise;
}

exports.log = console.log.bind(console);
exports.chdir = process.chdir.bind(process);
exports.cwd = process.cwd.bind(process);
exports.await = Async.await;
exports.sleep$ = Async.sleep;
exports.sleep = Async.makeSync(Async.sleep);
exports.exec$ = Async.exec;
exports.exec = Async.makeSync(Async.exec);

exports.lastModified = FileManager.lastModified;

var registeredTargets = Object.create(null);
var genericTargets = [];

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
	// TODO Add cache

	var exactMatch = registeredTargets[FileManager.normalize(target)];
	if (exactMatch) return exactMatch;
	for (var i = 0; i < genericTargets.length; i++) {
		var desc = genericTargets[i];
		if (typeof(desc.target) === 'function') {
			if (desc.target(target)) {
				return desc;
			}
		} else {
			if (desc.target.exec(target)) {
				return desc;
			}
		}
	}
	return null;
}

function getDependency(target, entry) {
	if (!entry) {
		return [];
	}

	// TODO Add cache

	/* If no dependency is generated dynamically
	 * we just return the original depedency array */
	for (var i = 0; i < entry.dependency.length; i++) {
		if (typeof(entry.dependency[i]) === 'function') {
			break;
		}
	}
	if (i === entry.dependency.length) {
		return entry.dependency;
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
	return Util.flattenArray(dependency);
}

function needToMake(target) {
	var entry = getRegistryEntry(target);
	var dependency = getDependency(target, entry);

	if (!entry) {
		if (options.verbose) {
			console.log('Analyzing target ' + target);
			console.log('  Target is not listed as a target, ignoring');
		}
		return false;
	}
	if (options.alwaysMake) {
		if (options.verbose) {
			console.log('Analyzing target ' + target);
			console.log('  Always-make option set, forced making');
		}
		return true;
	}
	for (var i = 0; i < dependency.length; i++) {
		if (needToMake(dependency[i])) {
			return true;
		}
	}
	var targetLM = FileManager.lastModified(target);
	var deplm = FileManager.lastModified(dependency);
	if (options.verbose) {
		console.log('Analyzing target ' + target);
		console.log('  Target last modified: ' + new Date(targetLM));
		console.log('  Dependency last modified: ' + new Date(deplm));
	}
	return targetLM <= deplm;
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