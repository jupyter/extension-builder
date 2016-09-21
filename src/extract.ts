// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphor/lib/ui/application';

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * Extract the entry point plugins of a JupyterLab extension.
 *
 * @param data - The loaded entry point module.
 *
 * @returns An array of validated plugins.
 *
 * #### Notes
 * The plugin(s) are extracted and validated before being returned.
 */
export
function extractPlugins(data: any): Application.IPlugin<Widget, any>[] {
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
  return data;
}
