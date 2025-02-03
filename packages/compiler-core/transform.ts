import { isString } from '../shared'
import {
  NodeTypes,
  type DirectiveNode,
  type ElementNode,
  type ParentNode,
  type Property,
  type RootNode,
  type TemplateChildNode,
} from './ast'
import type { TransformOptions } from './options'

export interface TransformContext extends Required<TransformOptions> {
  currentNode: RootNode | TemplateChildNode | null
  parent: ParentNode | null
  childIndex: number
}

export type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext,
) => void | (() => void) | (() => void)[]

export interface DirectiveTransformResult {
  props: Property[]
}

export type DirectiveTransform = (
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext,
) => DirectiveTransformResult

export interface TransformContext extends Required<TransformOptions> {
  currentNode: RootNode | TemplateChildNode | null
  parent: ParentNode | null
  childIndex: number
}

function createTransformContext(
  root: RootNode,
  transformOptions: TransformOptions,
): TransformContext {
  const { nodeTransforms = [], directiveTransforms = {}, isBrowser = true } = transformOptions
  const context: TransformContext = {
    isBrowser,
    nodeTransforms,
    directiveTransforms,
    currentNode: root,
    parent: null,
    childIndex: 0,
  }

  return context
}

export function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
}

const traverseNode = (node: RootNode | TemplateChildNode, context: TransformContext) => {
  context.currentNode = node

  const nodeTransforms = context.nodeTransforms
  const exitFns = []

  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]

    const onExit = transform(node, context)
    if (onExit) {
      if (Array.isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }

    if (!context.currentNode) {
      return
    }

    node = context.currentNode
  }

  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
    case NodeTypes.INTERPOLATION:
      break

    default:
      break
  }

  context.currentNode = node
  for (let i = 0; i < exitFns.length; i++) {
    exitFns[i]()
  }
}

export function traverseChildren(parent: ParentNode, context: TransformContext) {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (isString(child)) continue
    context.parent = parent
    context.childIndex = i
    traverseNode(child, context)
  }
}
