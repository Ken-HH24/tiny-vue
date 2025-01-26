import type { Component } from './component'
import type { RootRenderFunction } from './renderer'

export interface App<HostElement = any> {
  mount: (hostElement: HostElement | string) => void
}

export type CreateAppFunction<HostElement> = (rootComponent: Component) => App<HostElement>

export function createAppApi<HostElement>(
  render: RootRenderFunction<HostElement>,
): CreateAppFunction<HostElement> {
  return function createApp(rootComponent) {
    const app: App = {
      mount(rootContainer) {
        render(rootComponent, rootContainer)
      },
    }

    return app
  }
}
