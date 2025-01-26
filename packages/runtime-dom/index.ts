import { createAppApi, createRenderer, type CreateAppFunction } from '../runtime-core'
import { nodeOps } from './node-ops'
import { patchProp } from './patch-prop'

const { render } = createRenderer({ ...nodeOps, patchProp })
const _createApp = createAppApi(render)

export const createApp: CreateAppFunction<Element> = (...args) => {
  const app = _createApp(...args)
  const { mount } = app
  app.mount = (selector) => {
    const container = typeof selector === 'string' ? document.querySelector(selector) : selector
    if (!container) return
    mount(container)
  }

  return app
}

export * from '../runtime-core'
