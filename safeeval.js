exports = function() {
  return eval(arguments[0]);
}

module.exports = (function() {
  var eval = exports;
  var evalMatch = new RegExp("eval at [^(]* \\([^(]*safeeval.js:\\d*:\\d*\\)");

  function reduceStack(e, name) {
    var stack = e.stack.split("\n");
    for (var i = 0; i < stack.length; i++) {
      var s = stack[i];
      if (s.startsWith("    ")) {
        if (evalMatch.exec(s)) {
          s = s.replace(evalMatch, "")
            .replace(" ()", "")
            .replace("(, ", "(")
            .replace("<anonymous>:", name + ":");
          stack[i] = s;
        } else {
          stack.splice(i, 1);
          i--;
        }
      }
    }
    stack[i - 1] = stack[i - 1].replace(/Function\.eval \((.*)\)/, "$1");
    e.stack = stack.join("\n");
  }

  function safeEval(f, details) {
    var func = eval(f);
    return function() {
      try {
        func.apply(func, arguments);
      } catch (e) {
        if (details && details.noStackReduce) throw e;
        reduceStack(e, (details && details.name) || "<anonymous>");
        throw e;
      }
    };
  };

  safeEval.reduceStack = reduceStack;
  return safeEval;
})();