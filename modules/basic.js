var Async = require('../Async');

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