// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as path
  from 'path';

import * as webpack
  from 'webpack';


/**
 * A WebPack plugin that generates custom bundles that use version and
 * semver-mangled require semantics.
 */
export
class JupyterLabPlugin {
  /**
   * Construct a new JupyterLabPlugin.
   */
  constructor(options?: JupyterLabPlugin.IOptions) {
    options = options || {};
    this._name = options.name || 'jupyter';
  }

  /**
   * Plugin installation, called by WebPack.
   *
   * @param compiler - The WebPack compiler object.
   */
  apply(compiler: webpack.compiler.Compiler) {
    let publicPath = compiler.options.output.publicPath;
    if (!publicPath) {
      throw new Error('Must define a public path');
    }
    if (publicPath[publicPath.length - 1] !== '/') {
      publicPath += '/';
    }
    this._publicPath = publicPath;

    // Notes
    // We use the emit phase because it allows other plugins to act on the
    // output first.
    // We can't replace the module ids during compilation, because there are
    // places in the compilation that assume a numeric id.
    compiler.plugin('emit', this._onEmit.bind(this));
  }

  private _onEmit(compilation: any, callback: () => void): void {

    // Explore each chunk (build output):
    compilation.chunks.forEach((chunk: any) => {

      let sources: string[] = [];

      // A mapping for each module name and its dependencies.
      let modules: any = {};

      // Explore each module within the chunk (built inputs):
      chunk.modules.forEach((mod: any) => {

        // We don't allow externals.
        if (mod.external) {
          throw Error('Cannot use externals:' + mod.userRequest);
        }

        // Parse each module.
        let source = this._parseModule(compilation, mod);
        sources.push(source);

        // Add dependencies to the manifest.
        let deps: string[] = [];
        for (let i = 0; i < mod.dependencies.length; i++) {
          let dep = mod.dependencies[i];
          if (dep.id && dep.id !== mod.id) {
            deps.push(Private.getRequirePath(dep));
          }
        }
        modules[Private.getDefinePath(mod)] = deps;
      });

      let code = sources.join('\n\n');

      // Replace the original chunk file.
      // Use the first file name, because the mangling of the chunk
      // file names are private to WebPack.
      let fileName = chunk.files[0];
      compilation.assets[fileName] = {
        source: function() {
          return code;
        },
        size: function() {
          return code.length;
        }
      };

      // Create a manifest for the chunk.
      let manifest: any = {};
      if (chunk.entry) {
        manifest['entry'] = Private.getDefinePath(chunk.modules[0]);
      }
      manifest['hash'] = chunk.hash;
      manifest['id'] = chunk.id;
      manifest['name'] = chunk.name || chunk.id;
      manifest['files'] = chunk.files;
      manifest['modules'] = modules;

      compilation.assets[fileName + '.manifest'] = {
        source: function() {
          return JSON.stringify(manifest);
        },
        size: function() {
          return JSON.stringify(manifest).length;
        }
      };

    });

    callback();

  }

