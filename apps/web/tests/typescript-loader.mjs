// Execute actual source modules in Node tests; no copied mapper/query logic.
import { existsSync, readFileSync } from 'node:fs'
import ts from 'typescript'

const sourceRoot = new URL('../src/', import.meta.url).href
export function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith(sourceRoot)) {
      const url = new URL(specifier, context.parentURL)
      for (const ext of ['.ts', '.tsx']) {
        const candidate = new URL(`${url.href}${ext}`)
        if (existsSync(candidate)) return nextResolve(candidate.href, context)
      }
    }
    return nextResolve(specifier, context)
}
export function load(url, context, nextLoad) {
    // SSR exercises real components; static assets become their URL, never mocked UI logic.
    if (url.startsWith(sourceRoot) && /\.(?:webp|png|svg)$/.test(url)) return {format:'module',shortCircuit:true,source:`export default ${JSON.stringify(new URL(url).pathname)}`}
    if (url.startsWith(sourceRoot) && /\.css$/.test(url)) return {format:'module',shortCircuit:true,source:'export {}'}
    if (url.startsWith(sourceRoot) && /\.tsx?$/.test(url)) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
      }).outputText }
    }
    return nextLoad(url, context)
}
