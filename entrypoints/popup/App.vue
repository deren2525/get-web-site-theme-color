<template>
  <div>
    <p class="text-center m-0 font-bold pt-[16px] text-[14px] text-text">{{ extensionTitle }} 🎨</p>

    <section v-if="showReviewRequest && !pageError" class="c-review-card">
      <div>
        <p class="c-notice-title">{{ reviewTitle }}</p>
        <p class="c-notice-body">{{ reviewDescription }}</p>
      </div>
      <div class="c-review-actions">
        <button type="button" class="c-secondary-button" @click="dismissReviewRequest">
          {{ notNowLabel }}
        </button>
        <button type="button" class="c-primary-button" @click="openReviewPage">
          {{ writeReviewLabel }}
        </button>
      </div>
    </section>

    <section v-if="showWelcome && !pageError" class="c-notice-card" aria-labelledby="welcome-title">
      <div>
        <p id="welcome-title" class="c-notice-title">{{ welcomeTitle }}</p>
        <p class="c-notice-body">{{ welcomeDescription }}</p>
      </div>
      <button
        type="button"
        class="c-secondary-button shrink-0 whitespace-nowrap"
        @click="dismissWelcome"
      >
        {{ gotItLabel }}
      </button>
    </section>

    <section v-if="pageError" class="c-error-panel" role="alert">
      <p class="c-notice-title">{{ pageError.message }}</p>
      <p v-if="pageError.canReload" class="c-notice-body">{{ reloadDescription }}</p>
      <button
        v-if="pageError.canReload"
        type="button"
        class="c-primary-button"
        @click="reloadCurrentTab"
      >
        {{ reloadLabel }}
      </button>
    </section>

    <ul v-if="!pageError" class="flex justify-center p-0 mt-0" role="tablist">
      <li class="flex-1">
        <button
          class="c-tab"
          :class="{ active: activeTab === 0 }"
          role="tab"
          :aria-selected="activeTab === 0"
          @click="activeTab = 0"
        >
          {{ backgroundLabel }}
        </button>
      </li>
      <li class="flex-1">
        <button
          class="c-tab"
          :class="{ active: activeTab === 1 }"
          role="tab"
          :aria-selected="activeTab === 1"
          @click="activeTab = 1"
        >
          {{ textLabel }}
        </button>
      </li>
    </ul>

    <!-- パネル -->
    <div
      v-if="!pageError"
      class="w-full h-full px-[16px] pt-[12px] pb-[16px] box-border flex flex-col gap-[16px]"
    >
      <div class="c-mode-control" :aria-label="colorModeLabel">
        <button
          v-for="mode in colorModes"
          :key="mode.value"
          type="button"
          class="c-mode-button"
          :class="{ active: activeColorMode === mode.value }"
          @click="activeColorMode = mode.value"
        >
          {{ mode.label }}
        </button>
      </div>
      <p v-if="showColorConversionNotice" class="c-color-conversion-notice">
        {{ colorConversionNoticeText }}
      </p>

      <template v-if="activeTab === 0">
        <div class="chart-container">
          <Loading v-if="loading" />
          <p v-if="loading && showSlowLoadingNotice" class="c-loading-notice">
            {{ slowLoadingNoticeText }}
          </p>
          <ColorChart
            v-else-if="!loading && convertedBackgroundColors.length"
            :title="backgroundColorsLabel"
            :data="convertedBackgroundColors"
            @color-clicked="copyText"
          />
        </div>
        <ColorList :colors="convertedBackgroundColors" @color-clicked="copyText" />
      </template>

      <template v-else-if="activeTab === 1">
        <div class="chart-container">
          <Loading v-if="loading" />
          <p v-if="loading && showSlowLoadingNotice" class="c-loading-notice">
            {{ slowLoadingNoticeText }}
          </p>
          <ColorChart
            v-else-if="!loading && convertedTextColors.length"
            :title="textColorsLabel"
            :data="convertedTextColors"
            @color-clicked="copyText"
          />
        </div>
        <ColorList :colors="convertedTextColors" @color-clicked="copyText" />
      </template>
    </div>

    <footer class="c-footer">
      <button type="button" class="c-link-button" @click="openSupportPage">
        {{ supportLabel }}
      </button>
    </footer>

    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, type ComponentPublicInstance, type Ref } from 'vue'
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
  computedColor: string
  value: number
}

