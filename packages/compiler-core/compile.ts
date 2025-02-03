import { generate } from './codegen'
import type { CompilerOptions } from './options'
import { baseParse } from './parse'
import { transform, type DirectiveTransform, type NodeTransform } from './transform'
import { transformElement } from './transforms/transform-element'
import { transformExpression } from './transforms/transform-expression'
import { vBindTransform } from './transforms/v-bind'

export type TransformPreset = [NodeTransform[], Record<string, DirectiveTransform>]

export function getBaseTransformPreset(): TransformPreset {
  return [[transformElement, transformExpression], { bind: vBindTransform }]
}

export function baseCompile(template: string, options: Required<CompilerOptions>) {
  const ast = baseParse(template.trim())

  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset()

  transform(ast, {
    ...options,
    nodeTransforms: [...nodeTransforms],
    directiveTransforms: { ...directiveTransforms },
  })

  const code = generate(ast, options)
  return code
}
