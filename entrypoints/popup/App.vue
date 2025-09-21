<template>
  <div>
    <p class="text-center m-0 font-bold pt-[16px] text-[14px] text-text">WEB SITE THEME COLOR 🎨</p>

    <ul class="flex justify-center p-0 mt-0">
      <li class="c-tab" :class="{ active: activeTab === 0 }" @click="activeTab = 0">Background</li>
      <li class="c-tab" :class="{ active: activeTab === 1 }" @click="activeTab = 1">Text</li>
    </ul>

    <!-- パネル -->
    <div class="w-full h-full px-[16px] pt-[12px] pb-[16px] box-border flex flex-col gap-[16px]">
      <template v-if="activeTab === 0">
        <div class="chart-container">
          <Loading v-if="loading" />
          <ColorChart
            v-else-if="!loading && backgroundColors.length"
            title="Background Colors"
            :data="backgroundColors"
            @color-clicked="copyText"
          />
        </div>
        <ColorList :colors="backgroundColors" @color-clicked="copyText" />
      </template>

      <template v-else-if="activeTab === 1">
        <div class="chart-container">
          <Loading v-if="loading" />
          <ColorChart
            v-else-if="!loading && textColors.length"
            title="Text Colors"
            :data="textColors"
            @color-clicked="copyText"
          />
        </div>
        <ColorList :colors="textColors" @color-clicked="copyText" />
      </template>
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
      // エラーハンドリング
      if (chrome.runtime.lastError) {
        // URLが取得できない場合 → アクセスできないので再読み込みを促す
        if (!currentTab.url) {
          toastRef.value?.showToast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0)
          return
        }

        const urlString = currentTab.url ?? ''
        let protocol = ''
        let host = ''

        if (urlString) {
          try {
            const parsedUrl = new URL(urlString)
            protocol = parsedUrl.protocol.replace(':', '')
            host = parsedUrl.host
          } catch (_error) {
            if (urlString.startsWith('file://')) {
              protocol = 'file'
            }
          }
        }

        // Chrome のシステムページや拡張ページなど → content script は動かない
        const isChromePage =
          protocol === 'chrome' ||
          host === 'chrome.google.com' ||
          host === 'chromewebstore.google.com'

        if (protocol === 'file') {
          toastRef.value?.showToast(
            chrome.i18n.getMessage('Error_access_file_pages'),
            'error',
            0
          )
          return
        }

        if (isChromePage) {
          let messageKey = 'Error_access_chrome_pages'
          if (host === 'chromewebstore.google.com') {
            messageKey = 'Error_access_chrome_web_store'
          }
          // 対象ページでは使用できない旨を表示
          toastRef.value?.showToast(chrome.i18n.getMessage(messageKey), 'error', 0)
          return
        }

        // 値がない、または背景色・文字色がどちらも取得できなかった場合 → 再読み込み指示
        if (!val || (!val.backgroundColors?.length && !val.textColors?.length)) {
          toastRef.value?.showToast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0)
          return
        }

        // その他原因不明のエラー
        toastRef.value?.showToast(
          chrome.i18n.getMessage('Error_content_script_not_found'),
          'error',
          0
        )
        return
      } else {
        toastRef.value?.showToast(
          chrome.i18n.getMessage('Success_content_script_responded'),
          'success'
        )
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

<style scoped>
.c-tab {
  @apply text-tab-inactive cursor-pointer flex-1 font-bold order-[-1] px-[24px] py-[12px] relative text-center whitespace-nowrap list-none select-none transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)];
}
.c-tab.active {
  @apply text-primary;
}

.c-tab.active::after {
  content: '';
  @apply block absolute bottom-0 left-0 w-full h-[3px] bg-primary z-[1] pointer-events-none transition-all duration-200 ease-out;
}
</style>
