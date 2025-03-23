<template>
  <canvas ref="chartCanvasRef" width="260" height="260"></canvas>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, nextTick } from 'vue'
import Chart from 'chart.js/auto'

interface Props {
  title: string
  data: { color: string; value: number }[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'color-clicked', color: string): void
}>()

const chartInstance = ref<Chart | null>(null)
const chartCanvasRef = ref<HTMLCanvasElement | null>(null)

const renderChart = async () => {
  await nextTick()
  const ctx = chartCanvasRef.value
  if (!ctx) return

  if (chartInstance.value) {
    chartInstance.value.destroy()
  }

  chartInstance.value = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: props.data.map((d) => d.color),
      datasets: [
        {
          data: props.data.map((d) => d.value),
          backgroundColor: props.data.map((d) => d.color),
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => props.data[tooltipItem.dataIndex].color,
          },
        },
        title: { display: true, text: props.title },
      },
    },
  })

  ctx.onclick = (e) => {
    const elements = chartInstance.value?.getElementsAtEventForMode(
      e,
      'nearest',
      { intersect: true },
      false
    )
    if (elements?.length) {
      const index = elements[0].index
      const clickedColor = props.data[index].color
      emit('color-clicked', clickedColor)
    }
  }
}

onMounted(() => {
  if (props.data.length) renderChart()
})

watch(
  () => props.data,
  (newVal) => {
    if (newVal.length) renderChart()
  }
)
</script>

<style scoped></style>
