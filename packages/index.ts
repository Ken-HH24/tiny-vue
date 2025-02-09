import { compile } from './compiler-dom'
import { registerRuntimeCompiler } from './runtime-core/component'
import * as runtimeDom from './runtime-dom'

export { createApp } from './runtime-dom'
export { reactive } from './reactivity'
export { h, createVNode } from './runtime-core'
export { normalizeClass, normalizeProps, normalizeStyle, toHandlerKey } from './shared'

function compileToFunction(template: string) {
  const code = compile(template)
  const res = new Function('vue', code)(runtimeDom)
  return res
}

registerRuntimeCompiler(compileToFunction)
