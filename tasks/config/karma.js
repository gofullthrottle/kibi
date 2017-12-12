import { times } from 'lodash';
import { resolve, dirname } from 'path';

// kibi: imports
import serverConfig from '../../test/server_config';
const TOTAL_CI_SHARDS = 20; // kibi: bumped to 20 shards to minimize flappy failures

const ROOT = dirname(require.resolve('../../package.json'));

module.exports = function (grunt) {
  const config = {
    options: {
      // base path that will be used to resolve all patterns (eg. files, exclude)
      basePath: '',

      captureTimeout: 30000,
      browserNoActivityTimeout: 120000,
      frameworks: ['mocha'],
      port: serverConfig.servers.karma.port, // kibi: make karma port configurable
      colors: true,
      logLevel: grunt.option('debug') || grunt.option('verbose') ? 'DEBUG' : 'INFO',
      autoWatch: false,
      browsers: [
        'BrowserWithDebuggingEnable'
      ],

      customLaunchers: {
        BrowserWithDebuggingEnable: {
          base: '<%= karmaBrowser %>',
          flags: [ '--remote-debugging-port=9333' ]
        }
      },

      // available reporters: https://npmjs.org/browse/keyword/karma-reporter
      reporters: process.env.CI ? ['dots', 'junit'] : ['progress'],

      junitReporter: {
        outputFile: resolve(ROOT, 'target/junit/karma.xml'),
        useBrowserName: false,
        nameFormatter: (browser, result) => [
          ...result.suite,
          result.description
        ].join(' '),
        classNameFormatter: (browser, result) => {
          const rootSuite = result.suite[0] || result.description;
          return `Browser Unit Tests.${rootSuite.replace(/\./g, '·')}`;
        }
      },

      // list of files / patterns to load in the browser
      files: [
        `http://localhost:${serverConfig.servers.testserver.port}/bundles/commons.bundle.js`, // kibi: make port configurable
        `http://localhost:${serverConfig.servers.testserver.port}/bundles/tests.bundle.js`, // kibi: make port configurable
        `http://localhost:${serverConfig.servers.testserver.port}/bundles/commons.style.css`, // kibi: make port configurable
        `http://localhost:${serverConfig.servers.testserver.port}/bundles/tests.style.css` // kibi: make port configurable
      ],

      proxies: {
        '/tests/': `http://localhost:${serverConfig.servers.testserver.port}/tests/`, // kibi: make port configurable
        '/bundles/': `http://localhost:${serverConfig.servers.testserver.port}/bundles/` // kibi: make port configurable
      },

      client: {
        mocha: {
          reporter: 'html', // change Karma's debug.html to the mocha web reporter
          timeout: 10000,
          slow: 5000
        }
      }
    },

    dev: { singleRun: false },
    unit: { singleRun: true },
    coverage: {
      singleRun: true,
      reporters: [
        'coverage',
        'progress'
      ],
      coverageReporter: {
        dir: 'coverage/browser',
        reporters: [
          {
            type: 'html',
            subdir: 'html'
          },
          {
            type: 'cobertura',
            subdir: './',
            file: 'cobertura.xml'
          },
          {
            type: 'json',
            subdir: './',
            file: 'coverage.json'
          },
          {
            type: 'text-summary'
          }
        ]
      }
    },
  };

  /**
   *  ------------------------------------------------------------
   *  CI sharding
   *  ------------------------------------------------------------
   *
   *  Every test retains nearly all of the memory it causes to be allocated,
   *  which has started to kill the test browser as the size of the test suite
   *  increases. This is a deep-rooted problem that will take some serious
   *  work to fix.
   *
   *  CI sharding is a short-term solution that splits the top-level describe
   *  calls into different "shards" and instructs karma to only run one shard
   *  at a time, reloading the browser in between each shard and forcing the
   *  memory from the previous shard to be released.
   *
   *  ## how
   *
   *  Rather than modify the bundling process to produce multiple testing
   *  bundles, top-level describe calls are sharded by their first argument,
   *  the suite name.
   *
   *  The number of shards to create is controlled with the TOTAL_CI_SHARDS
   *  constant defined at the top of this file.
   *
   *  ## controlling sharding
   *
   *  To control sharding in a specific karma configuration, the total number
   *  of shards to create (?shards=X), and the current shard number
   *  (&shard_num=Y), are added to the testing bundle url and read by the
   *  test_harness/setup_test_sharding[1] module. This allows us to use a
   *  different number of shards in different scenarios (ie. running
   *  `npm run test:browser` runs the tests in a single shard, effectively
   *  disabling sharding)
   *
   *  These same parameters can also be defined in the URL/query string of the
   *  karma debug page (started when you run `npm run test:dev`).
   *
   *  ## debugging
   *
   *  It is *possible* that some tests will only pass if run after/with certain
   *  other suites. To debug this, make sure that your tests pass in isolation
   *  (by clicking the suite name on the karma debug page) and that it runs
   *  correctly in it's given shard (using the `?shards=X&shard_num=Y` query
   *  string params on the karma debug page). You can spot the shard number
   *  a test is running in by searching for the "ready to load tests for shard X"
   *  log message.
   *
   *  [1]: src/ui/public/test_harness/test_sharding/setup_test_sharding.js
   */
  times(TOTAL_CI_SHARDS, i => {
    const n = i + 1;
    config[`ciShard-${n}`] = {
      singleRun: true,
      options: {
        files: [
          // kibi: make the port configurable
          `http://localhost:${serverConfig.servers.testserver.port}/bundles/commons.bundle.js`,
          `http://localhost:${serverConfig.servers.testserver.port}/bundles/tests.bundle.js?shards=${TOTAL_CI_SHARDS}&shard_num=${n}`,
          `http://localhost:${serverConfig.servers.testserver.port}/bundles/commons.style.css`,
          `http://localhost:${serverConfig.servers.testserver.port}/bundles/tests.style.css`
        ]
      }
    };
  });

  return config;
};
