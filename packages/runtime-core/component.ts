import type { ReactiveEffect } from '../reactivity'
import { emit } from './component-emits'
import type { ComponentOptions } from './component-options'
import { initProps, type Props } from './component-props'
import type { VNode, VNodeChild } from './vnode'

export type Component = ComponentOptions

export type Data = Record<string, unknown>

export interface ComponentInternalInstance {
  type: Component
  /**
   * Vnode representing this component in its parent's vdom tree
   */
  vnode: VNode
  /**
   * Root vnode of this component's own vdom tree
   */
  subTree: VNode
  /**
   * The pending new vnode from parent updates
   * @internal
   */
  next: VNode | null
  effect: ReactiveEffect

  render: InternalRenderFunction
  update: () => void

  propsOptions: Props
  props: Data

  emit: (event: string, ...args: any[]) => void

  isMounted: boolean

  setupState: Data
}

export type InternalRenderFunction = {
  (ctx: Data): VNodeChild
}

export function createComponentInstance(vnode: VNode): ComponentInternalInstance {
  const type = vnode.type as Component

  const instance: ComponentInternalInstance = {
    type,
    vnode,
    next: null,
    effect: null!,
    subTree: null!,
    update: null!,
    render: null!,
    isMounted: false,
    propsOptions: type.props || {},
    props: {},
    emit: null!,
    setupState: {},
  }

  instance.emit = emit.bind(null, instance)

  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  const { props } = instance.vnode
  initProps(instance, props)

  const component = instance.type as Component
  if (component.setup) {
    const setupResult = component.setup(instance.props, {
      emit: instance.emit,
    })

    if (typeof setupResult === 'function') {
      instance.render = setupResult as InternalRenderFunction
    } else if (typeof setupResult === 'object' && setupResult !== null) {
      instance.setupState = setupResult
    } else {
      // ... ...
    }
  }

  if (compile && !component.render) {
    const template = component.template ?? ''
    if (template) {
      instance.render = compile(template)
    }
  }

  const { render } = component
  if (render) {
    instance.render = render as InternalRenderFunction
  }
}

type CompileFunction = (template: string) => InternalRenderFunction
let compile: CompileFunction | undefined

export function registerRuntimeCompiler(_compile: any) {
  compile = _compile
}
