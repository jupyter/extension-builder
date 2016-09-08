// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as webpack
  from 'webpack';

import {
  Config
} from 'webpack-config';

import {
  JupyterLabPlugin
} from './plugin';


/**
 * Build a JupyterLab extension.
 *
 * @param name - The name of the extension.
 *
 * @param entryPath - The path to the entry point file.
 *
 * @param extras - Optional WebPack config to be merged with the defaults.
 *
 * #### Notes
 * The loading of all CSS files is handled by the extension builder, and cannot
 * be overriden using this function.
 */
export
function buildExtension(options: IBuildOptions) {
  try {
    require.resolve(entryPath);
  } catch (e) {
    console.error('Cannot resolve entry path:', entryPath);
    return;
  }
  let entry = {};
  entry[name] = entryPath;

  let config = new Config().merge({ entry: entry }).merge({
    output: {
      path: __dirname + '/build',
      filename: '[name].bundle.js',
      publicPath: 'labextension/[name]'
    },
    node: {
      fs: 'empty'
    },
    debug: true,
    bail: true,
    module: {
      loaders: [
        { test: /\.css$/, loader: JupyterLabPlugin.cssLoader },
      ]
    },
    plugins: [new JupyterLabPlugin()]
  }).merge(extras || {});

  let compiler = webpack(config);
  compiler.context = name;
  compiler.run(function(err, stats) {
    if (err) {
      console.error(err.message);
    } else {
      console.log('\n\nSuccess fully built "' + name + '":\n');
      process.stdout.write(stats.toString({
        chunks: true,
        modules: false,
        chunkModules: false,
        colors: require('supports-color')
      }) + '\n');
    }
  });
}
