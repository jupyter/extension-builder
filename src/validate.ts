// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


/**
 * Validate the entry point of a JupyterLab extension.
 *
 * @param data - The loaded entry point module.
 */
export
function validateEntry(data: any): void {
  // We use the default export from es6 modules.
  if (data.__esModule) {
    data = data.default;
  }
  if (!Array.isArray(data)) {
    data = [data];
  }
  if (!data.length) {
    throw new Error(`No plugins found`);
  }
  for (let i = 0; i < data.length; i++) {
    let plugin = data[i];
    if (!plugin.hasOwnProperty('id')) {
      throw new Error(`Missing id for plugin ${i}`);
    }
    if (typeof(plugin['activate']) !== 'function') {
      let id: string = plugin.id;
      throw Error(`Missing activate function in '${id}'`);
    }
  }
}
