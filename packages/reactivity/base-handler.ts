import { track, trigger } from './effect'
import { reactive } from './reactive'

export const mutableHandlers: ProxyHandler<object> = {
  get(target: object, key: string | symbol, receiver: object) {
    track(target, key)

    const res = Reflect.get(target, key, receiver)
    // If it is an object, make it reactive (this allows nested objects to be reactive as well).
    if (res !== null && typeof res === 'object') {
      return reactive(res)
    }

    return res
  },

  set(target: object, key: string | symbol, value: unknown, receiver: object) {
    let oldValue = (target as any)[key]
    Reflect.set(target, key, value, receiver)
    // check if the value has changed
    if (hasChanged(value, oldValue)) {
      trigger(target, key)
    }
    return true
  },
}

const hasChanged = (value: any, oldValue: any): boolean => !Object.is(value, oldValue)
