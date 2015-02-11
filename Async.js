var Fiber = require('fibers');
var Util = require('./Util');
var child_process = require('child_process');
var options = require("./make").options;

function await(promise) {
	var fiber = Fiber.current;
	var thrown, value;
	promise.then(function(result) {
		value = result;
		thrown = false;
		fiber.run();
	}, function(result) {
		value = result;
		thrown = true;
		fiber.run();
	});
	Fiber.yield();
	if (thrown) {
		if (value.stack) {
			var currentStack = new Error().stack;
			value.stack += currentStack.substr(currentStack.indexOf('\n'));
		}
		throw value;
	} else {
		return value;
	}
}

exports.async = function(async) {
	Fiber(function() {
		try {
			async();
		} catch (e) {
			console.log('Uncaught exception', e);
		}
	}).run();
}

exports.await = await;

exports.sleep = function(time) {
	return new Promise(function(resolve, reject) {
		setTimeout(resolve, time);
	});
}

exports.exec = function(cmd, args) {
	if (arguments.length > 2) {
		args = Array.prototype.slice.call(arguments, 1);
	}
	args = args ? Util.flattenArray(Util.toArray(args)) : [];
	return new Promise(function(resolve, reject) {
		if (!options.silent) {
			console.log(cmd, args.join(' '));
		}
		var c = child_process.spawn(cmd, args);
		var stdout = "";
		var stderr = "";
		c.stdout.on('data', function(data) {
			if (!options.noStdout) {
				process.stdout.write(data);
			}
			stdout += data;
		});
		c.stderr.on('data', function(data) {
			process.stderr.write(data);
			stdout += data;
		});
		c.on('close', function(code) {
			if (code) {
				reject(new Error(cmd + ' return error code ' + code));
			} else {
				resolve(stdout);
			}
		});
	});
}

exports.makeSync = function(async) {
	return function() {
		return await(async.apply(this, arguments));
	}
}