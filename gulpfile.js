/* eslint-disable no-console */
'use strict';

console.time('Loading Plugins in Prebid');

var argv = require('yargs').argv;
var gulp = require('gulp');
var concat = require('gulp-concat');
var connect = require('gulp-connect');
var replace = require('gulp-replace');
const path = require('path');
const execa = require('execa');
var gulpif = require('gulp-if');
var _ = require('lodash');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');
var webpackConfig = require('./webpack.conf.js');
var helpers = require('./gulpHelpers.js');
var header = require('gulp-header');
var gutil = require('gulp-util');
var fs = require('fs');
var footer = require('gulp-footer');
var sourcemaps = require('gulp-sourcemaps');
const wrap = require('gulp-wrap');
const rename = require('gulp-rename');

var prebid = require('./package.json');
var dateString = 'Updated : ' + (new Date()).toISOString().substring(0, 10);
var banner = '/* <%= prebid.name %> v<%= prebid.version %>\n' + dateString + '*/\n';
var port = 9999;
console.timeEnd('Loading Plugins in Prebid');
const FAKE_SERVER_HOST = argv.host ? argv.host : 'localhost';
const FAKE_SERVER_PORT = 4444;
const { spawn } = require('child_process');
prebid.profile = argv.profile;
// these modules must be explicitly listed in --modules to be included in the build, won't be part of "all" modules
var explicitModules = [
  'pre1api'
];

// all the following functions are task functions
function bundleToStdout() {
  nodeBundle().then(file => console.log(file));
}
bundleToStdout.displayName = 'bundle-to-stdout';

function clean() {
  var gulpClean = require('gulp-clean');
  return gulp.src(['build'], {
    read: false,
    allowEmpty: true
  })
    .pipe(gulpClean());
}

function requireNodeVersion(version) {
  return (done) => {
    const [major] = process.versions.node.split('.');

    if (major < version) {
      throw new Error(`This task requires Node v${version}`)
    }

    done();
  }
}

// Dependant task for building postbid. It escapes postbid-config file.
function escapePostbidConfig() {
  var jsEscape = require('gulp-js-escape');
  gulp.src('./integrationExamples/postbid/oas/postbid-config.js')
    .pipe(jsEscape())
    .pipe(gulp.dest('build/postbid/'));
};
escapePostbidConfig.displayName = 'escape-postbid-config';

function lint(done) {
  var eslint = require('gulp-eslint');

  if (argv.nolint) {
    return done();
  }
  const isFixed = function (file) {
    return file.eslint != null && file.eslint.fixed;
  }
  return gulp.src([
    'src/**/*.js',
    'modules/**/*.js',
    'libraries/**/*.js',
    'creative/**/*.js',
    'test/**/*.js',
    'plugins/**/*.js',
    '!plugins/**/node_modules/**',
    './*.js'
  ], { base: './' })
    .pipe(eslint({ fix: !argv.nolintfix, quiet: !(typeof argv.lintWarnings === 'boolean' ? argv.lintWarnings : true) }))
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError())
    .pipe(gulpif(isFixed, gulp.dest('./')));
};

// View the code coverage report in the browser.
function viewCoverage(done) {
  var connect = require('gulp-connect');
  var opens = require('opn');
  var coveragePort = 1999;
  var mylocalhost = (argv.host) ? argv.host : 'localhost';

  connect.server({
    port: coveragePort,
    root: 'build/coverage/lcov-report',
    livereload: false,
    debug: true
  });
  opens('http://' + mylocalhost + ':' + coveragePort);
  done();
};

viewCoverage.displayName = 'view-coverage';

// View the reviewer tools page
function viewReview(done) {
  var opens = require('opn');
  var mylocalhost = (argv.host) ? argv.host : 'localhost';
  var reviewUrl = 'http://' + mylocalhost + ':' + port + '/integrationExamples/reviewerTools/index.html'; // reuse the main port from 9999

  // console.log(`stdout: opening` + reviewUrl);

  opens(reviewUrl);
  done();
};

viewReview.displayName = 'view-review';

function makeModuleList(modules) {
  return modules.map(module => {
    return '"' + module + '"'
  });
}

