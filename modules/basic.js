var Async = require('../Async');
var path = require('path');

var options = require("../make").options;

exports.Promise = Async.Promise;
exports.log = console.log.bind(console);
exports.chdir = process.chdir.bind(process);
exports.cwd = process.cwd.bind(process);
exports.exit = process.exit.bind(process);
exports.await = Async.await;
exports.sleep$ = Async.sleep;
exports.sleep = Async.makeSync(Async.sleep);
exports.exec$ = Async.exec;
exports.exec = Async.makeSync(Async.exec);
exports.make$ = function() {
	var args = Array.prototype.slice.call(arguments);
	if (!options.silent) {
		console.log('makejs', args.join(' '));
	}
	return Async.execJS(path.resolve(__dirname, '../make.js'), args);
}
exports.make = Async.makeSync(exports.make$);