type DisplayColorData = {
  color: string
  displayColor: string
  previewColor: string
  copyColor: string
  originalColor?: string
  value: number
}

type ColorMode = 'original' | 'rgb' | 'hex' | 'hsl'

type PageError = {
  message: string
  canReload: boolean
}

type ParsedColor = {
  r: number
  g: number
  b: number
  a: number
}

const activeTab = ref<number>(0)
const activeColorMode = ref<ColorMode>('hex')
const loading = ref<boolean>(true)
const currentTabId = ref<number | null>(null)
const pageError = ref<PageError | null>(null)
const showWelcome = ref<boolean>(false)
const showReviewRequest = ref<boolean>(false)
const showSlowLoadingNotice = ref<boolean>(false)
const slowLoadingNoticeDelayMs = 2000
const reviewUrl =
  'https://chromewebstore.google.com/detail/get-web-site-theme-color/dbnbaoinihpfmkcmnlabklckngadaadm/reviews'
const supportUrl = 'https://github.com/deren2525/get-web-site-theme-color/issues/new/choose'
const successfulExtractionCountKey = 'successfulExtractionCount'
const welcomeDismissedKey = 'welcomeDismissed'
const reviewRequestHandledKey = 'reviewRequestHandled'
const reviewMinimumSuccessfulExtractions = 5
let slowLoadingTimer: number | null = null

const message = (key: string): string => chrome.i18n.getMessage(key)
const extensionTitle = computed(() => message('Popup_title'))
const welcomeTitle = computed(() => message('Welcome_title'))
const welcomeDescription = computed(() => message('Welcome_description'))
const gotItLabel = computed(() => message('Action_got_it'))
const reloadDescription = computed(() => message('Reload_description'))
const reloadLabel = computed(() => message('Action_reload'))
const reviewTitle = computed(() => message('Review_title'))
const reviewDescription = computed(() => message('Review_description'))
const notNowLabel = computed(() => message('Action_not_now'))
const writeReviewLabel = computed(() => message('Action_write_review'))
const supportLabel = computed(() => message('Action_support'))
const backgroundLabel = computed(() => message('Tab_background'))
const textLabel = computed(() => message('Tab_text'))
const backgroundColorsLabel = computed(() => message('Chart_background_colors'))
const textColorsLabel = computed(() => message('Chart_text_colors'))
const colorModeLabel = computed(() => message('Color_mode_label'))

const colorModes: { label: string; value: ColorMode }[] = [
  { label: 'HEX', value: 'hex' },
  { label: 'RGB/RGBA', value: 'rgb' },
  { label: 'HSL/HSLA', value: 'hsl' },
  { label: 'Original', value: 'original' },
]

// データ（背景色・文字色）
const backgroundColors: Ref<ChartColorData[]> = ref([])
const textColors: Ref<ChartColorData[]> = ref([])

// Toast のインスタンス
const toastRef = ref<ComponentPublicInstance<ToastExpose> | null>(null)

/** 背景色リストを選択中のカラーモードに変換する */
const convertedBackgroundColors = computed(() =>
  convertColors(backgroundColors.value, activeColorMode.value)
)

/** 文字色リストを選択中のカラーモードに変換する */
const convertedTextColors = computed(() => convertColors(textColors.value, activeColorMode.value))

/** 色域変換が必要な形式を別形式へ変換している場合だけ注意文言を表示する */
const showColorConversionNotice = computed(
  () =>
    activeColorMode.value !== 'original' &&
    [...backgroundColors.value, ...textColors.value].some(({ color }) =>
      needsColorConversionNotice(color)
    )
)

/** 色域変換時の注意文言を現在の言語から取得する */
const colorConversionNoticeText = computed(() => chrome.i18n.getMessage('Notice_color_conversion'))

/** 読み込みが長い場合の案内文を現在の言語から取得する */
const slowLoadingNoticeText = computed(() => chrome.i18n.getMessage('Notice_slow_loading'))

