<script>
import { reactive } from 'vue'
export default {
  setup() {
    const state = reactive({ count: 1 })

    const increase = () => {
        state.count += 1
    }

    return { state, increase }
  },
}
</script>

<template>
  <div v-bind:id="state.id" class="container" style="text-align: center">
    <div>counter: {{ state.count }}</div>
    <button v-on:click="increase">click me</button>
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
