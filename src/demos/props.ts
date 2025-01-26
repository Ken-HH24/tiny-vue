import { createApp, h, reactive } from 'vue'

const CustomComponent = {
  props: { someMessage: { type: String } },

  setup(props: any, { emit }: any) {
    return () =>
      h('div', {}, [
        h('p', {}, [`someMessage: ${props.someMessage}`]),
        h('button', { onClick: () => emit('click:change-message') }, ['change message']),
      ])
  },
}

const PropsDemo = createApp({
  setup() {
    const state = reactive({ count: 0, message: 'Hello, custom component!' })

    const increment = () => {
      state.count++
    }

    const changeMessage = () => {
      state.message += '!'
    }

    return () =>
      h('div', {}, [
        h('span', {}, [`counter ${state.count}`]),
        h('button', { onClick: increment }, ['click me']),
        h(
          CustomComponent,
          { 'some-message': state.message, 'onClick:change-message': changeMessage },
          [],
        ),
      ])
  },
})

PropsDemo.mount('#app')
