var fs = require("fs");

module.exports = function rm(path, options) {
	if (path instanceof Array) {
		path.forEach(function(path) {
			rm(path, options);
		});
		return;
	}
	if (!(options instanceof Array)) {
		options = [options];
	}
	try {
		var stat = fs.lstatSync(path);
	} catch (e) {
		if (options.contains("f")) {
			return;
		}
		throw e;
	}
	if (stat.isDirectory()) {
		if (options.contains("r")) {
			throw path + ": Is a directory";
		} else {
			rm(fs.readdirSync(path), options);
		}
		fs.rmdirSync(path);
	} else {
		fs.unlinkSync(path);
	}
	console.log("rm " + (options.length == 0 ? "" : "-" + options.join("")) + " " + path);
};