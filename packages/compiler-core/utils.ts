import { type JSChildNode, type SimpleExpressionNode, NodeTypes } from './ast'

const nonIdentifierRE = /^\d|[^\$\w]/
export const isSimpleIdentifier = (name: string): boolean =>
  !nonIdentifierRE.test(name)

export const isStaticExp = (p: JSChildNode): p is SimpleExpressionNode =>
  p.type === NodeTypes.SIMPLE_EXPRESSION && p.isStatic
