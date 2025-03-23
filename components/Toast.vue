<template>
  <transition name="fade">
    <div v-if="visible" :class="['toast', type]">
      <p>{{ message }}</p>
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
 * @param {success' | 'error'} toastType タイプ
 * @param {number} duration 表示秒数（0を指定した場合は常時表示される）
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
.toast {
  position: fixed;
  top: 0;
  left: 0;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  z-index: 999;
  -webkit-transition: 0.9s;
  transition: 0.9s;
}

.toast.success {
  background: #16a4a7;
}

.toast.error {
  background: #e6705f;
}

.toast > p {
  width: 100%;
  display: block;
  margin: auto;
  text-align: center;
  color: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
