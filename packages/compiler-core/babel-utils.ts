import type { Identifier } from '@babel/types'

import type { Node } from './ast'

import { walk } from 'estree-walker'

export const walkIdentifiers = (root: Node, onIdentifier: (node: Identifier) => void, knownIds: Record<string, number> = {}) => {
  const memberExpressionMap = new Map<any, number>()

  walk(root as any, {
    enter(node, parent) {
      if (node.type === 'Identifier') {
        let count = (memberExpressionMap.get(parent) ?? 0) + 1
        const isLocal = !!knownIds[node.name];
        if (parent?.type === 'MemberExpression') {
          memberExpressionMap.set(parent, count)
        }
        // !important TODO: not right: state.count
        if (count === 1 && !isLocal) {
          onIdentifier(node as Identifier)
        }
      }
    },
  })
}