/** 色リスト全体を選択中の形式に変換し、同じ色になったものを再集計する */
const convertColors = (colors: ChartColorData[], mode: ColorMode): DisplayColorData[] => {
  const grouped = new Map<string, DisplayColorData>()

  colors.forEach(({ color, computedColor, value }) => {
    const convertedColor = convertColor(color, computedColor, mode)
    const previewColor = mode === 'original' ? computedColor : convertedColor
    const showOriginalVariable = mode === 'original' && isCssVariableColor(color)
    const displayColor = showOriginalVariable ? formatResolvedColor(computedColor) : convertedColor
    const copyColor = mode === 'original' ? displayColor : convertedColor
    const originalColor = showOriginalVariable ? color : undefined
    const key = `${displayColor}\n${previewColor}\n${copyColor}\n${originalColor ?? ''}`
    const current = grouped.get(key)

    if (current) {
      current.value += value
    } else {
      grouped.set(key, {
        color: convertedColor,
        displayColor,
        previewColor,
        copyColor,
        originalColor,
        value,
      })
    }
  })

  return Array.from(grouped.values()).sort((a, b) => b.value - a.value)
}

/** 1つの色文字列を選択中の表示形式に変換する */
const convertColor = (color: string, computedColor: string, mode: ColorMode): string => {
  if (mode === 'original') return color

  const parsedColor = parseColor(computedColor) ?? parseColor(color)
  if (!parsedColor) return computedColor || color

  if (mode === 'hex') return formatHexColor(parsedColor)
  if (mode === 'hsl') return formatHslColor(parsedColor)
  return formatRgbColor(parsedColor)
}

/** CSS変数参照の色指定かどうかを判定する */
const isCssVariableColor = (color: string): boolean => {
  return color.trim().toLowerCase().startsWith('var(')
}

/** Original表示時に併記・コピーする解決後カラーコードを作る */
const formatResolvedColor = (color: string): string => {
  const parsedColor = parseColor(color)
  if (!parsedColor) return color

  return formatHexColor(parsedColor)
}

/** HEX / RGB / RGBA / HSL / HSLA / LAB / LCH / OKLab / OKLCH / display-p3の色文字列を共通のRGBA値に変換する */
const parseColor = (color: string): ParsedColor | null => {
  const normalizedColor = color.trim()

  if (normalizedColor.startsWith('#')) {
    return parseHexColor(normalizedColor)
  }

  if (isHslColor(normalizedColor)) {
    return parseHslColor(normalizedColor)
  }

  if (isLabColor(normalizedColor)) {
    return parseLabColor(normalizedColor)
  }

  if (isLchColor(normalizedColor)) {
    return parseLchColor(normalizedColor)
  }

  if (isOklabColor(normalizedColor)) {
    return parseOklabColor(normalizedColor)
  }

  if (isOklchColor(normalizedColor)) {
    return parseOklchColor(normalizedColor)
  }

  if (isDisplayP3Color(normalizedColor)) {
    return parseDisplayP3Color(normalizedColor)
  }

  return parseRgbColor(normalizedColor)
}

/** RGB色域へ丸める可能性がある色形式かどうかを判定する */
const needsColorConversionNotice = (color: string): boolean => {
  return (
    isLabColor(color) ||
    isLchColor(color) ||
    isOklabColor(color) ||
    isOklchColor(color) ||
    isDisplayP3Color(color)
  )
}

/** HSL / HSLA形式の色文字列かどうかを判定する */
const isHslColor = (color: string): boolean => {
  const normalizedColor = color.trim().toLowerCase()
  return normalizedColor.startsWith('hsl(') || normalizedColor.startsWith('hsla(')
}

/** Lab形式の色文字列かどうかを判定する */
const isLabColor = (color: string): boolean => {
  return color.trim().toLowerCase().startsWith('lab(')
}

/** LCH形式の色文字列かどうかを判定する */
const isLchColor = (color: string): boolean => {
  return color.trim().toLowerCase().startsWith('lch(')
}

/** OKLab形式の色文字列かどうかを判定する */
const isOklabColor = (color: string): boolean => {
  return color.trim().toLowerCase().startsWith('oklab(')
}

