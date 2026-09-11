/**
 * One-shot: convert src TypeScript React files to .jsx / .js
 * Run: node scripts/convert-to-jsx.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, acc)
    else if (/\.tsx?$/.test(name)) acc.push(full)
  }
  return acc
}

const files = walk(srcDir)
console.log(`Converting ${files.length} files…`)

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8')
  const isTsx = file.endsWith('.tsx')
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      esModuleInterop: true,
      isolatedModules: true,
    },
    fileName: file,
    reportDiagnostics: false,
  })

  let out = outputText
    .replace(/^export\s*;\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimStart()

  const dest = isTsx ? file.replace(/\.tsx$/, '.jsx') : file.replace(/\.ts$/, '.js')
  fs.writeFileSync(dest, out.endsWith('\n') ? out : `${out}\n`, 'utf8')
  fs.unlinkSync(file)
  console.log(`${path.relative(root, file)} → ${path.relative(root, dest)}`)
}

console.log('Done.')
