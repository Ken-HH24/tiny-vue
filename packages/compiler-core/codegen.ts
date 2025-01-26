import { toHandlerKey } from '../shared'
import {
  type AttributeNode,
  type DirectiveNode,
  type ElementNode,
  type InterpolationNode,
  NodeTypes,
  type TemplateChildNode,
  type TextNode,
} from './ast'
import type { CompilerOptions } from './options'

export const generate = (
  {
    children,
  }: {
    children: TemplateChildNode[]
  },
  options: CompilerOptions,
): string => {
  return `${options.isBrowser ? 'return ' : ''}function render(_ctx) {
    ${options.isBrowser ? 'with (_ctx) {' : ''}
      const { h } = vue;
      return ${genNode(children[0], options)};
    ${options.isBrowser ? '}' : ''}
}`
}

const genNode = (node: TemplateChildNode, options: CompilerOptions): string => {
  switch (node.type) {
    case NodeTypes.ELEMENT:
      return genElement(node, options)
    case NodeTypes.TEXT:
      return genText(node)
    case NodeTypes.INTERPOLATION:
      return genInterpolation(node, options)
    default:
      return ''
  }
}

const genElement = (el: ElementNode, options: CompilerOptions): string => {
  return `h("${el.tag}", {${el.props.map((prop) => genProp(prop, options)).join(', ')}}, [${el.children
    .map((it) => genNode(it, options))
    .join(', ')}])`
}

const genProp = (prop: AttributeNode | DirectiveNode, options: CompilerOptions) => {
  switch (prop.type) {
    case NodeTypes.ATTRIBUTE:
      return `${prop.name}: "${prop.value?.content}"`
    case NodeTypes.DIRECTIVE:
      switch (prop.name) {
        case 'on':
          return `${toHandlerKey(prop.arg)}: ${options.isBrowser ? '' : '_ctx.'}${prop.exp}`
        default:
          throw new Error(`unexpected directive name. got "${prop.name}"`)
      }
    default:
      throw new Error(`unexpected prop type.`)
  }
}

const genText = (text: TextNode): string => {
  return `\`${text.content}\``
}

const genInterpolation = (node: InterpolationNode, options: CompilerOptions): string => {
  return `${options.isBrowser ? '' : '_ctx.'}${node.content}`
}
