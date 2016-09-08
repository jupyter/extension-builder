// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  maxSatisfying
} from 'semver';


/**
 * A module loader using semver for deduplication of modules.
 */
export
class ModuleLoader {
  /**
   * Construct a new module loader.
   */
  constructor() {
    // Add the ensure function to the require module for internal use within
    // the modules.
    (this.require as any).e = this.ensureBundle.bind(this);
  }

  /**
   * Define a module that can be synchronously required.
   *
   * @param path - The version-mangled fully qualified path of the module.
   *   For example, "foo@1.0.1/lib/bar/baz.js".
   *
   * @param callback - The callback function for invoking the module.
   */
  define(path: string, callback: () => void): void {
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
    let id = this._findModuleId(path);
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
    callback.call(mod.exports, mod, mod.exports, this.require.bind(this));

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
  ensureBundle(path: string, callback?: any): Promise<void> {
    let bundles = this._bundles;
    let bundle = bundles[path] || this._createBundle(path);

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
   * Find a module matching a given module request.
   *
   * @param path - The semver-mangled fully qualified path to the module.
   *   For example, "foo@^1.1.0/lib/bar/baz.js".
   *
   * @returns The matching defined module path, if registered.  A match is
   *   the registered path that maximally satisfies the semver range of the
   *   request.
   */
  private _findModuleId(path: string): string {
    // Use the cached id if available.
    let cache = this._lookupCache;
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
      if (source.package === target.package && source.module === target.module) {
        matches.push(mod);
        versions.push(target.version);
      }
    }

    if (!matches.length) {
      throw Error('No module found matching: ' + path);
    }
    let index = 0;
    if (matches.length > 1) {
      let best = maxSatisfying(versions, source.version);
      if (!best) {
        throw new Error('No module found satisying: ' + path);
      }
      index = versions.indexOf(best);
    }
    cache[path] = matches[index];
    return matches[index];
  }

  /**
   * Create a bundle record for a path.
   */
  private _createBundle(path: string): Private.IBundle {
    // Start bundle loading.
    let head = document.getElementsByTagName('head')[0];
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    let promise = new Promise<void>((resolve, reject) => {
      script.onload = () => {
        let record = this._bundles[path];
        while (record.callbacks.length) {
          record.callbacks.shift().call(null, this.require);
        }
        record.loaded = true;
        resolve(void 0);
      };
      script.onerror = err => {
        reject(err);
      };
    });
    head.appendChild(script);
    script.src = path;
    let bundle: Private.IBundle = this._bundles[path] = {
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

  private _registered: { [key: string]: () => void } = Object.create(null);
  private _parsed: { [key: string]: Private.IPathInfo } = Object.create(null);
  private _modules: { [key: string]: Private.IModule } = Object.create(null);
  private _bundles: { [key: string]: Private.IBundle } = Object.create(null);
  private _lookupCache: { [key: string]: string } = Object.create(null);
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
    callbacks: (() => void)[];

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

