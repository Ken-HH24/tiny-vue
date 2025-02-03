import { createObjectProperty, NodeTypes } from '../ast'
import type { DirectiveTransform } from '../transform'

export const vBindTransform: DirectiveTransform = (dir, _node, _context) => {
  const { exp } = dir

  const arg = dir.arg!

  if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    if (!arg.isStatic) {
      arg.content = `${arg.content} || ""`
    }
  } else {
    arg.children.unshift(`(`)
    arg.children.push(') || ""')
  }

  return { props: [createObjectProperty(arg, exp!)] }
}
