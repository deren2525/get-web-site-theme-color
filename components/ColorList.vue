<template>
  <div class="mt-[25px]">
    <div
      v-for="color in colors"
      :key="color.color"
      @click="$emit('color-clicked', color.color)"
      class="inline-flex items-center w-1/2 cursor-pointer"
    >
      <div
        :style="{ background: color.color }"
        :data-color="color.color"
        class="w-[30px] h-[15px] border border-white box-border"
      ></div>
      <p :data-color="color.color" class="pl-[5px] text-[14px] my-[5px] text-gray">
        {{ color.color }}
      </p>
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

<style scoped></style>