  /**
   * Parse a WebPack module to generate a custom version.
   *
   * @param compilation - The Webpack compilation object.
   *
   * @param module - A parsed WebPack module object.
   *
   * @returns The new module contents.
   */
  private _parseModule(compilation: any, mod: any): string {
    let pluginName = this._name;
    let publicPath = this._publicPath;
    let requireName = '__' + pluginName + '_require__';
    let source = mod.source().source();

    // Regular modules.
    if (mod.userRequest) {
      // Handle ensure blocks with and without inline comments.
      // From WebPack dependencies/DepBlockHelpers
      source = this._handleEnsure(
        compilation, source, /__webpack_require__.e\/\*.*?\*\/\((\d+)/
      );
      source = this._handleEnsure(
        compilation, source, /__webpack_require__.e\((\d+)/
      );

      // Replace the require statements with the semver-mangled name.
      let deps = mod.getAllModuleDependencies();
      for (let i = 0; i < deps.length; i++) {
        let dep = deps[i];
        let target = '__webpack_require__(' + dep.id + ')';
        let modPath = Private.getRequirePath(dep);
        let replacer = '__webpack_require__(\'' + modPath + '\')';
        source = source.split(target).join(replacer);
      }
    // Context modules.
    } else if (mod.context) {
      // Context modules have to be assembled ourselves
      // because they are not clearly delimited in the text.
      source = Private.createContextModule(mod);
      source = source.split('webpackContext').join(pluginName + 'Context');
    }

    // Handle public requires.
    let requireP = '__webpack_require__.p';
    let newRequireP = '\'' + publicPath + '\'';
    source = source.split(requireP).join(newRequireP);

    // Replace the require name with the custom one.
    source = source.split('__webpack_require__').join(requireName);

    // Create our header and footer with a version-mangled defined name.
    let definePath = Private.getDefinePath(mod);
    let header = '/** START DEFINE BLOCK for ' + definePath + ' **/\n';
    header += pluginName + '.define(\'' + definePath;
    header += '\', function (module, exports, ' + requireName + ') {\n\t';
    let footer = '\n})\n/** END DEFINE BLOCK for ' + definePath + ' **/';

    // Combine code and indent.
    return header + source.split('\n').join('\n\t') + footer;
  }

  /**
   * Handle an ensure block.
   *
   * @param compilation - The Webpack compilation object.
   *
   * @param source - The raw module source.
   *
   * @param publicPath - The public path of the plugin.
   *
   * @param regex - The ensure block regex.
   *
   * @returns The new ensure block contents.
   */
  private _handleEnsure(compilation: any, source: string, regex: RegExp) {
    let publicPath = this._publicPath;
    while (regex.test(source)) {
      let match = source.match(regex);
      let chunkId = match[1];
      let fileName = '';
      // Use the first file name, because the mangling of the chunk
      // file name is private to WebPack.
      compilation.chunks.forEach((chunk: any) => {
        if (String(chunk.id) === chunkId) {
          fileName = chunk.files[0];
        }
      });
      let replacement = ('__webpack_require__.e(\'' + publicPath +
              fileName + '\'');
      source = source.replace(regex, replacement);
    }
    return source;
  }

  private _name = '';
  private _publicPath = '';
}


/**
 * A namespace for `JupyterLabPlugin` statics.
 */
export
namespace JupyterLabPlugin {
  export
  interface IOptions {
    /**
     * The name of the plugin.
     */
    name?: string;
  }
}


/**
 * A namespace for module private data.
 */
namespace Private {

  /**
   * Get the define path for a WebPack module.
   *
   * @param module - A parsed WebPack module object.
   *
   * @returns A version-mangled define path for the module.
   *    For example, 'foo@1.0.1/lib/bar/baz.js'.
   */
  export
  function getDefinePath(mod: any): string {
    if (!mod.context) {
      return '__ignored__';
    }
    let request = mod.userRequest || mod.context;
    let parts = request.split('!');
    let names: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      names.push(getModuleVersionPath(parts[i]));
    }
    return names.join('!');
  }

  /**
   * Get the require path for a WebPack module.
   *
   * @param module - A parsed WebPack module object.
   *
   * @returns A semver-mangled define path for the module.
   *    For example, 'foo@^1.0.0/lib/bar/baz.js'.
   */
  export
  function getRequirePath(mod: any): string {
    if (!mod.context) {
      return '__ignored__';
    }
    let issuer = mod.issuer || mod.userRequest;
    let request = mod.userRequest || mod.context;
    let requestParts = request.split('!');
    let parts: string[] = [];

    // Handle the loaders.
    for (let i = 0; i < requestParts.length - 1; i++) {
      parts.push(getModuleSemverPath(requestParts[i], requestParts[i]));
    }
    // Handle the last part.
    let base = requestParts[requestParts.length - 1];
    parts.push(getModuleSemverPath(base, issuer));
    return parts.join('!');
  }

  /**
   * Create custom context module source.
   *
   * @param module - A parsed WebPack module object.
   *
   * @returns The new contents of the context module output.
   */
  export
  function createContextModule(mod: any): string {
    // Modeled after Webpack's ContextModule.js.
    let map: { [key: string]: string } = {};
    let dependencies = mod.dependencies || [];
    dependencies.slice().sort((a: any, b: any) => {
      if (a.userRequest === b.userRequest) {
        return 0;
      }
      return a.userRequest < b.userRequest ? -1 : 1;
    }).forEach((dep: any) => {
      if (dep.module) {
        map[dep.userRequest] = getRequirePath(dep.module);
      }
    });
    let mapString = JSON.stringify(map, null, '\t');
    return generateContextModule(mapString, getDefinePath(mod));
  }

  /**
   * Find a package root path from a request.
   *
   * @param request - The request path.
   *
   * @returns The path to the package root.
   */
  function findRoot(request: string): string {
    let orig = request;
    if (path.extname(request)) {
      request = path.dirname(request);
    }
    while (true) {
      try {
        let pkgPath = require.resolve(path.join(request, 'package.json'));
        let pkg = require(pkgPath);
        // Use public packages except for the local package.
        if (!pkg.private || request === (process as any).cwd()) {
          return request;
        }
      } catch (err) {
        // no-op
      }
      let prev = request;
      request = path.dirname(request);
      if (request === prev) {
        throw Error('Could not find package for ' + orig);
      }
    }
  }

  /**
   * Get the package.json associated with a file.
   *
   * @param request - The request path.
   *
   * @returns The package.json object for the package.
   */
  function getPackage(request: string): any {
    let rootPath = findRoot(request);
    return require(path.join(rootPath, 'package.json'));
  }

  /**
   * Get a mangled path for a path using the extact version.
   *
   * @param path - The absolute path of the module.
   *
   * @returns A version-mangled path (e.g. 'foo@1.0.0/lib/bar/baz.js')
   */
  function getModuleVersionPath(path: string): string {
    let rootPath = findRoot(path);
    let pkg = getPackage(rootPath);
    let modPath = path.slice(rootPath.length + 1);
    let name = pkg.name + '@' + pkg.version;
    if (modPath) {
      name += '/' + modPath;
    }
    return name;
  }

  /**
   * Get the semver-mangled path for a request.
   *
   * @param request - The requested module path.
   *
   * @param issuer - The path of the issuer of the module request.
   *
   * @returns A semver-mangled path (e.g. 'foo@^1.0.0/lib/bar/baz.js')
   */
  function getModuleSemverPath(request: string, issuer: string): string {
    let rootPath = findRoot(request);
    let rootPackage = getPackage(rootPath);
    let issuerPath = findRoot(issuer);
    let issuerPackage = getPackage(issuer);
    let modPath = request.slice(rootPath.length + 1);
    let name = rootPackage.name;
    let semver = issuerPackage.dependencies[name] || rootPackage.version;
    if (issuerPackage.name === rootPackage.name) {
      // Allow patch version increments of itself.
      semver = '~' + rootPackage.version;
    } else if (semver.indexOf('file:') === 0) {
      let sourcePath = path.resolve(issuerPath, semver.slice('file:'.length));
      let sourcePackage = getPackage(sourcePath);
      // Allow patch version increments of local packages.
      semver = '~' + sourcePackage.version;
    }
    let id = name + '@' + semver;
    if (modPath) {
      id += '/' + modPath;
    }
    return id;
  }

  /**
   * Generate a context module given a mapping and an id.
   */
  function generateContextModule(mapString: string, id: string) {
    return `
      var map = ${mapString};
      function webpackContext(req) {
        return __webpack_require__(webpackContextResolve(req));
      };
      function webpackContextResolve(req) {
        return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
      };
      webpackContext.keys = function webpackContextKeys() {
        return Object.keys(map);
      };
      webpackContext.resolve = webpackContextResolve;
      module.exports = webpackContext;
      webpackContext.id = "${id}";
    `;
  }
}
