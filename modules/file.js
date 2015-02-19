var fs = require('fs');
var path = require('path');
var Util = require('../Util');
var FileManager = require('../FileManager');

var options = require('../make').options;

function log(cmd, arg, options) {
	if (!options.silent)
		console.log(cmd + (options.length == 0 ? '' : ' -' + options.join('')) + ' ' + arg.join(' '));
}

function isDir(dir) {
	return fs.statSync(dir).isDirectory();
}

function ls(dir) {
	return fs.readdirSync(dir);
}

function parentDir(p) {
	return path.dirname(p);
}

function rm(path, options) {
	try {
		var stat = fs.lstatSync(path);
	} catch (e) {
		if (options.indexOf("f") !== -1) {
			return;
		}
		throw e;
	}
	if (stat.isDirectory()) {
		if (options.indexOf("r") !== -1) {
			throw path + ": Is a directory";
		} else {
			rm(fs.readdirSync(path), options);
		}
		fs.rmdirSync(path);
	} else {
		fs.unlinkSync(path);
	}
};

function mkdir(path, options) {
	if (options.indexOf('p') !== -1) {
		var parent = parentDir(path);
		if (!fs.existsSync(parent))
			mkdir(parent, options);
		if (fs.existsSync(path))
			return;
	}
	fs.mkdirSync(path);
}

exports.exists = fs.existsSync.bind(fs);
exports.parentDir = parentDir;
exports.isDir = isDir;
exports.ls = ls;

exports.recursiveList = function(dir) {
	function list(d) {
		return ls(dir + "/" + d).map(function(f) {
			f = d + f;
			if (isDir(dir + "/" + f)) {
				return list(f + "/");
			} else {
				return f;
			}
		});
	}

	return Util.flattenArray(list(""));
};

exports.rm = function(path, options) {
	path = Util.flattenArray(path);
	options = Util.toArray(options);
	path.forEach(function(path) {
		rm(path, options);
	});
	log('rm', path, options);
};

exports.rmdir = fs.rmdirSync.bind(fs);
exports.mkdir = function(path, options) {
	path = Util.flattenArray(path);
	options = Util.toArray(options);
	path.forEach(function(path) {
		mkdir(path, options);
	});
	log('mkdir', path, options);
}

exports.include = function(path) {
	return FileManager.readFile(path);
}