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
    'test/**/*.js',
    'plugins/**/*.js',
    '!plugins/**/node_modules/**',
    './*.js'
  ], { base: './' })
    .pipe(gulpif(argv.nolintfix, eslint(), eslint({ fix: true })))
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

function buildCreative() {
  return gulp.src(['**/*'])
    .pipe(webpackStream(require('./webpack.creative.js')))
    .pipe(gulp.dest('build/creative'))
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
  var KarmaServer = require('karma').Server;
  var karmaConfMaker = require('./karma.conf.maker.js');
  ['watch', 'e2e', 'file', 'browserstack', 'notest'].forEach(opt => {
    options[opt] = options.hasOwnProperty(opt) ? options[opt] : argv[opt];
  })

  return function test(done) {
    if (options.notest) {
      done();
    } else if (options.e2e) {
      let wdioCmd = path.join(__dirname, 'node_modules/.bin/wdio');
      let wdioConf = path.join(__dirname, 'wdio.conf.js');
      let wdioOpts;

      if (options.file) {
        wdioOpts = [
          wdioConf,
          `--spec`,
          `${options.file}`
        ]
      } else {
        wdioOpts = [
          wdioConf
        ];
      }

      // run fake-server
      const fakeServer = spawn('node', ['./test/fake-server/index.js', `--port=${FAKE_SERVER_PORT}`]);
      fakeServer.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      fakeServer.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      execa(wdioCmd, wdioOpts, { stdio: 'inherit' })
        .then(stdout => {
          // kill fake server
          fakeServer.kill('SIGINT');
          done();
          process.exit(0);
        })
        .catch(err => {
          // kill fake server
          fakeServer.kill('SIGINT');
          done(new Error(`Tests failed with error: ${err}`));
          process.exit(1);
        });
    } else {
      var karmaConf = karmaConfMaker(false, options.browserstack, options.watch, options.file);

      var browserOverride = helpers.parseBrowserArgs(argv);
      if (browserOverride.length > 0) {
        karmaConf.browsers = browserOverride;
      }

      new KarmaServer(karmaConf, newKarmaCallback(done)).start();
    }
  }
}
const test = testTaskMaker();

