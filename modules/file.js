var fs = require('fs');
var Util = require('../Util');

var options = require('../make').options;

function isDir(dir) {
	return fs.statSync(dir).isDirectory();
}

function ls(dir) {
	return fs.readdirSync(dir);
}

function removeFile(path, options) {
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
			removeFile(fs.readdirSync(path), options);
		}
		fs.rmdirSync(path);
	} else {
		fs.unlinkSync(path);
	}
};

exports.exists = fs.existsSync.bind(fs);
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
		removeFile(path, options);
	});
	console.log("rm " + (options.length == 0 ? '' : '-' + options.join('')) + ' ' + path.join(' '));
};

exports.rmdir = fs.rmdirSync.bind(fs);
exports.mkdir = fs.mkdirSync.bind(fs);