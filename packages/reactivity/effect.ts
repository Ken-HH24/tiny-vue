import type { Dep } from './dep'

type KeyToDep = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDep>()

let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect<T = any> {
  constructor(public fn: Function) {}
  run() {
    let parentEffect: ReactiveEffect | undefined = activeEffect
    activeEffect = this
    const res = this.fn()
    activeEffect = parentEffect
    return res
  }
}

export function track(target: object, key: unknown) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  if (activeEffect) {
    deps.add(activeEffect)
  }
}

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const deps = depsMap.get(key)
  if (deps) {
    const effects = [...deps]
    effects.forEach((effect) => effect.run())
  }
}
