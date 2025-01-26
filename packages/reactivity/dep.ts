import type { ReactiveEffect } from './effect'

export type Dep = Set<ReactiveEffect>

export const createDep = (effects?: Set<ReactiveEffect>) => {
  const set = new Set<ReactiveEffect>(effects)
  return set
}
