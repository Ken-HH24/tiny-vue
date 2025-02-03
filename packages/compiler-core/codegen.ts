import { isString } from '../shared'
import {
  type ArrayExpression,
  type CallExpression,
  type CompoundExpressionNode,
  type ExpressionNode,
  type InterpolationNode,
  type JSChildNode,
  NodeTypes,
  type ObjectExpression,
  type RootNode,
  type SimpleExpressionNode,
  type TemplateChildNode,
  type TextNode,
  type VNodeCall,
} from './ast'
import type { CompilerOptions } from './options'

const CONSTANT = {
  vNodeFuncName: 'h',
  mergeProps: 'mergeProps',
  normalizeClass: 'normalizeClass',
  normalizeStyle: 'normalizeStyle',
  normalizeProps: 'normalizeProps',
  ctxIdent: '_ctx',
}

type CodegenNode = TemplateChildNode | JSChildNode

export interface CodegenContext {
  source: string
  code: string
  indentLevel: number
  line: 1
  column: 1
  offset: 0
  runtimeGlobalName: string
  push(code: string, node?: CodegenNode): void
  indent(): void
  deindent(withoutNewLine?: boolean): void
  newline(): void
}

function createCodegenContext(root: RootNode): CodegenContext {
  const context: CodegenContext = {
    source: root.loc.source,
    code: '',
    line: 1,
    column: 1,
    offset: 0,
    runtimeGlobalName: 'vue',
    indentLevel: 0,
    push(code) {
      context.code += code
    },
    indent() {
      newLine(++context.indentLevel)
    },
    deindent(withoutNewLine = false) {
      if (withoutNewLine) {
        --context.indentLevel
      } else {
        newLine(--context.indentLevel)
      }
    },
    newline() {
      newLine(context.indentLevel)
    },
  }

  function newLine(n: number) {
    context.push('\n' + ' '.repeat(n))
  }

  return context
}

export const generate = (ast: RootNode, options: Required<CompilerOptions>): string => {
  const context = createCodegenContext(ast)

  const { push } = context
  const signature = [CONSTANT.ctxIdent].join(', ')

  if (options.isBrowser) {
    push('return ')
  }

  push(`function render(${signature}) {`)

  if (options.isBrowser) {
    context.indent()
    push(`with (${CONSTANT.ctxIdent}) {`)
  }

  context.indent()
  genFunctionPreamble(ast, context)

  push(`return `)

  if (ast.children) {
    ast.children.forEach((codegenNode) => {
      genNode(codegenNode, context, options)
    })
  }

  context.deindent()
  push(' }')

  if (options.isBrowser) {
    context.deindent()
    push(' }')
  }

  return context.code

  //   return `${options.isBrowser ? 'return ' : ''}function render(_ctx) {
  //     ${options.isBrowser ? 'with (_ctx) {' : ''}
  //       const { h } = vue;
  //       return ${genNode(ast.children[0], options)};
  //     ${options.isBrowser ? '}' : ''}
  // }`
}

function genFunctionPreamble(_ast: RootNode, context: CodegenContext) {
  const { push, newline, runtimeGlobalName } = context
  const helpers = [
    CONSTANT.vNodeFuncName,
    CONSTANT.mergeProps,
    CONSTANT.normalizeProps,
    CONSTANT.normalizeClass,
    CONSTANT.normalizeStyle,
  ].join(', ')
  push(`const { ${helpers} } = ${runtimeGlobalName}\n`)
  newline()
}

const genNode = (
  node: CodegenNode,
  context: CodegenContext,
  options: Required<CompilerOptions>,
) => {
  if (isString(node)) {
    context.push(node)
    return
  }

  switch (node.type) {
    case NodeTypes.ELEMENT:
      genNode(node.codegenNode!, context, options)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context, options)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context, options)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context, options)
      break
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context, options)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context, options)
      break
    case NodeTypes.JS_ARRAY_EXPRESSION:
      genArrayExpression(node, context, options)
      break
    default:
      return ''
  }
}

// const genElement = (el: ElementNode, options: CompilerOptions): string => {
//   return `h("${el.tag}", {${el.props.map((prop) => genProp(prop, options)).join(', ')}}, [${el.children
//     .map((it) => genNode(it, options))
//     .join(', ')}])`
// }

