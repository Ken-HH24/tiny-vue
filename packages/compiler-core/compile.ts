import { generate } from './codegen'
import type { CompilerOptions } from './options'
import { baseParse } from './parse'
import { transform, type DirectiveTransform, type NodeTransform } from './transform'
import { transformElement } from './transforms/transform-element'
import { transformExpression } from './transforms/transform-expression'
import { vBindTransform } from './transforms/v-bind'
import { vOnTransform } from './transforms/v-on'

export type TransformPreset = [NodeTransform[], Record<string, DirectiveTransform>]

export function getBaseTransformPreset(): TransformPreset {
  return [[transformElement, transformExpression], { bind: vBindTransform, on: vOnTransform }]
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
