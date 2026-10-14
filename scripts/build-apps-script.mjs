import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

// Only repository-owned server modules are packaged. No npm runtime code,
// credential file, environment value, or local absolute path enters the bundle.
const root = process.cwd()
const entry = 'server/collectors/saramin-runner.ts'
const modules = new Map()
async function visit(id) {
  if (modules.has(id)) return
  const source = await readFile(path.join(root, id), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    rewriteRelativeImportExtensions: true, removeComments: true,
  } }).outputText
  modules.set(id, code)
  for (const match of code.matchAll(/require\("([^"\n]+)"\)/gu)) {
    const specifier = match[1]
    if (specifier === 'node:crypto') continue
    if (!specifier.startsWith('.')) throw new Error('Unsupported external runtime dependency')
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(id), specifier)).replace(/\.js$/u, '.ts')
    if (!dependency.startsWith('server/') && !dependency.startsWith('src/domain/')) throw new Error('Unsupported module boundary')
    await visit(dependency)
  }
}
await visit(entry)
const factories = [...modules].map(([id, code]) => `${JSON.stringify(id)}: function(module, exports, require) {\n${code}\n}`).join(',\n')
const output = `// Generated from repository TypeScript. Rebuild; do not edit.\nvar CareerRadar = (function() {\nvar factories = {${factories}};\nvar cache = {};\nfunction load(id) {\n if (id === 'node:crypto') return {createHash: function() {var input = ''; return {update: function(value) {input += value; return this;}, digest: function() {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8).map(function(n) {return ((n + 256) % 256).toString(16).padStart(2, '0');}).join('');}};}};\n if (cache[id]) return cache[id].exports;\n if (!factories[id]) throw new Error('Unknown bundled module');\n var module = {exports: {}}; cache[id] = module;\n factories[id](module, module.exports, function(spec) {if (spec === 'node:crypto') return load(spec); var parts = id.split('/'); parts.pop(); spec.split('/').forEach(function(p) {if (p === '..') parts.pop(); else if (p !== '.') parts.push(p);}); return load(parts.join('/').replace(/\\.js$/, '.ts'));});\n return module.exports;\n}\nreturn load(${JSON.stringify(entry)});\n})();\n`
const destination = path.join(root, '.setup/apps-script')
await mkdir(destination, { recursive: true })
await writeFile(path.join(destination, 'Core.gs'), output)
await copyFile('automation/apps-script/Collector.gs', path.join(destination, 'Collector.gs'))
await copyFile('automation/apps-script/collector-manifest.json', path.join(destination, 'appsscript.json'))
console.log(JSON.stringify({ status: 'BUILT_NOT_DEPLOYED', modules: modules.size, destination: '.setup/apps-script', dependenciesAdded: 0 }))
