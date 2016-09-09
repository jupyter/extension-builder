// Type definitions for extract-text-webpack-plugin
// Project: https://github.com/webpack/extract-text-webpack-plugin
// Definitions by: Steven Silvester <https://github.com/blink1073>


interface ExtractTextPlugin {
  extract(values: string[]): void;
}


interface ExtractTextPluginConstructor {
  new(id: string, filename?: string, options?: any): ExtractTextPlugin;
  (id: string, filename?: string, options?: any): ExtractTextPlugin;
  extract(notExtractLoader: string, loader: string, options?: any): void;
}


declare var ExtractTextPlugin: ExtractTextPluginConstructor;


declare module 'extract-text-webpack-plugin' {
  export = ExtractTextPlugin;
}
