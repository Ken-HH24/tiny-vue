import { createApp, reactive } from 'vue'

const TemplateDemo = createApp({
  setup() {
    const state = reactive({ count: 1 })
    const increase = () => {
      state.count++
    }
    return { state, increase }
  },

  // This will be converted to a render function
  template: `<div>
    <div><span>count: </span><span>{{ state.count }}</span></div>
    <button @click="increase">click me @click</button>
    <button v-on:click="increase">click me v-on</button>
  </div>`,
})

TemplateDemo.mount('#app')