function makeDevpackPkg() {
  var connect = require('gulp-connect');
  var cloned = _.cloneDeep(webpackConfig);
  Object.assign(cloned, {
    devtool: 'source-map',
    mode: 'development'
  });

  const babelConfig = require('./babelConfig.js')({
    disableFeatures: helpers.getDisabledFeatures(),
    prebidDistUrlBase: argv.distUrlBase || '/build/dev/'
  });

  // update babel config to set local dist url
  cloned.module.rules
    .flatMap((rule) => rule.use)
    .filter((use) => use.loader === 'babel-loader')
    .forEach((use) => use.options = Object.assign({}, use.options, babelConfig));

  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources();
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpackStream(cloned, webpack))
    .pipe(replace(/('|")v\$prebid\.modulesList\$('|")/g, makeModuleList(externalModules)))
    .pipe(gulp.dest('build/dev'))
    .pipe(connect.reload());
}

function makeWebpackPkg() {
  var cloned = _.cloneDeep(webpackConfig);
  if (!argv.sourceMaps) {
    delete cloned.devtool;
  }

  var externalModules = helpers.getArgModules();

  const analyticsSources = helpers.getAnalyticsSources();
  const moduleSources = helpers.getModulePaths(externalModules);

  return gulp.src([].concat(moduleSources, analyticsSources, 'src/prebid.js'))
    .pipe(helpers.nameModules(externalModules))
    .pipe(webpackStream(cloned, webpack))
    .pipe(replace(/('|")v\$prebid\.modulesList\$('|")/g, makeModuleList(externalModules)))
    .pipe(gulpif(file => file.basename === 'prebid-core.js', header(banner, { prebid: prebid })))
    .pipe(gulp.dest('build/dist'));
}

function buildCreative(mode = 'production') {
  const opts = {mode};
  if (mode === 'development') {
    opts.devtool = 'inline-source-map'
  }
  return function() {
    return gulp.src(['**/*'])
      .pipe(webpackStream(Object.assign(require('./webpack.creative.js'), opts)))
      .pipe(gulp.dest('build/creative'))
  }
}

function updateCreativeRenderers() {
  return gulp.src(['build/creative/renderers/**/*'])
    .pipe(wrap('// this file is autogenerated, see creative/README.md\nexport const RENDERER = <%= JSON.stringify(contents.toString()) %>'))
    .pipe(rename(function (path) {
      return {
        dirname: `creative-renderer-${path.basename}`,
        basename: 'renderer',
        extname: '.js'
      }
    }))
    .pipe(gulp.dest('libraries'))
}

function updateCreativeExample(cb) {
  const CREATIVE_EXAMPLE = 'integrationExamples/gpt/x-domain/creative.html';
  const root = require('node-html-parser').parse(fs.readFileSync(CREATIVE_EXAMPLE));
  root.querySelectorAll('script')[0].textContent = fs.readFileSync('build/creative/creative.js')
  fs.writeFileSync(CREATIVE_EXAMPLE, root.toString())
  cb();
}

function getModulesListToAddInBanner(modules) {
  if (!modules || modules.length === helpers.getModuleNames().length) {
    return 'All available modules for this version.'
  } else {
    return modules.join(', ')
  }
}

function gulpBundle(dev) {
  return bundle(dev).pipe(gulp.dest('build/' + (dev ? 'dev' : 'dist')));
  // return bundleForIh(dev).pipe(gulp.dest('build/' + (dev ? 'dev' : 'dist')));
}

function nodeBundle(modules) {
  var through = require('through2');
  return new Promise((resolve, reject) => {
    bundle(false, modules)
      .on('error', (err) => {
        reject(err);
      })
      .pipe(through.obj(function (file, enc, done) {
        resolve(file.contents.toString(enc));
        done();
      }));
  });
}

function bundle(dev, moduleArr) {
  var modules = moduleArr || helpers.getArgModules();
  var allModules = helpers.getModuleNames(modules);
  if (modules.length === 0) {
    modules = allModules.filter(module => explicitModules.indexOf(module) === -1);
  } else {
    var diff = _.difference(modules, allModules);
    if (diff.length !== 0) {
      throw new gutil.PluginError({
        plugin: 'bundle',
        message: 'invalid modules: ' + diff.join(', ')
      });
    }
  }
  const coreFile = helpers.getBuiltPrebidCoreFile(dev);
  const moduleFiles = helpers.getBuiltModules(dev, modules);
  const depGraph = require(helpers.getBuiltPath(dev, 'dependencies.json'));
  const dependencies = new Set();
  [coreFile].concat(moduleFiles).map(name => path.basename(name)).forEach((file) => {
    (depGraph[file] || []).forEach((dep) => dependencies.add(helpers.getBuiltPath(dev, dep)));
  });

  const entries = [coreFile].concat(Array.from(dependencies), moduleFiles);

  var outputFileName = argv.bundleName ? argv.bundleName : 'prebid.js';

  // change output filename if argument --tag given
  if (argv.tag && argv.tag.length) {
    outputFileName = outputFileName.replace(/\.js$/, `.${argv.tag}.js`);
  }

  // gutil.log('Concatenating files:\n', entries);
  // gutil.log('Appending ' + prebid.globalVarName + '.processQueue();');
  // gutil.log('Generating bundle:', outputFileName);

  var globalVarName = prebid.globalVarName;
  return gulp.src(entries, { allowEmpty: true })
  // Need to uodate the "Modules: ..." section in comment with the current modules list
    .pipe(replace(/(Modules: )(.*?)(\*\/)/, ('$1' + getModulesListToAddInBanner(helpers.getArgModules()) + ' $3')))
    .pipe(gulpif(dev, sourcemaps.init({ loadMaps: true })))
    .pipe(concat(outputFileName))
    .pipe(gulpif(!argv.manualEnable, footer('\n<%= global %>.processQueue();', {
      global: globalVarName
    }
    )))
    .pipe(gulpif(dev, sourcemaps.write('.')));
}

// Run the unit tests.
//
// By default, this runs in headless chrome.
//
// If --watch is given, the task will re-run unit tests whenever the source code changes
// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
// If --browserstack is given, it will run the full suite of currently supported browsers.
// If --browsers is given, browsers can be chosen explicitly. e.g. --browsers=chrome,firefox,ie9
// If --notest is given, it will immediately skip the test task (useful for developing changes with `gulp serve --notest`)

function testTaskMaker(options = {}) {
  ['watch', 'file', 'browserstack', 'notest'].forEach(opt => {
    options[opt] = options.hasOwnProperty(opt) ? options[opt] : argv[opt];
  })
  options.disableFeatures = options.disableFeatures || helpers.getDisabledFeatures();
  return function test(done) {
    if (options.notest) {
      done();
    } else {
      runKarma(options, done)
    }
  }
}

const test = testTaskMaker();

function e2eTestTaskMaker() {
  return function test(done) {
    const integ = startIntegServer();
    startLocalServer();
    runWebdriver({})
      .then(stdout => {
        // kill fake server
        integ.kill('SIGINT');
        done();
        process.exit(0);
      })
      .catch(err => {
        // kill fake server
        integ.kill('SIGINT');
        done(new Error(`Tests failed with error: ${err}`));
        process.exit(1);
      });
  }
}

function runWebdriver({file}) {
  process.env.TEST_SERVER_HOST = argv.host || 'localhost';

  let local = argv.local || false;

  let wdioConfFile = local === true ? 'wdio.local.conf.js' : 'wdio.conf.js';
  let wdioCmd = path.join(__dirname, 'node_modules/.bin/wdio');
  let wdioConf = path.join(__dirname, wdioConfFile);
  let wdioOpts;

  if (file) {
    wdioOpts = [
      wdioConf,
      `--spec`,
      `${file}`
    ]
  } else {
    wdioOpts = [
      wdioConf
    ];
  }
  return execa(wdioCmd, wdioOpts, { stdio: 'inherit' });
}

function runKarma(options, done) {
  // the karma server appears to leak memory; starting it multiple times in a row will run out of heap
  // here we run it in a separate process to bypass the problem
  options = Object.assign({browsers: helpers.parseBrowserArgs(argv)}, options)
  const child = fork('./karmaRunner.js');
  child.on('exit', (exitCode) => {
    if (exitCode) {
      done(new Error('Karma tests failed with exit code ' + exitCode));
    } else {
      done();
    }
  })
  child.send(options);
}

// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
function testCoverage(done) {
  var KarmaServer = require('karma').Server;
  var karmaConfMaker = require('./karma.conf.maker.js');
  new KarmaServer(karmaConfMaker(true, false, false, argv.file), newKarmaCallback(done)).start();
}

function coveralls() { // 2nd arg is a dependency: 'test' must be finished
  var shell = require('gulp-shell');
  // first send results of istanbul's test coverage to coveralls.io.
  return gulp.src('gulpfile.js', { read: false }) // You have to give it a file, but you don't
    // have to read it.
    .pipe(shell('cat build/coverage/lcov.info | node_modules/coveralls/bin/coveralls.js'));
}

// This task creates postbid.js. Postbid setup is different from prebid.js
// More info can be found here http://prebid.org/overview/what-is-post-bid.html

function buildPostbid() {
  var fs = require('fs');
  var fileContent = fs.readFileSync('./build/postbid/postbid-config.js', 'utf8');

  return gulp.src('./integrationExamples/postbid/oas/postbid.js')
    .pipe(replace('\[%%postbid%%\]', fileContent))
    .pipe(gulp.dest('build/postbid/'));
}

function setupE2e(done) {
  if (!argv.host) {
    throw new gutil.PluginError({
      plugin: 'E2E test',
      message: gutil.colors.red('Host should be defined e.g. ap.localhost, anlocalhost. localhost cannot be used as safari browserstack is not able to connect to localhost')
    });
  }
  process.env.TEST_SERVER_HOST = argv.host;
  if (argv.https) {
    process.env.TEST_SERVER_PROTOCOL = argv.https;
  }
  argv.e2e = true;
  done();
}

function injectFakeServerEndpoint() {
  return gulp.src(['build/dist/*.js'])
    .pipe(replace('https://ib.adnxs.com/ut/v3/prebid', `http://${FAKE_SERVER_HOST}:${FAKE_SERVER_PORT}`))
    .pipe(gulp.dest('build/dist'));
}

function injectFakeServerEndpointDev() {
  return gulp.src(['build/dev/*.js'])
    .pipe(replace('https://ib.adnxs.com/ut/v3/prebid', `http://${FAKE_SERVER_HOST}:${FAKE_SERVER_PORT}`))
    .pipe(gulp.dest('build/dev'));
}

function startFakeServer() {
  const fakeServer = spawn('node', ['./test/fake-server/index.js', `--port=${FAKE_SERVER_PORT}`]);
  fakeServer.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  fakeServer.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });
}

// Watch Task with Live Reload
function watchTaskMaker(options = {}) {
  if (options.livereload == null) {
    options.livereload = true;
  }
  options.alsoWatch = options.alsoWatch || [];

  return function watch(done) {
    var mainWatcher = gulp.watch([
      'src/**/*.js',
      'libraries/**/*.js',
      '!libraries/creative-renderer-*/**/*.js',
      'creative/**/*.js',
      'modules/**/*.js',
    ].concat(options.alsoWatch));

    connect.server({
      https: argv.https,
      port: port,
      host: FAKE_SERVER_HOST,
      root: './',
      livereload: options.livereload
    });

    mainWatcher.on('all', options.task());
    done();
  }
}

const watch = watchTaskMaker({alsoWatch: ['test/**/*.js'], task: () => gulp.series(clean, gulp.parallel(lint, 'build-bundle-dev', test))});
const watchFast = watchTaskMaker({livereload: false, task: () => gulp.series('build-bundle-dev')});

// support tasks
gulp.task(lint);
gulp.task(watch);

gulp.task(clean);

gulp.task(escapePostbidConfig);

gulp.task('build-creative-dev', gulp.series(buildCreative(argv.creativeDev ? 'development' : 'production'), updateCreativeRenderers));
gulp.task('build-creative-prod', gulp.series(buildCreative(), updateCreativeRenderers));

gulp.task('build-bundle-dev', gulp.series('build-creative-dev', makeDevpackPkg, gulpBundle.bind(null, true)));
gulp.task('build-bundle-prod', gulp.series('build-creative-prod', makeWebpackPkg(), gulpBundle.bind(null, false)));
// build-bundle-verbose - prod bundle except names and comments are preserved. Use this to see the effects
// of dead code elimination.
gulp.task('build-bundle-verbose', gulp.series(makeWebpackPkg({
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          mangle: false,
          format: {
            comments: 'all'
          }
        },
        extractComments: false,
      }),
    ],
  }
}), gulpBundle.bind(null, false)));

