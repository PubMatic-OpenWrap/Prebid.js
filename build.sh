#! /usr/bin/env node
console.time("--------- STARTED");
console.log("running from shell script");
var shell = require('shelljs');
var argv = require('yargs').argv;

var platform = argv.platform || "display";
var bundleName = argv.bundleName || "prebid.js";
var gulpTaskName = "";

console.log("ARGV ==>", argv);

if (platform == "amp") {
		console.log("inside creative");
		console.time("Cleaning Gulp");
		shell.exec("gulp clean");
		console.timeEnd("Cleaning Gulp");
		if (shell.exec("gulp ow-creative-renderer --bundleName=" + bundleName).code !== 0) {
			shell.echo('Error: OW creative renderer build task failed');
			shell.exit(1);
		}
} else {
	gulpTaskName = `--modules=modules.json --isIdentityOnly=${argv.isIdentityOnly} --bundleName=${argv.bundleName}`;
	if(argv.pbNamespace) gulpTaskName += ` --pbNamespace=${argv.pbNamespace}`; 
	if(argv.owNamespace) gulpTaskName += ` --owNamespace=${argv.owNamespace}`;
	if(argv.usePBJSKeys) gulpTaskName += ` --usePBJSKeys=${argv.usePBJSKeys}`;
	if(argv.pubAnalyticsAdapter) gulpTaskName += ` --pubAnalyticsAdapter=${argv.pubAnalyticsAdapter}`; 

	if (argv.mode){
		switch (argv.mode) {
		case "bundle" :
			console.log("Executing build");
			gulpTaskName = `bundle ${gulpTaskName}`;
			break;
		case "build-bundle-dev" :
			console.log("Executing build");
			gulpTaskName = `build-bundle-dev ${gulpTaskName}`;
			break;
		default:
			console.log("No mode supplied, Too few arguments");
			shell.exit(1);
			break;
		}
	}

	console.time("Executing Prebid Build");
	if(shell.exec("time gulp " + gulpTaskName).code !== 0) {
		shell.echo('Error: buidlinng of project failed');
			shell.exit(1);
	}
	console.timeEnd("Executing Prebid Build");
}
console.timeEnd("--------- STARTED");
