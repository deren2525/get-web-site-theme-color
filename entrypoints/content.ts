export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
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

    const noChildrenTags = ['INPUT', 'TEXTAREA', 'OPTION', 'KEYGEN', 'HR', 'BDI', 'BDO', 'COL']

    const htmlElement = document.documentElement
    const bodyElement = document.body

    let allBackgroundColors: any[] = []

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
          children: htmlElement.children,
        })
      } else if (!bodyArea && window.innerWidth * window.innerHeight - otherArea > 0) {
        allBackgroundColors.push({
          element: null,
          colorCode: '#FFFFFF',
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

    function rgbToColorCode(rgb: string): string {
      return (
        '#' +
        rgb
          .match(/\d+/g)!
          .map((a) => ('0' + parseInt(a).toString(16)).slice(-2))
          .join('')
          .toUpperCase()
      )
    }

    function getColorElement(values: Element[]): any[] {
      const elements: Element[] = []

      values.forEach((elm) => {
        const bg = window.getComputedStyle(elm).backgroundColor
        const tag = elm.tagName.toUpperCase()
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
        color: rgbToColorCode(window.getComputedStyle(element).backgroundColor),
        area: element.clientWidth * element.clientHeight,
        children: Array.from(element.children).filter(
          (el) => !notApplicableTags.includes(el.tagName.toUpperCase())
        ),
      }))
    }

    function totalElementArea(elements: any[]): any[] {
      if (!elements.length) return []

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

    function checkedChildElementArea(elements: any[]) {
      if (!elements.length) return
      const checked: any[] = []

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

    function countColors(
      data: { color: string | undefined; value: number }[]
    ): { color: string; value: number }[] {
      const count: Record<string, number> = {}

      data.forEach(({ color, value }) => {
        if (color) {
          count[color] = (count[color] || 0) + value
        }
      })

      return Object.entries(count).map(([color, value]) => ({ color, value }))
    }
  },
})
