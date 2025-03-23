<template>
  <div>
    <p class="title">WEB SITE THEME COLOR 🎨</p>

    <!-- タブ -->
    <ul class="tabs">
      <li class="tab" :class="{ 'is-active': activeTab === 0 }" @click="activeTab = 0">Background</li>
      <li class="tab" :class="{ 'is-active': activeTab === 1 }" @click="activeTab = 1">Text</li>
    </ul>

    <!-- パネル -->
    <div class="content">
      <div v-show="activeTab === 0" class="panel is-show">
        <div class="chart-container">
          <div class="loader" v-if="loading"></div>
          <canvas ref="backgroundCanvas" width="260" height="260"></canvas>
        </div>
        <div class="color-list">
          <div
            class="color-item"
            v-for="color in backgroundColors"
            :key="color.color"
            @click="copyText(color.color)"
          >
            <div :style="{ background: color.color }" :data-color="color.color"></div>
            <p :data-color="color.color">{{ color.color }}</p>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 1" class="panel is-show">
        <div class="chart-container">
          <div class="loader" v-if="loading"></div>
          <canvas ref="textCanvas" width="260" height="260"></canvas>
        </div>
        <div class="color-list">
          <div
            class="color-item"
            v-for="color in textColors"
            :key="color.color"
            @click="copyText(color.color)"
          >
            <div :style="{ background: color.color }" :data-color="color.color"></div>
            <p :data-color="color.color">{{ color.color }}</p>
          </div>
        </div>
      </div>
    </div>

    <div id="toast" :class="['toast', toastType]" v-show="toastMessage">
      <p>{{ toastMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Chart from 'chart.js/auto'

const activeTab = ref(0)
const loading = ref(true)
const backgroundCanvas = ref(null)
const textCanvas = ref(null)

const backgroundChart = ref(null)
const textChart = ref(null)

const backgroundColors = ref([])
const textColors = ref([])

const toastMessage = ref('')
const toastType = ref('')

// トースト表示
function showToast(message, type = 'success', time = 2000) {
  toastMessage.value = message
  toastType.value = type

  if (time) {
    setTimeout(() => {
      toastMessage.value = ''
    }, time)
  }
}

// 色コードをコピー
function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
    showToast(chrome.i18n.getMessage('Success_copy_color'), 'success', 2000)
  }
}

// ページロード後に初期化
onMounted(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]
    if (!currentTab?.id) {
      console.warn('No active tab found.')
      return
    }

    chrome.tabs.sendMessage(currentTab.id, {}, (val) => {
      loading.value = false
      if (chrome.runtime.lastError) {
        console.warn('❌ runtime.lastError:', chrome.runtime.lastError.message)
        showToast('❌Content script not found in this tab.', 'error', 0)
        console.warn(chrome.runtime.lastError.message)
        return
      } else {
        console.log('✅ Content script responded:', val)
        showToast('✅Success! Content script responded!', 'success')
      }

      if (!currentTab?.url) {
        showToast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0)
        return
      }
      const matches = currentTab.url.match(/(\w+):\/\/([\w.]+)\/(\S*)/)
      const isChromePage = matches && (matches[2] === 'chrome.google.com' || matches[1] === 'chrome')

      if (isChromePage) {
        showToast(
          chrome.i18n.getMessage(
            matches[2] === 'chrome.google.com'
              ? 'Error_access_chrome_web_store'
              : 'Error_access_chrome_pages'
          ),
          'error',
          0
        )
        return
      }

      if (!val || (!val.backgroundColors.length && !val.textColors.length)) {
        showToast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0)
        return
      }

      val.backgroundColors.sort((a, b) => b.value - a.value)
      val.textColors.sort((a, b) => b.value - a.value)

      backgroundColors.value = val.backgroundColors
      textColors.value = val.textColors

      // チャート描画
      backgroundChart.value = new Chart(backgroundCanvas.value, {
        type: 'doughnut',
        data: {
          labels: backgroundColors.value.map(c => c.color),
          datasets: [
            {
              backgroundColor: backgroundColors.value.map(c => c.color),
              data: backgroundColors.value.map(c => c.value),
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => backgroundColors.value[tooltipItem.dataIndex].color,
              },
            },
            title: { display: true, text: 'Background Color' },
          },
        },
      })

      textChart.value = new Chart(textCanvas.value, {
        type: 'doughnut',
        data: {
          labels: textColors.value.map(c => c.color),
          datasets: [
            {
              backgroundColor: textColors.value.map(c => c.color),
              data: textColors.value.map(c => c.value),
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => textColors.value[tooltipItem.dataIndex].color,
              },
            },
            title: { display: true, text: 'Text Color' },
          },
        },
      })

      // チャートクリックでコピー
      backgroundCanvas.value.onclick = (e) => {
        const elements = backgroundChart.value.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false)
        if (elements.length) {
          const index = elements[0].index
          copyText(backgroundColors.value[index].color)
        }
      }

      textCanvas.value.onclick = (e) => {
        const elements = textChart.value.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false)
        if (elements.length) {
          const index = elements[0].index
          copyText(textColors.value[index].color)
        }
      }
    })
  })
})
</script>

<style scoped>
/* @import '@/assets/popup.css'; */
</style>
