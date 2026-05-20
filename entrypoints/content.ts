export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
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
      computedColor: string
      area: number
      children: Element[]
    }[] = []
    let authoredStyleLookupDeadline = 0

    chrome.runtime.onMessage.addListener((_request, _sender, sendResponse) => {
      allBackgroundColors = []
      cachedAuthoredStyleRules = null
      authoredStyleLookupDeadline = performance.now() + 500
      const authoredStyleRules = getAuthoredStyleRules()

      const parentElements = getColorElement([htmlElement])
      totalElementArea(parentElements).forEach((v) => allBackgroundColors.push(v))
      checkedChildElementArea(parentElements)

      const otherArea = parentElements.reduce((sum, el) => sum + el.area, 0)

      const htmlBg = window.getComputedStyle(htmlElement).backgroundColor
      const bodyBg = window.getComputedStyle(bodyElement).backgroundColor

      const htmlArea = isOpaqueBackgroundColor(htmlBg)
        ? htmlElement.clientWidth * htmlElement.clientHeight
        : 0
      const bodyArea = isOpaqueBackgroundColor(bodyBg)
        ? bodyElement.clientWidth * bodyElement.clientHeight
        : 0

      if (htmlArea) {
        allBackgroundColors.push({
          element: htmlElement,
          color: getDeclaredColor(htmlElement, 'background-color', authoredStyleRules) ?? htmlBg,
          computedColor: htmlBg,
          area: Math.max(window.innerWidth * window.innerHeight - otherArea, 0),
          children: Array.from(htmlElement.children),
        })
      } else if (!bodyArea && window.innerWidth * window.innerHeight - otherArea > 0) {
        allBackgroundColors.push({
          element: null,
          color: 'rgb(255, 255, 255)',
          computedColor: 'rgb(255, 255, 255)',
          area: Math.max(window.innerWidth * window.innerHeight - otherArea, 0),
          children: [],
        })
      }

      const elements = Array.from(document.getElementsByTagName('*')).filter(
        (el) => !notApplicableTags.includes(el.tagName.toUpperCase()) && isVisibleElement(el)
      )

      const allTextColors: { colorCode: string; computedColor: string; area: number }[] = []

      elements.forEach((element) => {
        const computedColor = window.getComputedStyle(element).color
        if (isVisibleColor(computedColor)) {
          const color = resolveInheritedDeclaredColor(element, authoredStyleRules) ?? computedColor
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
              colorCode: color,
              computedColor,
              area: textLength,
            })
          }
        }
      })

      const backgroundColors = countColors(
        allBackgroundColors.map((c) => ({
          color: c.color,
          computedColor: c.computedColor,
          value: c.area,
        }))
      )
      const textColors = countColors(
        allTextColors.map((c) => ({
          color: c.colorCode,
          computedColor: c.computedColor,
          value: c.area,
        }))
      )

      sendResponse({ backgroundColors, textColors })
      return true
    })

    /**
     * 透明扱いの色かどうかを判定する
     * @param {string} color - CSSの色文字列
     * @returns {boolean} 透明なら true
     */
    const isTransparentColor = (color: string): boolean => {
      const normalizedColor = color.trim().toLowerCase()
      if (!normalizedColor || normalizedColor === 'transparent') return true
      if (normalizedColor === 'rgba(0, 0, 0, 0)') return true
      if (/^rgba?\(.+[,/]\s*0(?:\.0+)?%?\s*\)$/.test(normalizedColor)) return true
      if (/^#(?:[0-9a-f]{3})?0{1,2}$/i.test(normalizedColor)) return true
      return false
    }

    /**
     * 表示される色として扱えるかどうかを判定する
     * @param {string} color - CSSの色文字列
     * @returns {boolean} 表示色なら true
     */
    const isVisibleColor = (color: string): boolean => {
      return Boolean(color) && !isTransparentColor(color)
    }

    /**
     * 半透明を含まない背景色として扱えるかどうかを判定する
     * @param {string} color - CSSの色文字列
     * @returns {boolean} 不透明な背景色なら true
     */
    const isOpaqueBackgroundColor = (color: string): boolean => {
      return isVisibleColor(color) && !hasAlphaChannel(color)
    }

    /**
     * 背景色としては親または子へ辿る必要があるかどうかを判定する
     * @param {string} color - CSSの色文字列
     * @returns {boolean} 透明または半透明なら true
     */
    const shouldTraverseBackgroundColor = (color: string): boolean => {
      return isTransparentColor(color) || hasAlphaChannel(color)
    }

    /**
     * アルファチャンネルを持つ色かどうかを判定する
     * @param {string} color - CSSの色文字列
     * @returns {boolean} アルファチャンネルがあれば true
     */
    const hasAlphaChannel = (color: string): boolean => {
      const normalizedColor = color.trim().toLowerCase()
      if (normalizedColor.startsWith('rgba(')) return true
      if (/^rgb\(.+\/\s*(?!1(?:\.0+)?\s*\)$|100%\s*\)$).+\)$/.test(normalizedColor)) {
        return true
      }

      const hex = normalizedColor.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/i)?.[1]
      if (!hex) return false

      const alpha = hex.length === 4 ? hex[3] + hex[3] : hex.slice(6, 8)
      return alpha.toLowerCase() !== 'ff'
    }

    /**
     * 画面上で見える要素かどうかを祖先要素まで含めて判定する
     * @param {Element} element - 対象のHTML要素
     * @returns {boolean} 見える要素なら true
     */
    const isVisibleElement = (element: Element): boolean => {
      let current: Element | null = element

      while (current) {
        const style = window.getComputedStyle(current)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse' ||
          Number(style.opacity) === 0
        ) {
          return false
        }
        current = current.parentElement
      }

      return true
    }

    /**
     * 透明な要素の背景色を親から辿って見た目の色を推定する
     * @param {Element[]} element - 対象のHTML要素
     * @returns {string} カラーコード
     */
    const resolveEffectiveBackgroundColor = (
      element: Element
    ): { color: string; computedColor: string } => {
      let current: Element | null = element
      while (current) {
        const bg = window.getComputedStyle(current).backgroundColor
        if (isOpaqueBackgroundColor(bg)) {
          return {
            color: getDeclaredColor(current, 'background-color', getAuthoredStyleRules()) ?? bg,
            computedColor: bg,
          }
        }
        current = current.parentElement
      }
      return { color: 'rgb(255, 255, 255)', computedColor: 'rgb(255, 255, 255)' }
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

        if (
          shouldTraverseBackgroundColor(bg) &&
          (elm.children.length === 0 || noChildrenTags.includes(tag))
        ) {
          return
        } else if (tag === 'HTML' || shouldTraverseBackgroundColor(bg)) {
          Array.from(elm.children).forEach((child) => {
            if (
              !notApplicableTags.includes(child.tagName.toUpperCase()) &&
              isVisibleElement(child)
            ) {
              elements.push(child)
            }
          })
        } else if (!notApplicableTags.includes(tag)) {
          elements.push(elm)
        }
      })

      if (
        elements.some((el) =>
          shouldTraverseBackgroundColor(window.getComputedStyle(el).backgroundColor)
        )
      ) {
        return getColorElement(elements)
      }

      return elements.map((element) => {
        const backgroundColor = resolveEffectiveBackgroundColor(element)
        return {
          element,
          color: backgroundColor.color,
          computedColor: backgroundColor.computedColor,
          area: element.clientWidth * element.clientHeight,
          children: Array.from(element.children).filter(
            (el) => !notApplicableTags.includes(el.tagName.toUpperCase()) && isVisibleElement(el)
          ),
        }
      })
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
        computedColor: string
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

        const childElements = getDirectVisibleBackgroundChildren(el.element, el.computedColor)
        const total = childElements.reduce((sum, c) => sum + c.area, 0)
        el.area = Math.max(el.area - total, 0)
      })

      return elements
    }

    /**
     * 直下の子要素から、親背景を覆う表示背景だけを取得する
     * @param {Element} element - 親のHTML要素
     * @param {string} parentColor - 親要素の背景色
     * @returns {{ area: number }[]} 親背景から差し引く子要素面積
     */
    const getDirectVisibleBackgroundChildren = (
      element: Element,
      parentColor: string
    ): { area: number }[] => {
      return Array.from(element.children)
        .filter((child) => {
          const tag = child.tagName.toUpperCase()
          const bg = window.getComputedStyle(child).backgroundColor
          return (
            !notApplicableTags.includes(tag) &&
            isVisibleElement(child) &&
            isOpaqueBackgroundColor(bg) &&
            bg !== parentColor
          )
        })
        .map((child) => ({
          area: child.clientWidth * child.clientHeight,
        }))
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
        computedColor: string
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
      data: { color: string; computedColor: string; value: number }[]
    ): { color: string; computedColor: string; value: number }[] => {
      const count = new Map<string, { color: string; computedColor: string; value: number }>()

      data.forEach(({ color, computedColor, value }) => {
        if (!color) return

        const key = `${color}\n${computedColor}`
        const current = count.get(key)
        if (current) {
          current.value += value
        } else {
          count.set(key, { color, computedColor, value })
        }
      })

      return Array.from(count.values())
    }

    type AuthoredStyleRule = {
      selectorText: string
      declarations: Map<string, string>
    }

    let cachedAuthoredStyleRules: AuthoredStyleRule[] | null = null

    /** ページ内CSSから、可能な範囲でCSSに書かれたままのプロパティ値を集める */
    const getAuthoredStyleRules = (): AuthoredStyleRule[] => {
      if (cachedAuthoredStyleRules) return cachedAuthoredStyleRules

      cachedAuthoredStyleRules = []

      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          cachedAuthoredStyleRules?.push(...parseCssRules(Array.from(styleSheet.cssRules)))
        } catch {
          // Cross-origin stylesheets may not expose cssRules.
        }
      })

      document.querySelectorAll('style').forEach((styleElement) => {
        cachedAuthoredStyleRules?.push(...parseCssText(styleElement.textContent ?? ''))
      })

      return cachedAuthoredStyleRules
    }

    /** CSSRuleListから色指定に関係するルールを集める */
    const parseCssRules = (rules: CSSRule[]): AuthoredStyleRule[] => {
      const authoredRules: AuthoredStyleRule[] = []

      rules.forEach((rule) => {
        if (rule instanceof CSSStyleRule) {
          const declarations = new Map<string, string>()
          ;['color', 'background-color'].forEach((property) => {
            const value = rule.style.getPropertyValue(property).trim()
            if (value) declarations.set(property, value)
          })

          const backgroundValue = rule.style.getPropertyValue('background').trim()
          if (backgroundValue && !declarations.has('background-color')) {
            declarations.set('background-color', backgroundValue)
          }

          if (declarations.size) {
            authoredRules.push({ selectorText: rule.selectorText, declarations })
          }
        } else if ('cssRules' in rule) {
          authoredRules.push(...parseCssRules(Array.from((rule as CSSGroupingRule).cssRules)))
        }
      })

      return authoredRules
    }

    /** styleタグ内の生CSSから色指定を取り出す */
    const parseCssText = (cssText: string): AuthoredStyleRule[] => {
      const rules: AuthoredStyleRule[] = []
      const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '')
      const rulePattern = /([^{}@][^{}]*)\{([^{}]*)\}/g
      let match: RegExpExecArray | null

      while ((match = rulePattern.exec(withoutComments))) {
        const declarations = getColorDeclarations(match[2])
        if (declarations.size) {
          rules.push({ selectorText: match[1].trim(), declarations })
        }
      }

      return rules
    }

    /** 宣言ブロックから色指定だけを取り出す */
    const getColorDeclarations = (declarationText: string): Map<string, string> => {
      const declarations = new Map<string, string>()

      declarationText.split(';').forEach((declaration) => {
        const separatorIndex = declaration.indexOf(':')
        if (separatorIndex < 0) return

        const property = declaration.slice(0, separatorIndex).trim().toLowerCase()
        const value = declaration.slice(separatorIndex + 1).trim()
        if (!value) return

        if (property === 'color' || property === 'background-color') {
          declarations.set(property, value)
        } else if (property === 'background' && !declarations.has('background-color')) {
          declarations.set('background-color', value)
        }
      })

      return declarations
    }

    /** 要素に指定されたCSS値を、可能な限り変換前の文字列で取得する */
    const getDeclaredColor = (
      element: Element,
      property: 'color' | 'background-color',
      authoredStyleRules: AuthoredStyleRule[]
    ): string | null => {
      const inlineColor = getColorDeclarations(element.getAttribute('style') ?? '').get(property)
      if (inlineColor) return inlineColor

      let matchedColor: string | null = null

      for (const rule of authoredStyleRules) {
        if (performance.now() > authoredStyleLookupDeadline) return matchedColor

        try {
          if (element.matches(rule.selectorText)) {
            matchedColor = rule.declarations.get(property) ?? matchedColor
          }
        } catch {
          // Unsupported selectors should not prevent color extraction.
        }
      }

      return matchedColor
    }

    /** 継承される文字色の指定値を祖先から辿って取得する */
    const resolveInheritedDeclaredColor = (
      element: Element,
      authoredStyleRules: AuthoredStyleRule[]
    ): string | null => {
      let current: Element | null = element

      while (current) {
        const declaredColor = getDeclaredColor(current, 'color', authoredStyleRules)
        if (declaredColor) return declaredColor

        current = current.parentElement
      }

      return null
    }
  },
})
