import { createVNode, type VNode, type VNodeProps } from './vnode'

export function h(type: string | object, props: VNodeProps, children: (VNode | string)[]): VNode {
  return createVNode(type, props, children)
}
