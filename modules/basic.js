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


var registeredTargets = Object.create(null);

exports.lastModified = FileManager.lastModified;
exports.target = function(target, dependency, actions) {
	dependency = Util.toArray(dependency);
	actions = Util.toArray(actions);
	registeredTargets[target] = {
		dependency: dependency,
		actions: actions
	};
}

function getRegistryEntry(target) {
	return registeredTargets[target] || null;
}

function needToMake(target, entry) {
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
	for (var i = 0; i < entry.dependency.length; i++) {
		if (needToMake(entry.dependency[i])) {
			return true;
		}
	}
	var targetLM = FileManager.lastModified(target);
	var deplm = FileManager.lastModified(entry.dependency);
	if (options.verbose) {
		console.log('Analyzing target ' + target);
		console.log('  Target last modified: ' + new Date(targetLM));
		console.log('  Dependency last modified: ' + new Date(deplm));
	}
	return targetLM <= deplm;
}

exports.makeTarget = function makeTarget(target) {
	var entry = getRegistryEntry(target);
	if (needToMake(target, entry)) {
		for (var i = 0; i < entry.dependency.length; i++) {
			makeTarget(entry.dependency);
		}
		if (options.verbose) {
			console.log('Making target ' + target);
		}
		for (var i = 0; i < entry.actions.length; i++) {
			entry.actions[i](target, entry.dependency);
		}
	} else {
		if (options.verbose) {
			console.log('No need to make target ' + target);
		}
		return false;
	}
}