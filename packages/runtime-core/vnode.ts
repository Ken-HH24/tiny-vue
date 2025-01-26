import type { ComponentInternalInstance } from './component'

export const Text = Symbol()

export type VNodeTypes = string | typeof Text | object

export interface VNodeProps {
  [key: string]: any
}

// Type after normalization
export type VNodeNormalizedChildren = string | VNodeArrayChildren
export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>

type VNodeChildAtom = VNode | string
export type VNodeChild = VNodeChildAtom | VNodeArrayChildren

export interface VNode<HostNode = any> {
  type: VNodeTypes
  props: VNodeProps | null
  children: VNodeNormalizedChildren
  el: HostNode | undefined
  component: ComponentInternalInstance | null
}

export function createVNode(
  type: VNodeTypes,
  props: VNodeProps | null,
  children: VNodeNormalizedChildren,
) {
  const vnode: VNode = { type, props, children, el: undefined, component: null }
  return vnode
}

export function normalizeVNode(child: VNodeChild): VNode {
  if (typeof child === 'object') {
    return { ...child } as VNode
  } else {
    return createVNode(Text, null, String(child))
  }
}
