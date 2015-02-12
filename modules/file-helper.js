var Util = require('../Util');
var file = require('./file');

exports.makeParentDirIfNotExist = function(files) {
	if (arguments.length > 1) {
		files = Array.prototype.slice.call(arguments);
	}
	Util.flattenArray(files).forEach(function(f) {
		var parentDir = file.parentDir(f);
		if (!file.exists(parentDir)) {
			file.mkdir(parentDir, 'p');
		}
	});
}