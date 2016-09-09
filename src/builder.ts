// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as ExtractTextPlugin
  from 'extract-text-webpack-plugin';

import * as fs
  from 'fs';

import * as path
  from 'path';

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
 * @param options - The options used to build the extension.
 */
export
function buildExtension(options: IBuildOptions) {
  let name = options.name;
  let entryPath = options.entryPath;

  if (!name) {
    throw Error('Must specify a name for the extension');
  }
  if (!entryPath) {
    throw Error('Must specify an entryPath');
  }
  try {
    fs.statSync(path.join(process.cwd(), entryPath));
  } catch (e) {
    throw Error('Invalid path to entry point: ' + entryPath);
  }

  // Create the named entry point to the entryPath.
  let entry: { [key: string]: string } = {};
  entry[name] = options.entryPath;

  let config = new Config().merge({ entry: entry }).merge({
    // The default options.
    output: {
      path: process.cwd() + '/build',
      filename: '[name].bundle.js',
      publicPath: 'labextension/[name]'
    },
    node: {
      fs: 'empty'
    },
    debug: true,
    bail: true,
    plugins: [new JupyterLabPlugin()]
  // Add the override options.
  }).merge(options.config || {});

  // Add the CSS extractors unless explicitly told otherwise.
  if (options.extractCSS !== false) {
    let loader: any = ExtractTextPlugin.extract('style-loader', 'css-loader',
      { publicPath: './' });
    config.merge({
      module: {
        loaders: [{ test: /\.css$/, loader: loader }]
      },
      plugins: [new ExtractTextPlugin('[name].css')]
    });
  }

  // Set up and run the WebPack compilation.
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


/**
 * The options used to build a JupyterLab extension.
 */
export
interface IBuildOptions {
  /**
   * The name of the extension.
   */
  name: string;

  /**
   * The path to the entry point.
   */
  entryPath: string;

  /**
   * Whether to extract CSS from the bundles (default is True).
   *
   * Note: no other CSS loaders should be used if set to True.
   */
  extractCSS?: boolean;

  /**
   * Extra webpack configuration.
   */
  config?: webpack.Configuration;
}
