<script>
import { reactive } from 'vue'
export default {
  setup() {
    const state = reactive({ message: 'Hello, vue!', input: '', id: 'aaa' })

    const changeMessage = () => {
      state.message += '!'
    }

    const handleInput = (e) => {
      state.input = e.target?.value ?? ''
    }

    return { state, changeMessage, handleInput }
  },
}
</script>

<template>
  <div v-bind:id="state.id" class="container" style="text-align: center">
    <h2>{{ state.message }}</h2>
    <img width="150px" alt="Vue.js Logo"
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Vue.js_Logo_2.svg/1200px-Vue.js_Logo_2.svg.png" />
    <p><b>chibivue</b> is the minimal Vue.js</p>

    <button @click="changeMessage">click me!</button>

    <br />

    <label>
      Input Data
      <input @input="handleInput" />
    </label>

    <p>input value: {{ state.input }}</p>
  </div>
</template>

<style>
.container {
  height: 100vh;
  padding: 16px;
  background-color: #becdbe;
  color: #2c3e50;
}
</style>
