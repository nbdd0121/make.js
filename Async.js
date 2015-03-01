var Fiber = require('fibers');
var Util = require('./Util');
var child_process = require('child_process');
var Promise = global.Promise ? global.Promise : require("promise");

var options = require("./make").options;

function await(promise) {
	if (!Util.isArrayLike(promise)) {
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
	} else {
		var arr = new Array(promise.length);
		for (var i = 0; i < promise.length; i++) {
			arr[i] = await(promise[i]);
		}
		return arr;
	}
}

function createPromiseOnChildProcess(cmd, c) {
	return new Promise(function(resolve, reject) {
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

function Semaphore(limit) {
	this.waiting = [];
	this.limit = limit;
	this.counter = 0;
}

Semaphore.prototype.acquire = function() {
	if (this.counter >= this.limit) {
		this.waiting.push(Fiber.current);
		Fiber.yield();
	}
	this.counter++;
}

Semaphore.prototype.release = function() {
	this.counter--;
	if (this.waiting.length) {
		this.waiting.shift().run();
	}
}

Semaphore.prototype.isFull = function() {
	return this.limit >= this.counter;
}


function Lock() {
	this.waiting = [];
	this.acquired = false;
}

Lock.prototype.acquire = function() {
	if (this.acquired) {
		this.waiting.push(Fiber.current);
		Fiber.yield();
	}
	this.acquired = true;
}

Lock.prototype.release = function() {
	this.acquired = false;
	if (this.waiting.length) {
		this.waiting.shift().run();
	}
}

exports.Promise = Promise;

exports.async = function(async) {
	var fiber = Fiber(function() {
		try {
			async();
		} catch (e) {
			console.log('Uncaught exception', e.stack);
		}
	});
	fiber.run();
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
	if (!options.silent) {
		console.log(cmd, args.join(' '));
	}
	var c = child_process.spawn(cmd, args);
	return createPromiseOnChildProcess(cmd, c);
}

exports.execJS = function(mod, args) {
	if (arguments.length > 2) {
		args = Array.prototype.slice.call(arguments, 1);
	}
	args = args ? Util.flattenArray(Util.toArray(args)) : [];
	var c = child_process.fork(mod, args, {
		silent: true
	});
	return createPromiseOnChildProcess(mod, c);
}

exports.makeSync = function(async) {
	return function() {
		return await(async.apply(this, arguments));
	}
}

exports.Semaphore = Semaphore;
exports.Lock = Lock;