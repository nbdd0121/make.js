var vm = require('vm');

exports.evaluate = function(script, filename, globalObject) {
	var context = vm.createContext(globalObject);
	return vm.runInContext(script, context, {
		filename: filename,
		displayErrors: false
	});
}

exports.reduceStackTrace = function(stack, filename) {
	return stack.split('\n').filter(function(content, index) {
		return content.indexOf(filename) !== -1 || index === 0;
	}).join('\n');
}