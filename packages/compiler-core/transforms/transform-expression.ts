import { parse } from '@babel/parser'
import type { Identifier } from '@babel/types'
import { makeMap } from '../../shared/make-map'
import {
  createCompoundExpression,
  createSimpleExpression,
  NodeTypes,
  type CompoundExpressionNode,
  type ExpressionNode,
  type SimpleExpressionNode,
} from '../ast'
import type { NodeTransform, TransformContext } from '../transform'
import { isSimpleIdentifier } from '../utils'
import { walkIdentifiers } from '../babel-utils'
import { advancePositionWithClone } from '../parse'

const isLiteralWhitelisted = makeMap('true,false,null,this')

export const transformExpression: NodeTransform = (node, ctx) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content as SimpleExpressionNode, ctx)
  } else if (node.type === NodeTypes.ELEMENT) {
    for (let i = 0; i < node.props.length; i++) {
      const dir = node.props[i]
      if (dir.type === NodeTypes.DIRECTIVE) {
        const exp = dir.exp
        const arg = dir.arg
        if (exp && exp.type === NodeTypes.SIMPLE_EXPRESSION && !(dir.name === 'on' && arg)) {
          dir.exp = processExpression(exp, ctx)
        }
        if (arg && arg.type === NodeTypes.SIMPLE_EXPRESSION && !arg.isStatic) {
          dir.arg = processExpression(arg, ctx)
        }
      }
    }
  }
}

interface PrefixMeta {
  start: number
  end: number
}

export const processExpression = (
  node: SimpleExpressionNode,
  ctx: TransformContext,
): ExpressionNode => {
  if (ctx.isBrowser) {
    return node
  }

  const rawExp = node.content

  const rewriteIdentifier = (str: string) => {
    return `_ctx.${str}`
  }

  if (isSimpleIdentifier(node.content)) {
    const isLiteral = isLiteralWhitelisted(rawExp)
    if (!isLiteral) {
      node.content = rewriteIdentifier(rawExp)
    }

    return node
  }

  const ast = parse(`(${rawExp})`).program
  type QualifiedId = Identifier & PrefixMeta
  const ids: QualifiedId[] = []
  const knownIds = Object.create(ctx.identifiers)

  walkIdentifiers(
    ast as any,
    (node) => {
      node.name = rewriteIdentifier(node.name)
      ids.push(node as QualifiedId)
    },
    knownIds,
  )

  const children: CompoundExpressionNode['children'] = []
  ids.sort((a, b) => a.start - b.start)
  ids.forEach((id, i) => {
    const start = id.start - 1
    const end = id.end - 1
    const last = ids[i - 1]
    const leadingText = rawExp.slice(last ? last.end - 1 : 0, start)
    if (leadingText.length) {
      children.push(leadingText)
    }

    const source = rawExp.slice(start, end)
    children.push(
      createSimpleExpression(id.name, false, {
        source,
        start: advancePositionWithClone(node.loc.start, source, start),
        end: advancePositionWithClone(node.loc.start, source, end),
      }),
    )
    if (i === ids.length - 1 && end < rawExp.length) {
      children.push(rawExp.slice(end))
    }
  })

  let ret
  if (children.length) {
    ret = createCompoundExpression(children, node.loc)
  } else {
    ret = node
  }

  return ret
}
