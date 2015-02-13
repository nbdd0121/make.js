var util = require('util');

function loadModule(name) {
	try {
		return require('./modules/' + name);
	} catch (e) {
		throw new TypeError('Cannot load module `' + name + '`');
	}
}

function defineConst(obj, prop, val) {
	Object.defineProperty(obj, prop, {
		value: val
	});
}

function defineReadonly(obj, prop, getter) {
	Object.defineProperty(obj, prop, {
		get: getter,
		set: function() {
			throw new TypeError('Cannot modify read-only property `' + prop + '`');
		}
	});
}

function extendToObject(obj, module) {
	util._extend(obj, module);
}

exports.createGlobal = function() {
	var global = {};
	var loadedModules = [];
	defineConst(global, 'use', function(name) {
		if (typeof(name) !== 'string') throw new TypeError('`use` must be called with one string argument');
		if (name.indexOf('/') !== -1) throw new TypeError('Trying to load illegal module name using `use`');
		if (loadedModules.indexOf(name) !== -1) return false;
		var mod = loadModule(name);
		extendToObject(global, mod);
		loadedModules.push(name);
		return true;
	});
	defineReadonly(global, 'loadedModules', function() {
		return loadedModules.slice();
	});
	return global;
}