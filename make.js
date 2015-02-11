#!node

var opt = require('node-getopt').create([
	['B', 'always-make', 'Unconditionally make all targets'],
	['C', 'directory=DIRECTORY', 'Use DIRECTORY as work directory'],
	['d', 'debug', 'Print debug information and will not reduce stack trace on error'],
	['f', 'file=FILE', 'Read FILE as a makescript'],
	['h', 'help', 'Print this message and exit'],
	['s', 'silent', "Don't echo recipes"],
	['S', 'no-stdout', "Do not show messages written to stdout"],
	['v', 'verbose', 'Print verbose messages for debugging']
]).bindHelp().parseSystem();

if ('directory' in opt.options) {
	process.chdir(opt.options.directory);
}

var options = {
	alwaysMake: 'always-make' in opt.options ? true : false,
	debug: 'debug' in opt.options ? true : false,
	silent: 'silent' in opt.options ? true : false,
	noStdout: 'no-stdout' in opt.options ? true : false,
	verbose: 'verbose' in opt.options ? true : false,
};
exports.options = options;

var FileManager = require("./FileManager");
var Evaluation = require('./Evaluation');
var ModuleManager = require('./ModuleManager');
var Async = require('./Async');

var makescript = 'file' in opt.options ? opt.options.file : 'makescript';
var global = ModuleManager.createGlobal();
global.use('basic');

Async.async(function() {
	try {
		Evaluation.evaluate(FileManager.readFile(makescript), makescript, global);
	} catch (e) {
		if (!options.debug) {
			console.log(Evaluation.reduceStackTrace(e.stack, makescript));
		} else {
			console.log(e.stack);
		}
	}
});