export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // 計算を無視するタグ一覧
    const notApplicableTags = [
      'HTML',
      'HEAD',
      'META',
      'BASE',
      'LINK',
      'TITLE',
      'SCRIPT',
      'TEMPLATE',
      'CANVAS',
      'STYLE',
      'SVG',
      'PATH',
      'IMG',
      'PICTURE',
      'IFRAME',
      'EMBED',
      'OBJECT',
      'PARAM',
      'VIDEO',
      'AUDIO',
      'SOURCE',
      'TRACK',
      'MAP',
      'AREA',
      'MATH',
      'BR',
      'WBR',
    ]
    // 子要素を持たない特殊タグ
    const noChildrenTags = ['INPUT', 'TEXTAREA', 'OPTION', 'KEYGEN', 'HR', 'BDI', 'BDO', 'COL']

    const htmlElement = document.documentElement
    const bodyElement = document.body

    let allBackgroundColors: {
      element: Element | null
      color: string
      area: number
      children: Element[]
    }[] = []

    chrome.runtime.onMessage.addListener((_request, _sender, sendResponse) => {
      allBackgroundColors = []

      const parentElements = getColorElement([htmlElement])
      totalElementArea(parentElements).forEach((v) => allBackgroundColors.push(v))
      checkedChildElementArea(parentElements)

      const otherArea = parentElements.reduce((sum, el) => sum + el.area, 0)

      const htmlBg = window.getComputedStyle(htmlElement).backgroundColor
      const bodyBg = window.getComputedStyle(bodyElement).backgroundColor

      const htmlArea =
        htmlBg && !htmlBg.includes('rgba') ? htmlElement.clientWidth * htmlElement.clientHeight : 0
      const bodyArea =
        bodyBg && !bodyBg.includes('rgba') ? bodyElement.clientWidth * bodyElement.clientHeight : 0

      if (htmlArea) {
        allBackgroundColors.push({
          element: htmlElement,
          color: rgbToColorCode(htmlBg),
          area: Math.max(window.innerWidth * window.innerHeight - otherArea, 0),
          children: Array.from(htmlElement.children),
        })
      } else if (!bodyArea && window.innerWidth * window.innerHeight - otherArea > 0) {
        allBackgroundColors.push({
          element: null,
          color: '#FFFFFF',
          area: Math.max(window.innerWidth * window.innerHeight - otherArea, 0),
          children: [],
        })
      }

      const elements = Array.from(document.getElementsByTagName('*')).filter(
        (el) => !notApplicableTags.includes(el.tagName.toUpperCase())
      )

      const allTextColors: { colorCode: string; area: number }[] = []

      elements.forEach((element) => {
        const color = window.getComputedStyle(element).color
        if (color && !color.includes('rgba')) {
          let textLength = 0
          const tag = element.tagName.toUpperCase()

          if (tag === 'INPUT') {
            textLength = (element as HTMLInputElement).value.length
          } else if (tag === 'BUTTON') {
            const el = element as HTMLButtonElement
            textLength = el.value?.length || el.textContent?.length || 0
          } else {
            textLength = element.textContent?.length || 0
          }

          if (textLength) {
            allTextColors.push({
              colorCode: rgbToColorCode(color),
              area: textLength,
            })
          }
        }
      })

      const backgroundColors = countColors(
        allBackgroundColors.map((c) => ({ color: c.color, value: c.area }))
      )
      const textColors = countColors(
        allTextColors.map((c) => ({ color: c.colorCode, value: c.area }))
      )

      sendResponse({ backgroundColors, textColors })
      return true
    })

    /**
     * RGBカラーコード文字列を #HEX形式に変換する
     * @param {string} rgb - RGB文字列 (例: 'rgb(255, 255, 255)')
     * @returns {string} HEXカラーコード(例: '#FFFFFF')
     */
    const rgbToColorCode = (rgb: string): string => {
      return (
        '#' +
        rgb
          .match(/\d+/g)!
          .map((v) => ('0' + parseInt(v).toString(16)).slice(-2))
          .join('')
          .toUpperCase()
      )
    }

    /**
     * 透明な要素の背景色を親から辿って見た目の色を推定する
     * @param {Element[]} element - 対象のHTML要素
     * @returns {string} カラーコード
     */
    const resolveEffectiveBackgroundColor = (element: Element): string => {
      let current: Element | null = element
      while (current) {
        const bg = window.getComputedStyle(current).backgroundColor
        const isTransparent = bg === 'transparent' || (bg.includes('rgba') && bg.endsWith(', 0)'))
        if (!isTransparent && bg !== '') {
          return rgbToColorCode(bg)
        }
        current = current.parentElement
      }
      return '#FFFFFF'
    }

    /**
     * 要素リストから、背景色が適用されている要素を再帰的に取得する
     * @param {Element[]} values - 対象のHTML要素リスト
     * @returns {Array<{ element: Element, color: string, area: number, children: Element[] }>}
     */
    const getColorElement = (values: Element[]) => {
      const elements: Element[] = []

      values.forEach((elm) => {
        const tag = elm.tagName.toUpperCase()
        const bg = window.getComputedStyle(elm).backgroundColor

        if (bg.includes('rgba') && (elm.children.length === 0 || noChildrenTags.includes(tag))) {
          return
        } else if (tag === 'HTML' || bg.includes('rgba')) {
          Array.from(elm.children).forEach((child) => {
            if (
              !notApplicableTags.includes(child.tagName.toUpperCase()) &&
              (child as HTMLElement).style.display !== 'none'
            ) {
              elements.push(child)
            }
          })
        } else if (!notApplicableTags.includes(tag)) {
          elements.push(elm)
        }
      })

      if (elements.some((el) => window.getComputedStyle(el).backgroundColor.includes('rgba'))) {
        return getColorElement(elements)
      }

      return elements.map((element) => ({
        element,
        color: resolveEffectiveBackgroundColor(element),
        area: element.clientWidth * element.clientHeight,
        children: Array.from(element.children).filter(
          (el) => !notApplicableTags.includes(el.tagName.toUpperCase())
        ),
      }))
    }

    /**
     * 各要素から子要素の面積を差し引いて、純粋な面積を算出する
     * @param {Array<{ element: Element, color: string, area: number, children: Element[] }>} elements
     * @returns 同じ配列を area 調整済みで返す
     */
    const totalElementArea = (
      elements: {
        element: Element
        color: string
        area: number
        children: Element[]
      }[]
    ) => {
      elements.forEach((el) => {
        if (
          el.element.children.length === 0 ||
          noChildrenTags.includes(el.element.tagName.toUpperCase())
        )
          return

        const childElements = getColorElement(Array.from(el.element.children))
        const total = childElements.reduce((sum, c) => sum + c.area, 0)
        el.area = Math.max(el.area - total, 0)
      })

      return elements
    }

    /**
     * 子要素の背景色面積を再帰的に収集し、全体色リストに加える
     * @param {Array<{ element: Element, color: string, area: number, children: Element[] }>} elements
     * @returns {Array} allBackgroundColors を返す（副作用あり）
     */
    const checkedChildElementArea = (
      elements: {
        element: Element
        color: string
        area: number
        children: Element[]
      }[]
    ) => {
      const checked: typeof elements = []

      elements.forEach((el) => {
        const children = totalElementArea(getColorElement(el.children))
        children.forEach((c) => {
          checked.push(c)
          allBackgroundColors.push(c)
        })
      })

      if (checked.length) checkedChildElementArea(checked)
      return allBackgroundColors
    }

    /**
     * 色コードごとに値（面積や文字数）を集計して統合する
     * @param {{ color: string, value: number }[]} data - 色と重みの配列
     * @returns {{ color: string, value: number }[]} 集計後の色データ
     */
    const countColors = (
      data: { color: string; value: number }[]
    ): { color: string; value: number }[] => {
      const count: Record<string, number> = {}

      data.forEach(({ color, value }) => {
        if (color) count[color] = (count[color] || 0) + value
      })

      return Object.entries(count).map(([color, value]) => ({ color, value }))
    }
  },
})
