<template>
  <div class="color-list">
    <div
      class="color-item"
      v-for="color in colors"
      :key="color.color"
      @click="$emit('color-clicked', color.color)"
    >
      <div
        class="color-swatch"
        :style="{ background: color.color }"
        :data-color="color.color"
      ></div>
      <p :data-color="color.color">{{ color.color }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  colors: { color: string; value: number }[]
}>()

defineEmits<{
  (e: 'color-clicked', color: string): void
}>()
</script>

<style scoped>
.color-list {
  margin-top: 25px;
}

.color-item {
  display: inline-flex;
  align-items: center;
  width: 50%;
  cursor: pointer;
}

.color-swatch {
  width: 30px;
  height: 15px;
  border: 1px solid #fff;
  box-sizing: border-box;
}

.color-item p {
  padding-left: 5px;
  font-size: 14px;
  margin: 5px 0;
  color: #666;
}
</style>