/** OKLCH形式の色文字列かどうかを判定する */
const isOklchColor = (color: string): boolean => {
  return color.trim().toLowerCase().startsWith('oklch(')
}

/** color(display-p3 ...)形式の色文字列かどうかを判定する */
const isDisplayP3Color = (color: string): boolean => {
  return color.trim().toLowerCase().startsWith('color(display-p3')
}

/** HEX形式をRGBA値に変換する */
const parseHexColor = (color: string): ParsedColor | null => {
  const hex = color.slice(1)
  if (![3, 4, 6, 8].includes(hex.length) || !/^[\da-f]+$/i.test(hex)) return null

  const values = hex.length <= 4 ? hex.split('').map((value) => value + value) : hex.match(/.{2}/g)

  if (!values || values.length < 3) return null

  const r = parseInt(values[0]!, 16)
  const g = parseInt(values[1]!, 16)
  const b = parseInt(values[2]!, 16)
  const a = values[3] ? parseInt(values[3], 16) / 255 : 1

  return { r, g, b, a }
}

/** HSL / HSLA形式をRGBA値に変換する */
const parseHslColor = (color: string): ParsedColor | null => {
  const match = color.match(
    /^hsla?\(\s*([+-]?[\d.]+)(?:deg)?\s*(?:,|\s)\s*([+-]?[\d.]+%)\s*(?:,|\s)\s*([+-]?[\d.]+%)(?:\s*(?:,|\/)\s*([+-]?[\d.]+%?))?\s*\)$/i
  )
  if (!match) return null

  const hue = normalizeHue(parseFloat(match[1]!))
  const saturation = clamp(parseFloat(match[2]!) / 100, 0, 1)
  const lightness = clamp(parseFloat(match[3]!) / 100, 0, 1)
  const a = match[4] ? parseAlphaChannel(match[4]) : 1
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const huePrime = hue / 60
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1))
  const m = lightness - chroma / 2

  let r = 0
  let g = 0
  let b = 0

  if (huePrime < 1) {
    r = chroma
    g = x
  } else if (huePrime < 2) {
    r = x
    g = chroma
  } else if (huePrime < 3) {
    g = chroma
    b = x
  } else if (huePrime < 4) {
    g = x
    b = chroma
  } else if (huePrime < 5) {
    r = x
    b = chroma
  } else {
    r = chroma
    b = x
  }

  return {
    r: clamp(Math.round((r + m) * 255), 0, 255),
    g: clamp(Math.round((g + m) * 255), 0, 255),
    b: clamp(Math.round((b + m) * 255), 0, 255),
    a,
  }
}

/** RGB / RGBA形式をRGBA値に変換する */
const parseRgbColor = (color: string): ParsedColor | null => {
  const match = color.match(
    /^rgba?\(\s*([\d.]+%?)\s*(?:,|\s)\s*([\d.]+%?)\s*(?:,|\s)\s*([\d.]+%?)(?:\s*(?:,|\/)\s*([\d.]+%?))?\s*\)$/i
  )
  if (!match) return null

  const r = parseRgbChannel(match[1]!)
  const g = parseRgbChannel(match[2]!)
  const b = parseRgbChannel(match[3]!)
  const a = match[4] ? parseAlphaChannel(match[4]) : 1

  return { r, g, b, a }
}

/** Lab形式をsRGBのRGBA値に変換する */
const parseLabColor = (color: string): ParsedColor | null => {
  const match = color.match(
    /^lab\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
  )
  if (!match) return null

  const lightness = parseLabLightness(match[1]!)
  const a = parseLabAxis(match[2]!)
  const b = parseLabAxis(match[3]!)
  const alpha = match[4] ? parseAlphaChannel(match[4]) : 1

  return labToRgb(lightness, a, b, alpha)
}

/** LCH形式をLab経由でsRGBのRGBA値に変換する */
const parseLchColor = (color: string): ParsedColor | null => {
  const match = color.match(
    /^lch\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)\s+([+-]?[\d.]+)(?:deg)?(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
  )
  if (!match) return null

  const lightness = parseLabLightness(match[1]!)
  const chroma = parseLchChroma(match[2]!)
  const hueRadians = (parseFloat(match[3]!) * Math.PI) / 180
  const alpha = match[4] ? parseAlphaChannel(match[4]) : 1
  const a = chroma * Math.cos(hueRadians)
  const b = chroma * Math.sin(hueRadians)

  return labToRgb(lightness, a, b, alpha)
}

