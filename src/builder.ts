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
 * The default file loaders.
 */
const
DEFAULT_LOADERS = [
  { test: /\.json$/, loader: 'json-loader' },
  { test: /\.html$/, loader: 'file-loader' },
  { test: /\.(jpg|png|gif)$/, loader: 'file-loader' },
  { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
  { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff' },
  { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/octet-stream' },
  { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
  { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=image/svg+xml' }
];


/**
 * Build a JupyterLab extension.
 *
 * @param options - The options used to build the extension.
 */
export
function buildExtension(options: IBuildOptions) {
  let name = options.name;

  if (!name) {
    throw Error('Must specify a name for the extension');
  }
  if (!options.entry) {
    throw Error('Must specify an entryPath');
  }

  // Create the named entry point to the entryPath.
  let entry: { [key: string]: string } = {};
  entry[name] = options.entry;

  let config = new Config().merge({
    // The default options.
    entry: entry,
    output: {
      path: path.resolve(options.outputDir || './build'),
      filename: '[name].bundle.js',
      publicPath: `labextension/${name}`
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
    // Note that we have to use an explicit local public path
    // otherwise the urls in the extracted CSS will point to the wrong
    // location.
    // See https://github.com/webpack/extract-text-webpack-plugin/issues/27#issuecomment-77531770
    let loader = ExtractTextPlugin.extract('style-loader', 'css-loader',
      { publicPath: './' });
    config.merge({
      module: {
        loaders: [{ test: /\.css$/, loader: loader }]
      },
      plugins: [new ExtractTextPlugin('[name].css')]
    });
  }

  // Add the rest of the default loaders unless explicitly told otherwise.
  if (options.useDefaultLoaders !== false) {
    config.merge({
      module: {
        loaders: DEFAULT_LOADERS
      }
    });
  }

  // Set up and run the WebPack compilation.
  let compiler = webpack(config);
  compiler.context = name;
  compiler.run((err, stats) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`\n\nSuccessfully built "${name}":\n`);
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
   * The module to load as the entry point.
   *
   * The module should export a plugin configuration or array of
   * plugin configurations.
   */
  entry: string;

  /**
   * The directory in which to put the bundled files.
   *
   * Relative directories are resolved relative to the current
   * working directory of the process. The default is './build'.
   */
  outputDir?: string;

  /**
   * Whether to extract CSS from the bundles (default is True).
   *
   * Note: no other CSS loaders should be used if not set to False.
   */
  extractCSS?: boolean;

  /**
   * Whether to use the default loaders for some common file types.
   *
   * See [[DEFAULT_LOADERS]].  The default is True.
   */
  useDefaultLoaders?: boolean;

  /**
   * Extra webpack configuration.
   */
  config?: webpack.Configuration;
}