// public tasks (dependencies are needed for each task since they can be ran on their own)
gulp.task('test-only', test);
gulp.task('test-all-features-disabled', testTaskMaker({disableFeatures: require('./features.json'), oneBrowser: 'chrome', watch: false}));
gulp.task('test', gulp.series(clean, lint, 'test-all-features-disabled', 'test-only'));

gulp.task('test-coverage', gulp.series(clean, testCoverage));
gulp.task(viewCoverage);

gulp.task('coveralls', gulp.series('test-coverage', coveralls));

gulp.task('build', gulp.series(clean, 'build-bundle-prod', updateCreativeExample));
gulp.task('build-postbid', gulp.series(escapePostbidConfig, buildPostbid));

gulp.task('serve', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, test)));
gulp.task('serve-fast', gulp.series(clean, gulp.parallel('build-bundle-dev', watchFast)));
gulp.task('serve-prod', gulp.series(clean, gulp.parallel('build-bundle-prod', startLocalServer)));
gulp.task('serve-and-test', gulp.series(clean, gulp.parallel('build-bundle-dev', watchFast, testTaskMaker({watch: true}))));
gulp.task('serve-fake', gulp.series(clean, gulp.parallel('build-bundle-dev', watch), injectFakeServerEndpointDev, test, startFakeServer));

// gulp.task('default', gulp.series(clean, makeWebpackPkg, makeWebpackPkgForIh));
gulp.task('default', gulp.series(clean, makeWebpackPkg));

gulp.task('e2e-test-only', gulp.series(requireNodeVersion(16), () => runWebdriver({file: argv.file})));
gulp.task('e2e-test', gulp.series(requireNodeVersion(16), clean, 'build-bundle-prod', e2eTestTaskMaker()));

// other tasks
gulp.task(bundleToStdout);
gulp.task('bundle', gulpBundle.bind(null, false)); // used for just concatenating pre-built files with no build step

// build task for reviewers, runs test-coverage, serves, without watching
gulp.task(viewReview);
gulp.task('review-start', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, testCoverage), viewReview));

module.exports = nodeBundle;
/// /
