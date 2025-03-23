<template>
  <transition name="fade">
    <div
      v-if="visible"
      :class="[
        'fixed top-0 left-0 flex w-full p-[10px] z-[999] transition duration-[900ms] box-border',
        type === 'success' ? 'bg-status-success' : 'bg-status-error',
      ]"
    >
      <p class="w-full text-center text-white m-auto block">{{ message }}</p>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref<boolean>(false)
const message = ref<string>('')
const type = ref<'success' | 'error'>('success')
let timer: number | null = null

/**
 * トースト表示
 * @param {string} text トーストメッセージ
 * @param {'success' | 'error'} toastType タイプ
 * @param {number} duration 表示秒数（0で常時表示）
 */
const showToast = (text: string, toastType: 'success' | 'error' = 'success', duration = 2000) => {
  message.value = text
  type.value = toastType
  visible.value = true

  if (timer) clearTimeout(timer)
  if (duration) {
    timer = window.setTimeout(() => {
      visible.value = false
    }, duration)
  }
}

defineExpose({ showToast })
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
