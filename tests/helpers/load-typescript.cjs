const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual production module; only infrastructure boundaries are replaced.
module.exports = function loadTypeScript(path, imports, globals = {}) {
  const source = fs.readFileSync(path, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, console: { ...console, warn() {}, error() {} },
    URL, Response, Request, File, crypto: require('node:crypto').webcrypto,
    setTimeout, clearTimeout,
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...globals,
  }, { filename: path });
  return exports;
};
