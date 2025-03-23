<template>
  <div>
    <p class="title">WEB SITE THEME COLOR 🎨</p>

    <!-- タブ -->
    <ul class="tabs">
      <li class="tab" :class="{ 'is-active': activeTab === 0 }" @click="activeTab = 0">
        Background
      </li>
      <li class="tab" :class="{ 'is-active': activeTab === 1 }" @click="activeTab = 1">Text</li>
    </ul>

    <!-- パネル -->
    <div class="content">
      <div v-show="activeTab === 0" class="panel is-show">
        <div class="chart-container">
          <Loading v-if="loading" />
          <ColorChart
            v-else-if="!loading && backgroundColors.length"
            title="background Colors"
            :data="backgroundColors"
            @color-clicked="copyText"
          />
          <div v-else>取得できませんでした</div>
        </div>
        <ColorList :colors="backgroundColors" @color-clicked="copyText" />
      </div>

      <div v-show="activeTab === 1" class="panel is-show">
        <div class="chart-container">
          <Loading v-if="loading" />
          <ColorChart
            v-else-if="!loading && textColors.length"
            title="text Colors"
            :data="textColors"
            @color-clicked="copyText"
          />
          <div v-else>取得できませんでした</div>
        </div>
        <ColorList :colors="textColors" @color-clicked="copyText" />
      </div>
    </div>
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type ComponentPublicInstance, type Ref } from 'vue'
import ColorChart from '@/components/ColorChart.vue'
import ColorList from '@/components/ColorList.vue'
import Loading from '@/components/Loading.vue'
import Toast from '@/components/Toast.vue'

// 型定義
type ToastType = 'success' | 'error'

type ToastExpose = {
  showToast: (text: string, type?: ToastType, duration?: number) => void
}

type ChartColorData = {
  color: string
  value: number
}

const activeTab = ref<number>(0)
const loading = ref<boolean>(true)

// Canvas要素
const backgroundCanvas = ref<HTMLCanvasElement | null>(null)
const textCanvas = ref<HTMLCanvasElement | null>(null)

// Chart.js インスタンス
const backgroundChart = ref<any>(null)
const textChart = ref<any>(null)

// データ（背景色・文字色）
const backgroundColors: Ref<ChartColorData[]> = ref([])
const textColors: Ref<ChartColorData[]> = ref([])

// Toast のインスタンス
const toastRef = ref<ComponentPublicInstance<ToastExpose> | null>(null)

/**
 * カラーコードコピー＆トースト表示
 * @param text トーストメッセージ
 */
function copyText(text: string): void {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
    toastRef.value?.showToast(chrome.i18n.getMessage('Success_copy_color'), 'success')
  }
}

// ページロード時に実行される初期化処理
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
        console.error('❌ runtime.lastError:', chrome.runtime.lastError.message)
        toastRef.value?.showToast('❌ Content script not found in this tab.', 'error', 0)
        return
      } else {
        toastRef.value?.showToast('✅ Success! Content script responded!', 'success')
      }

      if (!currentTab.url) {
        toastRef.value?.showToast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0)
        return
      }

      const matches = currentTab.url.match(/(\w+):\/\/([\w.]+)\/(\S*)/)
      const isChromePage =
        matches && (matches[2] === 'chrome.google.com' || matches[1] === 'chrome')

      if (isChromePage) {
        toastRef.value?.showToast(
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

      if (!val || (!val.backgroundColors?.length && !val.textColors?.length)) {
        toastRef.value?.showToast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0)
        return
      }

      // ソートして格納
      val.backgroundColors.sort((a: ChartColorData, b: ChartColorData) => b.value - a.value)
      val.textColors.sort((a: ChartColorData, b: ChartColorData) => b.value - a.value)
      backgroundColors.value = val.backgroundColors
      textColors.value = val.textColors

      // グラフ描画
      backgroundCanvas.value?.addEventListener('click', (e: MouseEvent) => {
        const elements = backgroundChart.value?.getElementsAtEventForMode(
          e,
          'nearest',
          { intersect: true },
          false
        )
        if (elements?.length) {
          const index = elements[0].index
          copyText(backgroundColors.value[index].color)
        }
      })

      textCanvas.value?.addEventListener('click', (e: MouseEvent) => {
        const elements = textChart.value?.getElementsAtEventForMode(
          e,
          'nearest',
          { intersect: true },
          false
        )
        if (elements?.length) {
          const index = elements[0].index
          copyText(textColors.value[index].color)
        }
      })
    })
  })
})
</script>

<style scoped></style>
