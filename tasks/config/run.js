import { format } from 'url';
// kibi: imports
import { resolve } from 'path';
// kibi: end

import { esTestConfig } from '../../src/test_utils/es';
import { kibanaTestServerUrlParts } from '../../test/kibana_test_server_url_parts';

module.exports = function (grunt) {
  const platform = require('os').platform();
  const root = p => resolve(__dirname, '../../', p);
  // kibi: replaced script name with investigate
  const binScript =  /^win/.test(platform) ? '.\\bin\\investigate.bat' : './bin/investigate';
  const buildScript =  /^win/.test(platform) ? '.\\build\\kibana\\bin\\investigate.bat' : './build/kibana/bin/investigate';
  // kibi: end
  const pkgVersion = grunt.config.get('pkg.version');
  const releaseBinScript = `./build/kibi-${pkgVersion}-linux-x86_64/bin/kibana`;

  const uiConfig = require(root('test/server_config'));

  const stdDevArgs = [
    '--env.name=development',
    '--logging.json=false',
  ];

  const buildTestsArgs = [
    ...stdDevArgs,
    '--plugins.initialize=false',
    '--optimize.bundleFilter=tests',
  ];

  const kbnServerFlags = grunt.option.flags().reduce(function (flags, flag) {
    if (flag.startsWith('--kbnServer.')) {
      flags.push(`--${flag.slice(12)}`);
    }
    // kibi: below is needed when we want to pass boolean flags to disable plugins
    // grunt transforms boolean arguments by prepending '--no' in front if boolean command line arguments set to false
    // so we must change this back to format that can be passed to siren investigate.
    if (flag.startsWith('--no-kbnServer.')) {
      flags.push(`--${
        flag.replace('--no', '-')
        .concat('=false')
        .slice(12)
      }`);
    }
    // kibi: end
    return flags;
  }, []);

  return {
    eslint: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/eslint'),
        '--no-cache'
      ]
    },

    eslintStaged: {
      cmd: process.execPath,
      args: [
        require.resolve('../../scripts/eslint'),
        // staged paths are written here by lintStagedFiles task
      ]
    },

    testServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...buildTestsArgs,
        `--server.port=${uiConfig.servers.testserver.port}`, // kibi: make the port configurable
        ...kbnServerFlags,
      ]
    },

    apiTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--optimize.enabled=false',
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--server.xsrf.disableProtection=true',
        ...kbnServerFlags,
      ]
    },

    devApiTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--dev',
        '--no-base-path',
        '--no-ssl',
        '--optimize.enabled=false',
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--server.xsrf.disableProtection=true',
        ...kbnServerFlags,
      ]
    },

    testUIServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--kibana.index=' + uiConfig.servers.kibana.index, // kibi: use index from config
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        ...kbnServerFlags,
      ]
    },

    testUIReleaseServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: releaseBinScript,
      args: [
        ...stdDevArgs,
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        ...kbnServerFlags,
      ]
    },

    testUIDevServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--kibana.index=' + uiConfig.servers.kibana.index, // kibi: use index from config
        '--server.port=' + kibanaTestServerUrlParts.port,
        '--elasticsearch.url=' + esTestConfig.getUrl(),
        '--dev',
        '--no-base-path',
        '--no-ssl',
        '--optimize.lazyPort=5611',
        '--optimize.lazyPrebuild=true',
        '--optimize.bundleDir=optimize/testUiServer',
        ...kbnServerFlags,
      ]
    },

    testCoverageServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...buildTestsArgs,
        '--server.port=5610',
        '--tests_bundle.instrument=true',
        ...kbnServerFlags,
      ]
    },

    devTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...buildTestsArgs,
        '--dev',
        '--no-watch',
        '--no-ssl',
        '--no-base-path',
        '--server.port=5610',
        '--optimize.lazyPort=5611',
        '--optimize.lazyPrebuild=true',
        '--optimize.bundleDir=optimize/testdev',
        ...kbnServerFlags,
      ]
    },

    optimizeBuild: {
      options: {
        wait: false,
        ready: /Optimization .+ complete/,
        quiet: true
      },
      cmd: buildScript,
      args: [
        '--env.name=production',
        '--logging.json=false',
        '--plugins.initialize=false',
        '--server.autoListen=false',
        ...kbnServerFlags,
      ]
    }
  };
};
