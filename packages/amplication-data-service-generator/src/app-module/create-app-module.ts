import { print } from "recast";
import { builders } from "ast-types";
import { Module, readFile, relativeImportPath } from "../util/module";
import {
  getExportedNames,
  interpolate,
  importNames,
  addImports,
  removeTSVariableDeclares,
} from "../util/ast";

const appModuleTemplatePath = require.resolve("./app.module.template.ts");
const APP_MODULE_PATH = "app.module.ts";
const MODULE_PATTERN = /\.module\.ts$/;

export async function createAppModule(
  resourceModules: Module[],
  staticModules: Module[]
): Promise<Module> {
  const nestModules = [
    ...resourceModules.filter((module) => module.path.match(MODULE_PATTERN)),
    ...staticModules.filter((module) => module.path.match(MODULE_PATTERN)),
  ];

  const nestModulesWithExports = nestModules.map((module) => ({
    module,
    exports: getExportedNames(module.code),
  }));
  const moduleImports = nestModulesWithExports.map(({ module, exports }) => {
    /** @todo explicitly check for "@Module" decorated classes */
    return importNames(
      // eslint-disable-next-line
      // @ts-ignore
      exports,
      relativeImportPath(APP_MODULE_PATH, module.path)
    );
  });
  const modules = builders.arrayExpression(
    nestModulesWithExports.map(({ exports }) => exports[0])
  );

  const file = await readFile(appModuleTemplatePath);

  interpolate(file, {
    MODULES: modules,
  });

  addImports(file, moduleImports);
  removeTSVariableDeclares(file);

  return {
    path: APP_MODULE_PATH,
    code: print(file).code,
  };
}