// const genProp = (prop: AttributeNode | DirectiveNode, options: CompilerOptions) => {
//   switch (prop.type) {
//     case NodeTypes.ATTRIBUTE:
//       return `${prop.name}: "${prop.value?.content}"`
//     case NodeTypes.DIRECTIVE:
//       switch (prop.name) {
//         case 'on':
//           return `${toHandlerKey(prop.arg)}: ${options.isBrowser ? '' : '_ctx.'}${prop.exp}`
//         default:
//           throw new Error(`unexpected directive name. got "${prop.name}"`)
//       }
//     default:
//       throw new Error(`unexpected prop type.`)
//   }
// }

const genText = (node: TextNode, context: CodegenContext) => {
  context.push(JSON.stringify(node.content), node)
}

const genInterpolation = (
  node: InterpolationNode,
  context: CodegenContext,
  options: Required<CompilerOptions>,
) => {
  // if (!options.isBrowser) {
  //   context.push(`${CONSTANT.ctxIdent}.`)
  // }

  // context.push(node.content)

  genNode(node.content, context, options)
}

const genExpression = (node: SimpleExpressionNode, context: CodegenContext) => {
  context.push(node.isStatic ? JSON.stringify(node.content) : node.content, node)
}

const genVNodeCall = (
  node: VNodeCall,
  context: CodegenContext,
  option: Required<CompilerOptions>,
) => {
  const { push } = context
  const { tag, props, children } = node

  push(CONSTANT.vNodeFuncName + '(', node)
  genNodeList(genNullableArgs([tag, props, children]), context, option)
  push(')', node)
}

const genNullableArgs = (args: any[]) => {
  let i = args.length
  while (i--) {
    if (args[i] !== null) {
      break
    }
  }
  return args.slice(0, i + 1).map((arg) => arg || 'null')
}

const genNodeList = (
  nodes: (string | CodegenNode | TemplateChildNode[])[],
  context: CodegenContext,
  option: Required<CompilerOptions>,
  comma: boolean = true,
) => {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else if (Array.isArray(node)) {
      genNodeListAsArray(node, context, option)
    } else {
      genNode(node, context, option)
    }

    if (i < nodes.length - 1) {
      comma && push(', ')
    }
  }
}

const genObjectExpression = (
  node: ObjectExpression,
  context: CodegenContext,
  option: Required<CompilerOptions>,
) => {
  const { push } = context
  const { properties } = node

  if (!properties.length) {
    push('{}', node)
    return
  }

  push('{')
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    const { key, value } = property

    genExpressionAsPropertyKey(key, context, option)
    push(': ')

    genNode(value, context, option)
    if (i < properties.length - 1) {
      push(', ')
    }
  }
  push(' }')
}

function genCompoundExpression(
  node: CompoundExpressionNode,
  context: CodegenContext,
  options: Required<CompilerOptions>,
) {
  for (let i = 0; i < node.children!.length; i++) {
    const child = node.children![i]
    if (isString(child)) {
      context.push(child)
    } else {
      genNode(child, context, options)
    }
  }
}

const genExpressionAsPropertyKey = (
  node: ExpressionNode,
  context: CodegenContext,
  option: Required<CompilerOptions>,
) => {
  const { push } = context
  if (node.type === NodeTypes.COMPOUND_EXPRESSION) {
    push(`[`)
    genCompoundExpression(node, context, option)
    push(`]`)
  } else if (node.isStatic) {
    push(JSON.stringify(node.content), node)
  } else {
    push(`[${node.content}]`, node)
  }
}

const genArrayExpression = (
  node: ArrayExpression,
  context: CodegenContext,
  option: Required<CompilerOptions>,
) => {
  genNodeListAsArray(node.elements as CodegenNode[], context, option)
}

const genNodeListAsArray = (
  node: (string | CodegenNode | TemplateChildNode[])[],
  context: CodegenContext,
  option: Required<CompilerOptions>,
) => {
  context.push('[')
  genNodeList(node, context, option)
  context.push(']')
}

const genCallExpression = (
  node: CallExpression,
  context: CodegenContext,
  option: Required<CompilerOptions>,
) => {
  const { push } = context
  const { callee, arguments: args } = node

  push(`${callee}(`, node)
  genNodeList(args, context, option)
  push(')')
}
