Makescript v0.1.3
=================


INSTALLING
----------
* `git clone git://github.com/nbdd0121/make.js.git`
* `cd make.js`
* `npm install`

OR SIMPLY

* `npm install -g makescript`


USAGE
-----
1. Create your own makescript file
2. Execute `makejs`
3. Should work as expected

MAKESCRIPT
----------
This tool organizes libraries by modules.
Currently there are 4 modules:

basic 			|---
----------------|-------
log(TEXT)		|Display TEXT
chdir(PATH)     |Change working directory to PATH
cwd()			|Return current working directory
exit(CODE)		|Exit process with error code CODE
await(PROMISE)	|Wait until PROMISE finishes
sleep$(TIME)	|Create a promise which will resolve after TIME millseconds
sleep(TIME)		|Sleep for TIME millseconds
exec$(CMD, ARG) |Create a promise which will resolve or reject according to the result of executing CMD with argument ARG
exec(CMD, ARG)	|Execute CMD with argument ARG

file 				|---
--------------------|-------
exists(PATH)		|Determine whether PATH exists
parentDir(PATH)		|Get parent directory of PATH
isDir(PATH)			|Determine whether PATH is a directory
ls(PATH)			|List all files under PATH
recursiveList(PATH)	|List all files and files in subdirectory under PATH
rm(PATH, OPT)		|Remove files specified by PATH, using option specified in OPT (nothing, 'r', 'f' or ['r', 'f'])
rmdir(PATH)			|Remove directory PATH
mkdir(PATH, OPT)	|Make directory PATH using option OPT (nothing or 'p')

### make
#### target(TARGET, DEP, ACTIONS)
Create a rule that will make TARGET using dependency DEP.
TARGET will only be made if one of DEP needs making or
one of DEP is newer than TARGET. If made, ACTIONS will
performed.
> TARGET can be string, regexp, or function
>>	string means exact match<br/>
>>	regexp will match target if regexp.exec(target) returns trusy value<br/>
>>	function will match target if function(target) returns trusy value
>
> DEP can be string or function
>>	string means a specified dependency<br/>
>>	function will create a dependency list according to return value of function(target)
>
>ACTIONS are a list of function
>>	function(target, dependency) will be executed when target is judged is make-needed

#### phony(TARGET, DEP, ACTIONS)
Create a rule, while TARGET is not considered a file, but only a name of rule.
Phony targets will always be made.

#### makeTarget(TARGET)
Explicitly make TARGET.

#### asDefault(TARGET)
Set TARGET as the default target. TARGET will be made when no target is specified to make in the command line arguments

### file-helper
#### makeParentDirIfNotExist(PATHS)
Create all PATHS' parent directory if they did not exist

Of the 4 modules, `basic`, `make` and `file` are loaded by default.<br/>
When modules are loaded, its functions are added to the global object, so you can use them directly.<br/>
You can also access these functions in namespace, for example, `basic.exec` is the same as `exec`.<br/>
Loaded modules can be accessed by `loadedModules`.

To load a module explicitly, use `use('module_name')`.<br/>
For example, if you want to use module `file-helper`, write code `use('file-helper')`.


EXAMPLE MAKESCRIPT
------------------
```js
use('file-helper');
log(loadedModules); // Output will be ['basic', 'make', 'file', 'file-helper']
function linker(target, dep) {
	exec('gcc', '-o', target, dep);
}
function cc(target, dep) {
	exec('gcc', '-c', '-o', target, dep);
}
var OBJECTS = recursiveList('src').filter(function(name) {
	return /\.c$/.exec(name);
}).map(function(name) {
	return 'bin/' + name.replace(/\.(c|asm)$/, '.o');
});	// Powerful customed making using regular expression and JavaScript built-in functions
makeParentDirIfNotExist(OBJECTS);
target(/bin\/.*\.o$/, function(target) {
	return target.replace('bin/', 'src/').replace(/\.o$/, '.c');
}, cc);	// Regexp as target and function as dependency generator
target('output', OBJECTS, linker); // Basic kind of target
asDefault('output');
```


COMMAND LINE OPTIONS
--------------------
Short|Long                 |Description
-----|---------------------|-----------
-B   |--always-make        |Unconditionally make all targets
-C   |--directory=DIRECTORY|Use DIRECTORY as work directory
-d   |--debug              |Print debug information and will not reduce stack trace on error
-f   |--file=FILE          |Read FILE as a makescript
-h   |--help               |Print this message and exit
-j   |--jobs=N             |Allow N jobs at once; infinte jobs with argument 0
-s   |--silent             |Don't echo recipes
-S   |--no-stdout          |Do not show messages written to stdout
-v   |--verbose            |Print verbose messages for debugging
