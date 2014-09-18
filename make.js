#!/usr/local/bin/node

var fs = require('fs');
var safeEval = require("./safeeval.js");

String.prototype.startsWith = function startsWith(str) {
  return this.indexOf(str) == 0;
}

String.prototype.endsWith = function endsWith(str) {
  return this.lastIndexOf(str) + str.length == this.length;
}

String.prototype.contains = function contains(str) {
  return this.indexOf(str) != -1;
}

var extensionMatch = /\.[^\/]*$/;
var filenameMatch = /[^\/]*$/;

String.prototype.extension = function extension(ext) {
  if (arguments.length == 0) {
    return extensionMatch.exec(this);
  } else {
    return this.replace(extensionMatch, ext);
  }
}

String.prototype.filename = function filename(name) {
  if (arguments.length == 0) {
    return filenameMatch.exec(this);
  } else {
    return this.replace(filenameMatch, ext);
  }
}

Array.prototype.contains = function contains(str) {
  return this.indexOf(str) != -1;
};

Array.toArray = function toArray(arrlike, index) {
  return Array.prototype.slice.call(arrlike, index);
}

function convertToArray(obj) {
  if (obj == null) {
    return [];
  } else if (obj instanceof Array) {
    return obj;
  } else {
    return [obj];
  }
}

