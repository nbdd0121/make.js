var path = require('path'),
	fs = require('fs'),
	Util = require('./Util');

var cache = Object.create(null);

function getLastModifiedTime(file) {
	try {
		var stat = fs.statSync(file);
		if (stat.isDirectory()) {
			/* Specialized for directory: in some system, last modification time of directory is 
			 * not same as the last modification time of last modified file in that directory */
			var dirFiles = fs.readdirSync(file);
			var lmDate = dirFiles.reduce(function(maxValue, fileName) {
				return Math.max(maxValue, getLastModifiedTime(file + '/' + fileName));
			}, stat.mtime.getTime());
			return lmDate;
		} else {
			return stat.mtime.getTime();
		}
	} catch (e) {
		return 0;
	}
}

function normalize(p) {
	return path.resolve(process.cwd(), p);
}

exports.normalize = normalize;

exports.readFile = function(p) {
	try {
		return fs.readFileSync(p).toString();
	} catch (e) {
		switch (e.code) {
			case 'ENOENT':
				throw new Error('File `' + p + '` does not exist.');
			default:
				throw e;
		}
	}
}

exports.lastModified = function lastModified(p) {
	if (typeof(p) === 'string') {
		p = normalize(p);
		if (p in cache) {
			return cache[p];
		} else {
			var lm = getLastModifiedTime(p);
			cache[p] = lm;
			return lm;
		}
	}
	if (Util.isArrayLike(p)) {
		return Array.prototype.reduce.call(p, function(maxValue, file) {
			return Math.max(maxValue, lastModified(file));
		}, 0);
	}
	console.log(p);
	console.log(p.__proto__.constructor == Array);
	throw new TypeError('lastModified only accept array or string as arguments');
}