/** OKLab形式をsRGBのRGBA値に変換する */
const parseOklabColor = (color: string): ParsedColor | null => {
  const match = color.match(
    /^oklab\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
  )
  if (!match) return null

  const lightness = parseOklabLightness(match[1]!)
  const a = parseOklabAxis(match[2]!)
  const b = parseOklabAxis(match[3]!)
  const alpha = match[4] ? parseAlphaChannel(match[4]) : 1

  return oklabToRgb(lightness, a, b, alpha)
}

/** OKLCH形式をOKLab経由でsRGBのRGBA値に変換する */
const parseOklchColor = (color: string): ParsedColor | null => {
  const match = color.match(
    /^oklch\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)\s+([+-]?[\d.]+)(?:deg)?(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
  )
  if (!match) return null

  const lightness = parseOklchLightness(match[1]!)
  const chroma = parseOklchChroma(match[2]!)
  const hueRadians = (parseFloat(match[3]!) * Math.PI) / 180
  const a = match[4] ? parseAlphaChannel(match[4]) : 1
  const oklabA = chroma * Math.cos(hueRadians)
  const oklabB = chroma * Math.sin(hueRadians)

  return oklabToRgb(lightness, oklabA, oklabB, a)
}

/** color(display-p3 ...)形式をsRGBのRGBA値に変換する */
const parseDisplayP3Color = (color: string): ParsedColor | null => {
  const match = color.match(
    /^color\(\s*display-p3\s+([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)\s+([+-]?[\d.]+%?)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
  )
  if (!match) return null

  const r = parseColorFunctionChannel(match[1]!)
  const g = parseColorFunctionChannel(match[2]!)
  const b = parseColorFunctionChannel(match[3]!)
  const a = match[4] ? parseAlphaChannel(match[4]) : 1

  return displayP3ToRgb(r, g, b, a)
}

/** Lab / LCHのlightnessを0-100の範囲に正規化する */
const parseLabLightness = (value: string): number => {
  const lightness = value.endsWith('%') ? parseFloat(value) : parseFloat(value)
  return clamp(lightness, 0, 100)
}

/** Labのa/b軸を数値に変換する */
const parseLabAxis = (value: string): number => {
  const axis = value.endsWith('%') ? parseFloat(value) * 1.25 : parseFloat(value)
  return Number.isNaN(axis) ? 0 : axis
}

/** LCHのchromaを数値に変換する */
const parseLchChroma = (value: string): number => {
  const chroma = value.endsWith('%') ? parseFloat(value) * 1.5 : parseFloat(value)
  return Math.max(Number.isNaN(chroma) ? 0 : chroma, 0)
}

/** OKLabのlightnessを0-1の範囲に正規化する */
const parseOklabLightness = (value: string): number => {
  const lightness = value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
  return clamp(lightness, 0, 1)
}

/** OKLabのa/b軸を数値に変換する */
const parseOklabAxis = (value: string): number => {
  const axis = value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
  return Number.isNaN(axis) ? 0 : axis
}

/** OKLCHのlightnessを0-1の範囲に正規化する */
const parseOklchLightness = (value: string): number => {
  const lightness = value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
  return clamp(lightness, 0, 1)
}

/** OKLCHのchromaを数値に変換する */
const parseOklchChroma = (value: string): number => {
  const chroma = value.endsWith('%') ? parseFloat(value) / 100 : parseFloat(value)
  return Math.max(Number.isNaN(chroma) ? 0 : chroma, 0)
}

/** OKLabのL/a/b値をsRGBのRGBA値に変換する */
const oklabToRgb = (l: number, a: number, b: number, alpha: number): ParsedColor => {
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b

  const lCubed = lPrime ** 3
  const mCubed = mPrime ** 3
  const sCubed = sPrime ** 3

  const linearR = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed
  const linearG = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed
  const linearB = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed

  return {
    r: linearRgbToRgbChannel(linearR),
    g: linearRgbToRgbChannel(linearG),
    b: linearRgbToRgbChannel(linearB),
    a: alpha,
  }
}

/** LabのL/a/b値をsRGBのRGBA値に変換する */
const labToRgb = (l: number, a: number, b: number, alpha: number): ParsedColor => {
  const y = (l + 16) / 116
  const x = y + a / 500
  const z = y - b / 200

  const xyzD50 = {
    x: 0.96422 * labInverseTransfer(x),
    y: labInverseTransfer(y),
    z: 0.82521 * labInverseTransfer(z),
  }

  const xyzD65 = {
    x: 0.9555766 * xyzD50.x - 0.0230393 * xyzD50.y + 0.0631636 * xyzD50.z,
    y: -0.0282895 * xyzD50.x + 1.0099416 * xyzD50.y + 0.0210077 * xyzD50.z,
    z: 0.0122982 * xyzD50.x - 0.020483 * xyzD50.y + 1.3299098 * xyzD50.z,
  }

  return xyzD65ToRgb(xyzD65.x, xyzD65.y, xyzD65.z, alpha)
}

/** Lab変換用の非線形値をXYZ用の線形値へ戻す */
const labInverseTransfer = (value: number): number => {
  const delta = 6 / 29
  if (value > delta) return value ** 3

  return 3 * delta ** 2 * (value - 4 / 29)
}

/** display-p3のRGB値をsRGBのRGBA値に変換する */
const displayP3ToRgb = (r: number, g: number, b: number, alpha: number): ParsedColor => {
  const linearR = srgbToLinearRgbChannel(r)
  const linearG = srgbToLinearRgbChannel(g)
  const linearB = srgbToLinearRgbChannel(b)

  const x = 0.4865709486 * linearR + 0.2656676932 * linearG + 0.1982172852 * linearB
  const y = 0.2289745641 * linearR + 0.6917385218 * linearG + 0.0792869141 * linearB
  const z = 0.0451133819 * linearG + 1.0439443689 * linearB

  return xyzD65ToRgb(x, y, z, alpha)
}

/** XYZ D65値をsRGBのRGBA値に変換する */
const xyzD65ToRgb = (x: number, y: number, z: number, alpha: number): ParsedColor => {
  const linearR = 3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z
  const linearG = -0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z
  const linearB = 0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z

  return {
    r: linearRgbToRgbChannel(linearR),
    g: linearRgbToRgbChannel(linearG),
    b: linearRgbToRgbChannel(linearB),
    a: alpha,
  }
}

/** sRGB伝達関数の0-1値をlinear RGB値に変換する */
const srgbToLinearRgbChannel = (value: number): number => {
  const clampedValue = clamp(value, 0, 1)
  if (clampedValue <= 0.04045) return clampedValue / 12.92

  return ((clampedValue + 0.055) / 1.055) ** 2.4
}

/** linear RGBの0-1値をsRGBの0-255チャンネル値に変換する */
const linearRgbToRgbChannel = (value: number): number => {
  const clampedValue = clamp(value, 0, 1)
  const srgb =
    clampedValue <= 0.0031308 ? 12.92 * clampedValue : 1.055 * clampedValue ** (1 / 2.4) - 0.055

  return clamp(Math.round(srgb * 255), 0, 255)
}

/** RGBの各チャンネルを0-255の数値に変換する */
const parseRgbChannel = (value: string): number => {
  if (value.endsWith('%')) {
    return clamp(Math.round((parseFloat(value) / 100) * 255), 0, 255)
  }

  return clamp(Math.round(parseFloat(value)), 0, 255)
}

/** color()関数内のチャンネル値を0-1の数値に変換する */
const parseColorFunctionChannel = (value: string): number => {
  if (value.endsWith('%')) {
    return clamp(parseFloat(value) / 100, 0, 1)
  }

  return clamp(parseFloat(value), 0, 1)
}

/** alpha値を0-1の数値に変換する */
const parseAlphaChannel = (value: string): number => {
  if (value.endsWith('%')) {
    return clamp(parseFloat(value) / 100, 0, 1)
  }

  return clamp(parseFloat(value), 0, 1)
}

/** 数値を指定範囲内に収める */
const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

/** hueを0-360の範囲に正規化する */
const normalizeHue = (value: number): number => {
  if (Number.isNaN(value)) return 0

  return ((value % 360) + 360) % 360
}

/** RGBA値をHEX / HEXA形式の文字列に変換する */
const formatHexColor = ({ r, g, b, a }: ParsedColor): string => {
  const rgbHex = [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')
  if (a >= 1) return `#${rgbHex}`.toUpperCase()

  const alphaHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${rgbHex}${alphaHex}`.toUpperCase()
}

/** RGBA値をRGB / RGBA形式の文字列に変換する */
const formatRgbColor = ({ r, g, b, a }: ParsedColor): string => {
  if (a >= 1) return `rgb(${r}, ${g}, ${b})`

  const alpha = Number(a.toFixed(3)).toString()
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** RGBA値をHSL / HSLA形式の文字列に変換する */
const formatHslColor = ({ r, g, b, a }: ParsedColor): string => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  const delta = max - min

  let hue = 0
  let saturation = 0

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))

    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6)
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2)
    } else {
      hue = 60 * ((red - green) / delta + 4)
    }
  }

  const normalizedHue = Math.round(hue < 0 ? hue + 360 : hue)
  const saturationPercent = Math.round(saturation * 100)
  const lightnessPercent = Math.round(lightness * 100)

  if (a >= 1) return `hsl(${normalizedHue}, ${saturationPercent}%, ${lightnessPercent}%)`

  const alpha = Number(a.toFixed(3)).toString()
  return `hsla(${normalizedHue}, ${saturationPercent}%, ${lightnessPercent}%, ${alpha})`
}

/**
 * カラーコードコピー＆トースト表示
 * @param text トーストメッセージ
 */
const copyText = async (text: string): Promise<void> => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      toastRef.value?.showToast(message('Success_copy_color'), 'success')
    } catch {
      toastRef.value?.showToast(message('Error_copy_color'), 'error')
    }
  }
}

const updateReviewRequestVisibility = (successfulExtractionCount: number): void => {
  if (localStorage.getItem(reviewRequestHandledKey)) return

  showReviewRequest.value = successfulExtractionCount >= reviewMinimumSuccessfulExtractions
}

const recordSuccessfulExtraction = (): void => {
  const successfulExtractionCount =
    Number(localStorage.getItem(successfulExtractionCountKey) ?? '0') + 1
  localStorage.setItem(successfulExtractionCountKey, String(successfulExtractionCount))
  updateReviewRequestVisibility(successfulExtractionCount)
}

const dismissWelcome = (): void => {
  localStorage.setItem(welcomeDismissedKey, 'true')
  showWelcome.value = false
}

const dismissReviewRequest = (): void => {
  localStorage.setItem(reviewRequestHandledKey, 'dismissed')
  showReviewRequest.value = false
}

const openExternalPage = (url: string): void => {
  chrome.tabs.create({ url })
}

const openReviewPage = (): void => {
  localStorage.setItem(reviewRequestHandledKey, 'opened')
  showReviewRequest.value = false
  openExternalPage(reviewUrl)
}

const openSupportPage = (): void => openExternalPage(supportUrl)

const reloadCurrentTab = (): void => {
  if (currentTabId.value === null) return
  chrome.tabs.reload(currentTabId.value)
  window.close()
}

const setPageError = (messageKey: string, canReload = false): void => {
  pageError.value = { message: message(messageKey), canReload }
}

/** ローディング状態を終了し、長時間読み込み案内を閉じる */
const finishLoading = (): void => {
  loading.value = false
  showSlowLoadingNotice.value = false

  if (slowLoadingTimer) {
    window.clearTimeout(slowLoadingTimer)
    slowLoadingTimer = null
  }
}

// ページロード時に実行される初期化処理
onMounted(() => {
  showWelcome.value = !localStorage.getItem(welcomeDismissedKey)

  slowLoadingTimer = window.setTimeout(() => {
    if (loading.value) {
      showSlowLoadingNotice.value = true
    }
  }, slowLoadingNoticeDelayMs)

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]
    if (!currentTab?.id) {
      console.warn('No active tab found.')
      setPageError('Error_no_active_tab')
      finishLoading()
      return
    }
    currentTabId.value = currentTab.id

    chrome.tabs.sendMessage(currentTab.id, { type: 'GET_THEME_COLORS' }, (val) => {
      finishLoading()
      // エラーハンドリング
      if (chrome.runtime.lastError) {
        // URLが取得できない場合 → アクセスできないので再読み込みを促す
        if (!currentTab.url) {
          setPageError('Error_access_reload', true)
          return
        }

        // URLを分解
        const matches = currentTab.url.match(/(\w+):\/\/([\w.]+)\/(\S*)/)
        const protocol = matches?.[1] ?? ''
        const host = matches?.[2] ?? ''

        // Chrome のシステムページや拡張ページなど → content script は動かない
        const isChromePage =
          protocol === 'chrome' ||
          host === 'chrome.google.com' ||
          host === 'chromewebstore.google.com'

        if (isChromePage) {
          let messageKey = 'Error_access_chrome_pages'
          if (host === 'chromewebstore.google.com') {
            messageKey = 'Error_access_chrome_web_store'
          }
          // 対象ページでは使用できない旨を表示
          setPageError(messageKey)
          return
        }

        // 値がない、または背景色・文字色がどちらも取得できなかった場合 → 再読み込み指示
        if (!val || (!val.backgroundColors?.length && !val.textColors?.length)) {
          setPageError('Error_access_reload', true)
          return
        }

        // その他原因不明のエラー
        setPageError('Error_content_script_not_found', true)
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
      recordSuccessfulExtraction()
    })
  })
})

onUnmounted(() => {
  finishLoading()
})
</script>

<style scoped>
@reference '../../assets/tailwind.css';

.c-tab {
  @apply w-full border-0 bg-transparent text-tab-inactive cursor-pointer font-bold px-[24px] py-[12px] relative text-center whitespace-nowrap select-none transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)];
}
.c-tab.active {
  @apply text-primary;
}

.c-tab.active::after {
  content: '';
  @apply block absolute bottom-0 left-0 w-full h-[3px] bg-primary z-[1] pointer-events-none transition-all duration-200 ease-out;
}

.c-mode-control {
  @apply grid grid-cols-4 border border-primary rounded-[6px] overflow-hidden;
}

.c-mode-button {
  @apply h-[32px] text-[12px] font-bold text-primary bg-white border-0 border-r border-primary cursor-pointer transition-all duration-200;
}

.c-mode-button:last-child {
  @apply border-r-0;
}

.c-mode-button.active {
  @apply text-white bg-primary;
}

.c-color-conversion-notice {
  @apply m-0 border-l-[3px] border-status-error bg-white px-[10px] py-[8px] text-[12px] font-bold leading-[1.5] text-status-error;
}

.c-loading-notice {
  @apply mx-0 mb-[24px] mt-[-24px] text-center text-[12px] font-bold leading-[1.5] text-gray;
}

.c-notice-card,
.c-review-card,
.c-error-panel {
  @apply mx-[16px] mt-[12px] rounded-[8px] bg-white p-[12px] shadow-sm;
}

.c-notice-card,
.c-review-card {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.c-notice-card {
  @apply flex items-center gap-[12px] border-l-[3px] border-primary;
}

.c-error-panel {
  @apply mb-[12px] border-l-[3px] border-status-error;
}

.c-review-card {
  @apply border-l-[3px] border-primary;
}

.c-notice-title {
  @apply m-0 text-[13px] font-bold leading-[1.5] text-gray;
}

.c-notice-body {
  @apply mb-0 mt-[4px] text-[12px] leading-[1.5] text-gray;
}

.c-review-actions {
  @apply mt-[10px] flex justify-end gap-[8px];
}

.c-primary-button,
.c-secondary-button,
.c-link-button {
  @apply cursor-pointer rounded-[5px] border-0 px-[10px] py-[7px] text-[12px] font-bold;
}

.c-primary-button {
  @apply bg-primary text-white;
}

.c-secondary-button {
  @apply bg-background text-gray;
}

.c-footer {
  @apply flex justify-center pb-[10px];
}

.c-link-button {
  @apply bg-transparent text-gray underline;
}
</style>
