// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  maxSatisfying
} from 'semver';


/**
 * A module loader using semver for dynamic resolution of requires.
 *
 * It is meant to be used in conjunction with the JuptyerLabPlugin
 * for WebPack.
 */
export
class ModuleLoader {
  /**
   * Construct a new module loader.
   */
  constructor() {
    // Provide the `require.ensure` function used for code
    // splitting in the WebPack bundles.
    // https://webpack.github.io/docs/code-splitting.html
    (this.require as any).ensure = this.ensureBundle.bind(this);
    this._boundRequire = this.require.bind(this);
    this._boundRequire.ensure = this.ensureBundle.bind(this);
  }

  /**
   * Define a module that can be synchronously required.
   *
   * @param path - The version-mangled fully qualified path of the module.
   *   For example, "foo@1.0.1/lib/bar/baz.js".
   *
   * @param callback - The callback function for invoking the module.
   *
   * #### Notes
   * The callback is called with the module,
   */
  define(path: string, callback: ModuleLoader.DefineCallback): void {
    if (!(path in this._registered)) {
      this._registered[path] = callback;
    }
  }

  /**
   * Synchronously require a module that has already been loaded.
   *
   * @param path - The semver-mangled fully qualified path of the module.
   *   For example, "foo@^1.1.0/lib/bar/baz.js".
   *
   * @returns The exports of the requested module, if registered.  The module
   *   selected is the registered module that maximally satisfies the semver
   *   range of the request.
   */
  require(path: string): any {
    // Check if module is in cache.
    let id = this._findMatch(path);
    let installed = this._modules;
    if (installed[id]) {
      return installed[id].exports;
    }

    // Create a new module (and put it into the cache).
    let mod = installed[id] = {
      exports: {},
      id,
      loaded: false
    };

    // Execute the module function.
    let callback = this._registered[id];
    callback.call(mod.exports, mod, mod.exports, this._boundRequire);

    // Flag the module as loaded.
    mod.loaded = true;

    // Return the exports of the module.
    return mod.exports;
  }

  /**
   * Ensure a bundle is loaded on a page.
   *
   * @param path - The public path of the bundle (e.g. "lab/jupyter.bundle.js").
   *
   * @param callback - The callback invoked when the bundle has loaded.
   */
  ensureBundle(path: string, callback?: ModuleLoader.EnsureCallback): Promise<void> {
    let bundle = this._getBundle(path);

    if (bundle.loaded) {
      if (callback) {
        callback.call(null, this.require);
      }
      return Promise.resolve(void 0);
    }

    if (callback) {
      bundle.callbacks.push(callback);
    }
    return bundle.promise;
  }

  /**
   * Find a module path matching a given module request.
   *
   * @param path - The semver-mangled fully qualified path to the module.
   *   For example, "foo@^1.1.0/lib/bar/baz.js".
   *
   * @returns The matching defined module path, if registered.  A match is
   *   the registered path that maximally satisfies the semver range of the
   *   request.
   */
  private _findMatch(path: string): string {
    // Use the cached match if available.
    let cache = this._matches;
    if (cache[path]) {
      return cache[path];
    }
    let modules = Object.keys(this._registered);
    let source = this._parsePath(path);
    if (!source) {
      throw Error('Invalid module path ' + path);
    }
    let matches: string[] = [];
    let versions: string[] = [];
    for (let mod of modules) {
      let target = this._parsePath(mod);
      if (!target) {
        continue;
      }
      if (source.package === target.package &&
          source.module === target.module) {
        matches.push(mod);
        versions.push(target.version);
      }
    }

    if (!matches.length) {
      throw Error(`No module found matching: ${path}`);
    }
    let index = 0;
    if (matches.length > 1) {
      let best = maxSatisfying(versions, source.version);
      if (!best) {
        throw new Error(`No module found satisying: ${path}`);
      }
      index = versions.indexOf(best);
    }
    cache[path] = matches[index];
    return matches[index];
  }

  /**
   * Get or create a bundle record for a path.
   */
  private _getBundle(path: string): Private.IBundle {
    let bundle = this._bundles[path];
    if (bundle) {
      return bundle;
    }
    // Start bundle loading.
    let head = document.getElementsByTagName('head')[0];
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    let promise = new Promise<void>((resolve, reject) => {
      script.onload = () => {
        while (bundle.callbacks.length) {
          bundle.callbacks.shift().call(null, this.require.bind(this));
        }
        bundle.loaded = true;
        resolve(void 0);
      };
      script.onerror = err => {
        reject(err);
      };
    });
    head.appendChild(script);
    script.src = path;
    bundle = this._bundles[path] = {
      loaded: false,
      callbacks: [],
      promise
    };
    return bundle;
  }

  /**
   * Parse a version-mangled module path.
   *
   * @param path - The module path (e.g. "foo@^1.1.0/lib/bar/baz.js").
   *
   * @returns A parsed object describing the module path.
   */
  private _parsePath(path: string): Private.IPathInfo {
    let cache = this._parsed;
    if (cache[path]) {
      return cache[path];
    }
    let match = path.match(/(^(?:@[^/]+\/)??[^/@]+?)@([^/]+?)(\/.*)?$/);
    if (!match) {
      cache[path] = null;
    } else {
      cache[path] = {
        package: match[1],
        version: match[2],
        module: match[3]
      };
    }
    return cache[path];
  }

  private _registered: { [key: string]: ModuleLoader.DefineCallback } = Object.create(null);
  private _parsed: { [key: string]: Private.IPathInfo } = Object.create(null);
  private _modules: { [key: string]: Private.IModule } = Object.create(null);
  private _bundles: { [key: string]: Private.IBundle } = Object.create(null);
  private _matches: { [key: string]: string } = Object.create(null);
  private _boundRequire: any;
}


/**
 * A namespace for `ModuleLoader` statics.
 */
export
namespace ModuleLoader {
  /**
   * A callback for a define function that takes a module, its exports,
   * and a require function.
   */
  export
  type DefineCallback = (module: any, exports: any, require: NodeRequire) => void;

  /**
   * A callback for an ensure function that takes a require function.
   */
  export
  type EnsureCallback = (require: NodeRequire) => void;
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * A module record.
   */
  export
  interface IModule {
    /**
     * The exports of the module.
     */
    exports: any;

    /**
     * The id of the module.
     */
    id: string;

    /**
     * Whether the module has been loaded.
     */
    loaded: boolean;
  }

  /**
   * A bundle record.
   */
  export
  interface IBundle {
    /**
     * Whether the bundle has been loaded.
     */
    loaded: boolean;

    /**
     * The callbacks associated with the bundle.
     */
    callbacks: ModuleLoader.EnsureCallback[];

    /**
     * A promise fullfiled when the bundle has loaded.
     */
    promise: Promise<void>;
  }

  /**
   * A parsed path record.
   */
  export
  interface IPathInfo {
    /**
     * The source package.
     */
    package: string;

    /**
     * The version string.
     */
    version: string;

    /**
     * The module path.
     */
    module: string;
  }
}