function newKarmaCallback(done) {
  return function (exitCode) {
    if (exitCode) {
      done(new Error('Karma tests failed with exit code ' + exitCode));
      if (argv.browserstack) {
        process.exit(exitCode);
      }
    } else {
      done();
      if (argv.browserstack) {
        process.exit(exitCode);
      }
    }
  }
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

const watch = watchTaskMaker({alsoWatch: ['test/**/*.js'], task: () => gulp.series(clean, gulp.parallel(lint, 'build-bundle-dev', test, buildCreative))});
const watchFast = watchTaskMaker({livereload: false, task: () => gulp.parallel('build-bundle-dev', buildCreative)});

// START: OW Custom tasks

function getBundleName() {
  return argv.bundleName ? argv.bundleName : 'prebid.js';
}

function addPattern(patterns, match, replacement) {
  if (replacement) {
      patterns.push({
          match: match,
          replacement: replacement
      });
  }
}

function getOverrideNamespace(namespace, defaultName, returnValueInCaseMissingNamespace) {
  if (namespace) {
    return namespace === defaultName ? returnValueInCaseMissingNamespace : namespace;
  } else {
    return returnValueInCaseMissingNamespace;
  }
}

function getPatternsToReplace() {
  var isIdentityOnly = argv.isIdentityOnly || 0;
  var pbNamespace = argv.pbNamespace || '';
  var owNamespace = argv.owNamespace || '';
  var patterns = [];
  if (isIdentityOnly) {
      addPattern(patterns, /ihowpbjs|owpbjs/g, getOverrideNamespace(pbNamespace,  'ihowpbjs', 'ihowpbjs'));
      addPattern(patterns, /IHPWT/g, getOverrideNamespace(owNamespace, 'IHPWT', 'IHPWT'));
  } else {
      // Passing null as we don't want to replace the used value(i.e. PWT) with default value(i.e. PWT) as both are same,
      addPattern(patterns, /owpbjs/g, getOverrideNamespace(pbNamespace, 'owpbjs', null));
      addPattern(patterns, /PWT/g, getOverrideNamespace(owNamespace, 'PWT', null));
  }
  return patterns;
}

function getFooterContent() {
  var isIdentityOnly = argv.isIdentityOnly || 0;
  return isIdentityOnly 
    ? `\nif (typeof window.IHPWT === 'object' && typeof window.IHPWT.jsLoaded === 'function') {\n window.IHPWT.jsLoaded();\n}`
    : `\nif (typeof window.PWT === 'object' && typeof window.PWT.jsLoaded === 'function') {\n window.PWT.jsLoaded();\n}`;
}

gulp.task('append-footer', function () { 
  return gulp.src(['build/*/'+ getBundleName()])
  .pipe(footer(getFooterContent()))
  .pipe(gulp.dest('build/'));
});

gulp.task('update-namespace', async function () { 
  var patternsToReplace = getPatternsToReplace();
  console.log("Patterns to replace => ", patternsToReplace);
  if(patternsToReplace.length > 0){
    return gulp.src(['build/*/'+ getBundleName()])
    .pipe(replace(patternsToReplace[0].match, patternsToReplace[0].replacement))
    .pipe(replace(patternsToReplace[1].match, patternsToReplace[1].replacement))
    .pipe(gulp.dest('build/'));
  }
});

gulp.task('bundle-pwt-keys', function() {
  var usePBJSKeysEnabled = argv.usePBJSKeys || false;
  var pubAnalyticsAdapterEnabled = argv.pubAnalyticsAdapter || false;
  if(!usePBJSKeysEnabled && pubAnalyticsAdapterEnabled){
      console.log("We need to use PWT keys, so changing targeting keys in PrebidJS config");
      return gulp.src('build/*/'+ getBundleName(), { "allowEmpty": true })
          .pipe(replace(/"%%TG_KEYS%%"/g,'{"STATUS":"pwtbst","BIDDER":"pwtpid","AD_ID":"pwtsid","PRICE_BUCKET":"pwtecp","SIZE":"pwtsz","DEAL":"pwtdeal","DEAL_ID":"pwtdid","SOURCE":"","FORMAT":"pwtplt","UUID":"pwtuuid","CACHE_ID":"pwtcid","CACHE_HOST":"pwtcurl","ADOMAIN":"pwtadomain"}'))
          .pipe(gulp.dest('build/'));        
  } else {
      console.log("We need to use Prebid keys, so changing targeting keys in PrebidJS config");
      return gulp.src('build/*/'+ getBundleName(), { "allowEmpty": true })
          .pipe(replace(/"%%TG_KEYS%%"/g,'{"BIDDER":"hb_bidder","AD_ID":"hb_adid","PRICE_BUCKET":"hb_pb","SIZE":"hb_size","DEAL":"hb_deal","SOURCE":"hb_source","FORMAT":"hb_format","UUID":"hb_uuid","CACHE_ID":"hb_cache_id","CACHE_HOST":"hb_cache_host","ADOMAIN":"hb_adomain","ACAT":"hb_acat","CRID":"hb_crid","DSP":"hb_dsp"}'))
          .pipe(gulp.dest('build/'));
  }
});

gulp.task('bundle-native-keys', function() {
  var usePBJSKeysEnabled = argv.usePBJSKeys || false;
  if(usePBJSKeysEnabled) {
      console.log("We need to use Prebid keys for Native, so changing targeting keys in PrebidJS config");
      return gulp.src('build/*/'+ getBundleName(), { "allowEmpty": true })
      .pipe(replace(/"%%TG_NATIVE_KEYS%%"/g,'{"title":"hb_native_title","body":"hb_native_body","body2":"hb_native_body2","privacyLink":"hb_native_privacy","privacyIcon":"hb_native_privicon","sponsoredBy":"hb_native_brand","image":"hb_native_image","icon":"hb_native_icon","clickUrl":"hb_native_linkurl","displayUrl":"hb_native_displayurl","cta":"hb_native_cta","rating":"hb_native_rating","address":"hb_native_address","downloads":"hb_native_downloads","likes":"hb_native_likes","phone":"hb_native_phone","price":"hb_native_price","salePrice":"hb_native_saleprice","rendererUrl":"hb_renderer_url","adTemplate":"hb_adTemplate"}'))
      .pipe(gulp.dest('build/'));
  } else {
      console.log("We need to use PWT keys for Native, so changing targeting keys in PrebidJS config");
      return gulp.src('build/*/'+ getBundleName(), { "allowEmpty": true })
      .pipe(replace(/"%%TG_NATIVE_KEYS%%"/g,'{"title":"pwt_native_title","body":"pwt_native_body","body2":"pwt_native_body2","privacyLink":"pwt_native_privacy","sponsoredBy":"pwt_native_brand","image":"pwt_native_image","icon":"pwt_native_icon","clickUrl":"pwt_native_linkurl","displayUrl":"pwt_native_displayurl","cta":"pwt_native_cta","rating":"pwt_native_rating","address":"pwt_native_address","downloads":"pwt_native_downloads","likes":"pwt_native_likes","phone":"pwt_native_phone","price":"pwt_native_price","salePrice":"pwt_native_saleprice"}'))
      .pipe(gulp.dest('build/'));
  }
});

// Run below task to create owt.js for creative use in case of AMP
gulp.task('webpack-creative', gulp.series(clean, function() {
  var owWebpackConfig = require('./ow-webpack.config.js');
  webpackConfig.devtool = false;
  return gulp.src('src/owCreativeRenderer/index.js')
      .pipe(webpackStream(owWebpackConfig, webpack))
      .pipe(gulp.dest('build/dist'));
}));

gulp.task('bundle-creative', function () {

  console.log("Executing creative-build");
  return gulp.src(['./build/dist/*.js'])
      .pipe(concat(getBundleName()))
      .pipe(gulp.dest('build'));
});

gulp.task('ow-tasks', gulp.series('append-footer','update-namespace', 'bundle-pwt-keys', 'bundle-native-keys'));
gulp.task('ow-creative-renderer', gulp.series('webpack-creative','bundle-creative'));

// END: OW Custom tasks

// support tasks
gulp.task(lint);
gulp.task(watch);

gulp.task(clean);

gulp.task(escapePostbidConfig);

// gulp.task('build-bundle-dev', gulp.series(makeDevpackPkg, makeDevpackPkgForIh, gulpBundle.bind(null, true)));
gulp.task('build-bundle-dev', gulp.series(clean, makeDevpackPkg, gulpBundle.bind(null, true), 'ow-tasks'));

// gulp.task('build-bundle-prod', gulp.series(makeWebpackPkg, makeWebpackPkgForIh, gulpBundle.bind(null, false)));
gulp.task('build-bundle-prod', gulp.series(makeWebpackPkg, gulpBundle.bind(null, false), 'ow-tasks'));
gulp.task('build-creative', gulp.series(buildCreative, updateCreativeExample));
// public tasks (dependencies are needed for each task since they can be ran on their own)
gulp.task('test-only', test);
gulp.task('test', gulp.series(clean, lint, 'test-only'));

gulp.task('test-coverage', gulp.series(clean, testCoverage));
gulp.task(viewCoverage);

gulp.task('coveralls', gulp.series('test-coverage', coveralls));

gulp.task('build', gulp.series(clean, 'build-bundle-prod'));
gulp.task('build-postbid', gulp.series(escapePostbidConfig, buildPostbid));

gulp.task('serve', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, test)));
gulp.task('serve-fast', gulp.series(clean, gulp.parallel('build-bundle-dev', buildCreative, watchFast)));
gulp.task('serve-and-test', gulp.series(clean, gulp.parallel('build-bundle-dev', watchFast, testTaskMaker({watch: true}))));
gulp.task('serve-fake', gulp.series(clean, gulp.parallel('build-bundle-dev', watch), injectFakeServerEndpointDev, test, startFakeServer));

// gulp.task('default', gulp.series(clean, makeWebpackPkg, makeWebpackPkgForIh));
gulp.task('default', gulp.series(clean, makeWebpackPkg));

gulp.task('e2e-test', gulp.series(clean, setupE2e, gulp.parallel('build-bundle-prod', watch), injectFakeServerEndpoint, test));
// other tasks
gulp.task(bundleToStdout);
gulp.task('bundle', gulp.series(gulpBundle.bind(null, false), 'ow-tasks')); // used for just concatenating pre-built files with no build step

// build task for reviewers, runs test-coverage, serves, without watching
gulp.task(viewReview);
gulp.task('review-start', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, testCoverage), viewReview));

module.exports = nodeBundle;
/// /
