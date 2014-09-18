var Fiber = require("fibers");
var child_process = require('child_process');

var syncLib = {
  run: function run(func) {
    var fiber = Fiber.current;
    var ret;
    func(function(r) {
      ret = r;
      fiber.run();
    });
    Fiber.yield();
    return ret;
  },
  exec: function exec(cmd, args, options) {
    if (!options) options = {};
    if (!args) {
      return this.run(function(callback) {
        child_process.exec(cmd, function(err, stdout, stderr) {
          if (!options.quiet) {
            process.stderr.write(stderr);
            process.stderr.write(stdout);
          }
          callback({
            err: err ? err.code : 0,
            stdout: stdout,
            stderr: stderr
          });
        });
      });
    }
    return this.run(function(callback) {
      var c = child_process.spawn(cmd, args);
      var stdout = "";
      var stderr = "";
      c.stdout.on('data', function(data) {
        if (!options.quiet) {
          process.stdout.write(data);
        }
        stdout += data;
      });
      c.stderr.on('data', function(data) {
        if (!options.quiet) {
          process.stderr.write(data);
        }
        stdout += data;
      });
      c.on('close', function(code) {
        callback({
          err: code,
          stdout: stdout,
          stderr: stderr
        });
      });
    });
  }
};

module.exports = function(callback) {
  Fiber(function() {
    callback(syncLib);
  }).run();
}