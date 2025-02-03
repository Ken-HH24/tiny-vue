import { baseCompile, baseParse } from '../compiler-core'
import type { CompilerOptions } from '../compiler-core/options'

export function compile(template: string, options?: CompilerOptions) {
  const defaultOptions: Required<CompilerOptions> = {
    isBrowser: true,
  }

  if (options) {
    Object.assign(defaultOptions, options)
  }

  return baseCompile(template, defaultOptions)
}

export function parse(template: string) {
  return baseParse(template)
}