function escapeShell(cmd, strict) {
  if (strict || cmd.contains("'"))
    return '\'' + cmd.replace(/\'/g, "'\\''") + '\'';
  else
    return cmd;
}

function assembleShellCommand(cmd, args) {
  if (args)
    return cmd + " " + args.map(function(a) {
      return escapeShell(a);
    }).join(" ");
  else
    return cmd;
}

require("./sync.js")(function(sync) {
  function errConvertion(e) {
    if (e.code == "ENOENT") {
      return e.path + ": No such file or directory";
    } else if (e.code == "ENOTDIR") {
      return e.path + ": Not a directory";
    } else if (e.code == "EXEC") {
      return "[" + e.target + "] Error Code " + e.errCode;
    } else {
      return e;
    }
  }

  function logError(err) {
    if (!(err instanceof Error)) {
      console.error("make.js: " + err);
    } else {
      console.error(err.stack);
    }
  }

  var targetMap = {

  };

  var targetRegexs = [];
  var fileMap = {};

  var makeInterface = {
    $true: function $true() {
      return true;
    },
    $false: function $false() {
      return false;
    },
    $exec: function $exec(cmd, options) {
      return function(details) {
        makeInterface.exec(cmd, options);
      }
    },
    $depExist: function $depExist(target, details) {
      var dep = getDependence(target, details);
      for (var i = 0; i < dep.length; i++) {
        if (!makeInterface.exists(dep[i])) return false;
      }
      return true
    },
    $replace: function $replace(old, n) {
      return function(target) {
        return target.replace(old, n);
      };
    },
    $extension: function $extension(n) {
      return function(target) {
        return target.extension(n);
      }
    },
    $make: function $make(dir, options) {
      if (!options) options = [];
      return makeInterface.$(makeInterface.make, dir, options);
    },
    $: function $(func) {
      var args = Array.toArray(arguments, 1);
      return function() {
        func.apply(func, args.concat(Array.toArray(arguments)));
      }
    },

    print: function print(arg) {
      process.stdout.write(String(arg));
    },
    println: function println(arg) {
      if (arguments.length == 0) {
        process.stdout.write("\n");
      } else {
        this.print(arg);
        process.stdout.write("\n");
      }
    },

    exec: function exec(cmd, args, options) {
      if (!options) options = {};
      if (!options.quiet) {
        console.log(assembleShellCommand(cmd, args));
      }
      if (options.newWindow) {
        var path = assembleShellCommand(cmd, args);
        cmd = 'gnome-terminal';
        args = [
          '-t', 'make.js[' + path + ']',
          '-e', 'bash -c \'' + escapeShell(path, true).slice(1, -1) +
          ';read -n 1 -p "Press any key to continue..."\''
        ];
      }
      var ret = sync.exec(cmd, args, {
        quiet: options.quiet
      });
      if (ret.err) {
        throw {
          code: "EXEC",
          errCode: ret.err,
          message: ret.stderr
        };
      }
    },


    target: function target(target, action, details) {
      action = convertToArray(action);
      if (details == null) details = {};
      details.dep = [];
      var make = [];
      for (var i = 0; i < action.length; i++) {
        if (action[i] instanceof Function) {
          make.push(action[i]);
        } else {
          details.dep.push(action[i]);
        }
      }
      if (make.length == 1) {
        details.make = make[0];
      } else if (make.length > 1) {
        details.make = function(details) {
          for (var i = 0; i < make.length; i++) {
            make[i](details);
          }
        }
      }
      /*if(target instanceof RegExp){
        targetRegex.push({regex:target, details:details});
      }else{*/
      targetMap["-" + target] = details;
      if (details.phony) {
        fileMap["-" + target] = {
          lastModify: 0
        };
      }
      //}
    },


    targetRegex: function targetRegex(target, valid, dep, action, details) {
      if (details == null) details = {};
      details.dep = convertToArray(dep);
      details.validator = valid;
      var make = convertToArray(action);
      if (make.length == 1) {
        details.make = make[0];
      } else if (make.length > 1) {
        details.make = function(details) {
          for (var i = 0; i < make.length; i++) {
            make[i](details);
          }
        }
      }
      targetRegexs.push({
        regex: target,
        details: details
      });
    },

    join: function join(arr) {
      if (arr instanceof Array)
        return arr.join(" ");
      return arr;
    },

    setDefault: function setDefault(def) {
      makeInterface.phony("default", def);
    },
    phony: function phony(target, action, details) {
      if (!details) details = {};
      details.phony = true;
      makeInterface.target(target, action, details);
    },

    exists: function exist(path) {
      return fs.existsSync(path);
    },
    parentDir: function parentDir(path) {
      return path.substr(0, path.lastIndexOf("/"));
    },
    mkdir: function mkdir(path) {
      fs.mkdirSync(path);
    },
    make: function make(dir, options) {
      if (!options) options = [];
      console.log("[make.js] enter " + dir);
      exec("make.js", ["-C", dir].concat(options));
      console.log("[make.js] exit " + dir);
    },
    mkdirIfNotExist: function mkdirIfNotExist(dir) {
      if (!makeInterface.exists(dir)) {
        makeInterface.mkdir(dir);
      }
    },
    ls: function ls(dir) {
      return fs.readdirSync(dir);
    },
    recursiveList: function recursiveList(dir) {
      var ret = [];

      function list(d) {
        makeInterface.ls(dir + "/" + d).forEach(function(f) {
          f = d + f;
          if (makeInterface.isDir(dir + "/" + f)) {
            ret.concat(list(f + "/"));
          } else {
            ret.push(f);
          }
        });
      }
      list("");
      return ret;
    },

    include: function include(path) {
      return fs.readFileSync(path).toString();
    },

    isDir: function isDir(path) {
      return fs.statSync(path).isDirectory();
    }
  };

  makeInterface.rm = require("./rm.js");

  function getDependence(target, details) {
    var ret = [];
    details.dep.forEach(function(item) {
      if (item instanceof Function) {
        ret = ret.concat(item(target));
      } else {
        ret.push(item);
      }
    });
    return ret;
  }

  function getMakeDetail(target) {
    if (targetMap["-" + target]) {
      return targetMap["-" + target];
    } else {
      for (var i = 0; i < targetRegexs.length; i++) {
        var tuple = targetRegexs[i];
        if (tuple.regex.exec(target) != null) {
          if (tuple.details.validator(target, tuple.details)) {
            return tuple.details;
          }
        }
      }
      return null;
    }
  }

  function getLastModification(target) {
    try {
      var stat = fs.statSync(target);
      if (stat.isDirectory()) {
        return fs.readdirSync(target).map(function(f) {
          return getLastModification(target + "/" + f);
        }).reduce(function(maxValue, currentVal) {
          return Math.max(maxValue, currentVal);
        }, Number.MIN_VALUE);
      } else {
        return stat.mtime.getTime();
      }
    } catch (e) {
      return 0;
    }
  }

  function ensureFileMapEntry(target) {
    if (fileMap["-" + target]) return fileMap["-" + target];
    var d = {

    };
    fileMap["-" + target] = d;
    d.lastModify = getLastModification(target);
    return d;
  }

  var executed = false;

  function make(target, lastModify) {
    var targetEntry = ensureFileMapEntry(target);
    var detail = getMakeDetail(target);
    if (detail == null) {
      if (targetEntry.lastModify == 0) {
        throw "No rule can create target " + target;
      } else {
        return targetEntry.lastModify > lastModify;
      }
    }
    var needMake = false;
    var dep = getDependence(target, detail);
    dep.forEach(function(dep) {
      var depEntry = ensureFileMapEntry(dep);
      if (make(dep, targetEntry.lastModify)) {
        needMake = true;
      }
    });
    if (needMake || detail.phony) {
      if (detail.make) {
        try {
          executed = true;
          detail.make(target, dep, detail);
        } catch (e) {
          if (e instanceof Error) {
            //safeEval.reduceStack(e, "makescript");
          }
          if (!e.target) e.target = target;
          throw errConvertion(e);
        }
        return true;
      }
    }

    return needMake || targetEntry.lastModify > lastModify;

  }

  function runScript(argv) {
    try {
      var data = fs.readFileSync("makescript", "utf-8");
    } catch (e) {
      if (e.code == "ENOENT") {
        throw "Cannot find makescript";
      } else {
        throw errConvertion(e);
      }
      return;
    }
    try {
      var func = safeEval("(function(global, __make){with(global){" +
        data +
        "}})", {
          name: "makescript",
          noStackReduce: true
        });
    } catch (e) {
      logError("Syntax Exception");
      return;
    }
    global.__proto__ = makeInterface;
    func(makeInterface);
    if (argv.length == 0) {
      executed = false;
      make("default");
      if (!executed) {
        console.log(targetMap["-default"].dep[0] + " is up to date");
      }
    } else {
      for (var i = 0; i < argv.length; i++) {
        executed = false;
        make(argv[i]);
        if (!executed) {
          console.log(argv[i] + " is up to date");
        }
      }
    }
  }

  function parseOptions(options) {
    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      switch (o.cmd) {
        case "-C":
          {
            try {
              process.chdir(o.arg);
            } catch (e) {
              e.path = o.arg;
              throw errConvertion(e);
            }
            break;
          }
      }
    }
  }

  (function() {
    var argv = process.argv.slice(2);
    try {
      var options = require("./getopt.js")(argv, "C:");
      parseOptions(options);
      runScript(argv);
    } catch (e) {
      logError(e);
      process.exit(1);
    }
  })();
});