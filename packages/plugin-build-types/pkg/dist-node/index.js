'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var mkdirp = _interopDefault(require('mkdirp'));
var execa = _interopDefault(require('execa'));
var types = require('@pika/types');

function getTsConfigPath(options, cwd) {
  return path.resolve(cwd, options.tsconfig || 'tsconfig.json');
}

function manifest(manifest) {
  manifest.types = manifest.types || 'dist-types/index.d.ts';
}
async function beforeBuild({
  options,
  cwd
}) {
  const tsConfigPath = getTsConfigPath(options, cwd);

  if (options.tsconfig && !fs.existsSync(tsConfigPath)) {
    throw new types.MessageError(`"${tsConfigPath}" file does not exist.`);
  }
}
async function build({
  cwd,
  out,
  options,
  reporter
}) {
  await (async () => {
    const tscBin = path.join(cwd, 'node_modules/.bin/tsc');
    const writeToTypings = path.join(out, 'dist-types/index.d.ts');
    const importAsNode = path.join(out, 'dist-node', 'index.js');

    if (fs.existsSync(path.join(cwd, 'index.d.ts'))) {
      mkdirp.sync(path.dirname(writeToTypings));
      fs.copyFileSync(path.join(cwd, 'index.d.ts'), writeToTypings);
      return;
    }

    if (fs.existsSync(path.join(cwd, 'src', 'index.d.ts'))) {
      mkdirp.sync(path.dirname(writeToTypings));
      fs.copyFileSync(path.join(cwd, 'src', 'index.d.ts'), writeToTypings);
      return;
    }

    const tsConfigPath = getTsConfigPath(options, cwd);

    if (fs.existsSync(tscBin) && fs.existsSync(tsConfigPath)) {
      await execa(tscBin, ['-d', '--emitDeclarationOnly', '--declarationMap', 'false', '--project', tsConfigPath, '--declarationDir', path.join(out, 'dist-types/')], {
        cwd
      });
      return;
    } // !!! Still experimental:
    // const dtTypesDependency = path.join(
    //   cwd,
    //   "node_modules",
    //   "@types",
    //   manifest.name
    // );
    // const dtTypesExist = fs.existsSync(dtTypesDependency);
    // if (dtTypesExist) {
    //   fs.copyFileSync(dtTypesDependency, writeToTypings);
    //   return;
    // }


    reporter.info('no type definitions found, auto-generating...');
    const tsc = await Promise.resolve().then(() => require('typescript'));

    if (!tsc.generateTypesForModule) {
      console.error(`
  ⚠️  dist-types/: Attempted to generate type definitions, but "typescript@^3.5.0" no longer supports this.
                  Please either downgrade typescript, or author an "index.d.ts" type declaration file yourself.
                  See https://github.com/pikapkg/builders/issues/65 for more info.
  `);
      throw new Error(`Failed to build: dist-types/`);
    }

    const nodeImport = await Promise.resolve().then(() => require(`${importAsNode}`));
    const guessedTypes = tsc.generateTypesForModule('AutoGeneratedTypings', nodeImport, {});
    mkdirp.sync(path.dirname(writeToTypings));
    fs.writeFileSync(writeToTypings, guessedTypes);
  })();
  reporter.created(path.join(out, 'dist-types', 'index.d.ts'), 'types');
}

exports.beforeBuild = beforeBuild;
exports.build = build;
exports.manifest = manifest;
//# sourceMappingURL=index.js.map
