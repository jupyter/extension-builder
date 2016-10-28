// Augment the webpack typings.

import * as webpack from "webpack";

declare module "webpack" {
        namespace compiler {
            interface Compiler {
                context: string;
                /** Add a plugin */
                plugin(name: string, handler: webpack.compiler.CompilerCallback): void;
            }
        }
}
