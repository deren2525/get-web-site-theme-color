<template>
  <div class="flex flex-wrap items-start">
    <div
      v-for="color in colors"
      :key="`${color.color}-${color.previewColor ?? color.color}`"
      @click="$emit('color-clicked', color.copyColor ?? color.color)"
      class="inline-flex items-start w-1/2 cursor-pointer"
    >
      <div
        :style="{ background: color.previewColor ?? color.color }"
        :data-color="color.displayColor ?? color.color"
        class="mt-[8px] w-[30px] min-w-[30px] h-[15px] border border-white box-border"
      ></div>
      <p
        :data-color="color.displayColor ?? color.color"
        class="pl-[5px] text-[14px] my-[5px] text-gray leading-tight"
      >
        <span class="block">{{ color.displayColor ?? color.color }}</span>
        <span v-if="color.originalColor" class="block text-[12px]">
          {{ color.originalColor }}
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  colors: {
    color: string
    displayColor?: string
    value: number
    previewColor?: string
    copyColor?: string
    originalColor?: string
  }[]
}>()

defineEmits<{
  (e: 'color-clicked', color: string): void
}>()
</script>

<style scoped>
.text {
  color: #f1efed;
}
</style>
