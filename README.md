JupyterLab Extension Builder
============================

Tools for building JupyterLab extensions.

An extension to JupyterLab is a module that provides one or more
plugins to the JupyterLab application.  This library provides
a build script for generating third party extension JavaScript
bundles.  

Simple extensions can be created by using the `buildExtension` function
with the default options.  More advanced extensions may require additional
configuration.

A simple extension entry point could look like: 

```javascript
module.exports = [{
    id: 'my-cool-extension',
    activate: function(app) {
       console.log(app.commands);
    }
}];
```

The above could be built using the following script:

```javascript
var buildExtension = require('jupyterlab-extension-builder').buildExtension;

buildExtension({
    name: 'my-cool-extension',
    entryPath: './index.js',
    outputPath: './build'
});
```

In this case the builder script will create the following files:

```
build/my-cool-extension.js
build/my-cool-extension.js.manifest
```

Other extensions may produce other files in the build directory
depending on the complexity of extension.  The two files above
are used by JupyterLab server to determine the entry point file(s) and 
entry point module(s) for the extension.  The extension must also be 
registered using `jupyter labextension` in order to be added to the 
application.

The bundles are created using Webpack, where the modules produced
by Webpack are modified to use the JupyterLab custom module registration
and loading mechanism.  

The module loading mechanism uses a `define` function that registers
modules by name, where the name contains the package name, version 
number, and the full path to the module.  For example, 'phosphor@0.6.1/lib/ui/widget.js'.  Within a `define` function, modules are required by package
name, semver range, and the full path to the module.  For example,
`require('phosphor@^0.6.0/lib/ui/tabpanel.js')`.  

By using a semver range, we enable client-side deduplication of modules, where 
the registered module that maximally satisfies a semver range is the one 
returned by the `require` function call.  This also enables us to perform 
server-side deduplication of modules prior to serving the bundles, the 
client-side lookup will still load the correct modules.  Reasons to deduplicate
code include being able to use `isinstance()` on an object to determine if
it is the same class (a technique used by phosphor's drag-drop mechanism).  
Another reason is for sharing of module-private state between different
consumers, such as a list of client-side running kernels in 
`jupyter-js-services.

All client-side `require()` calls are synchronous, which means that the 
bundles containing the `define()` modules must be loaded prior to using
any of their functions.  The loader provides an `ensureBundle()` function
to load a particular bundle or bundles prior to calling `require()` on
a module.

There may be some cases where the `buildExtension` function is not sufficient
to build an extension and a completely custom Webpack configuration is 
needed.  In that case, the only requirement is that the `JupyterLabPlugin` be 
used as part of the Webpack config to ensure the proper handling of module
definition and requires.


Package Install
---------------

**Prerequisites**
- [node](http://nodejs.org/)

```bash
npm install --save jupyterlab-extension-builder
```


Source Build
------------

**Prerequisites**
- [git](http://git-scm.com/)
- [node 0.12+](http://nodejs.org/)

```bash
git clone https://github.com/jupyter/jupyterlab-extension-builder.git
cd jupyterlab-extension-builder
npm install
npm run build
```

**Rebuild**
```bash
npm run clean
npm run build
```

