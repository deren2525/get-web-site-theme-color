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
  'WBR'
];

const noChildrenTags = [
  'INPUT',
  'TEXTAREA',
  'OPTION',
  'KEYGEN',
  'HR',
  'BDI',
  'BDO',
  'COL'
];

let allBackgroundColors = []

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  allBackgroundColors = []
  const htmlElement = document.getElementsByTagName('html')[0];
  const bodyElement = document.getElementsByTagName('body')[0];

  // background color が設定されている、htmlタグから一番近いタグを取得
  const parentElements = getColorElement(Array.from([htmlElement]))
  totalElementArea(parentElements).forEach(v => allBackgroundColors.push(v));
  // 子要素取得
  checkedChildElementArea(parentElements);

  // ページ背景以外のコンテンツ面積取得
  const otherBackgroundColorArea = parentElements.reduce((sum, element) => {
    return sum + element.area;
  }, 0);

  // ページ背景の面積取得
  let htmlArea = window.getComputedStyle(htmlElement).backgroundColor && !window.getComputedStyle(htmlElement).backgroundColor.includes('rgba') ? htmlElement.clientWidth * htmlElement.clientHeight : 0;
  let bodyArea = window.getComputedStyle(bodyElement).backgroundColor && !window.getComputedStyle(bodyElement).backgroundColor.includes('rgba') ? bodyElement.clientWidth * bodyElement.clientHeight : 0;
  if (htmlArea) {
    allBackgroundColors.push({
      element: htmlElement,
      color: rgbToColorCode(window.getComputedStyle(htmlElement).backgroundColor),
      area: window.innerWidth * window.innerHeight > otherBackgroundColorArea ? window.innerWidth * window.innerHeight - otherBackgroundColorArea : 0,
      children: htmlElement.children
    });
  } else if (!bodyArea && window.innerWidth * window.innerHeight - otherBackgroundColorArea > 0) {
    allBackgroundColors.push({
      element: null,
      colorCode: '#FFFFFF',
      area: window.innerWidth * window.innerHeight > otherBackgroundColorArea ? window.innerWidth * window.innerHeight - otherBackgroundColorArea : 0,
      children: []
    });
  }

  let allTextColors = [];
  // text
  const elements = Array.from(document.getElementsByTagName('*')).filter(element => {
    return !notApplicableTags.includes(element.tagName.toUpperCase());
  })
  elements.forEach(element => {
    if (window.getComputedStyle(element).color && !window.getComputedStyle(element).color.includes('rgba')) {
      let textLength = 0;

      if (element.tagName.toUpperCase() === 'INPUT') {
        textLength = element.value.length
      } else if (element.tagName.toUpperCase() === 'BUTTON') {
        textLength = element.value.length || element.textContent.length
      } else {
        textLength = element.textContent.length
      }

      if (textLength) {
        allTextColors.push({
          colorCode: rgbToColorCode(window.getComputedStyle(element).color),
          area: textLength
        });
      }
    }
  });

  let textColorCount = {};
  let textColors = [];
  let backgroundColorCount = {};
  let backgroundColors = [];

  // background Color
  for (let i = 0; i < allBackgroundColors.length; i++) {
    let color = allBackgroundColors[i].color;
    backgroundColorCount[color] = (backgroundColorCount[color] || 0) + allBackgroundColors[i].area;
  }
  for (let i = 0; i < Object.keys(backgroundColorCount).length; i++) {
    backgroundColors.push({
      color: Object.keys(backgroundColorCount)[i],
      value: Object.values(backgroundColorCount)[i]
    })
  }

  // text Color
  for (let i = 0; i < allTextColors.length; i++) {
    let color = allTextColors[i].colorCode;
    textColorCount[color] = (textColorCount[color] || 0) + allTextColors[i].area;
  }
  for (let i = 0; i < Object.keys(textColorCount).length; i++) {
    textColors.push({
      color: Object.keys(textColorCount)[i],
      value: Object.values(textColorCount)[i]
    })
  }

  sendResponse({ backgroundColors, textColors });
  return;
});

/**
 * rgb -> 16進数
 * @param {*} rgb rgb形式 例: 'rgb(0,0,0)'
 * @returns 16進数のカラーコード
 */
function rgbToColorCode(rgb) {
  return "#" + (rgb.match(/\d+/g).map((a) => ("0" + parseInt(a).toString(16)).slice(-2)).join("")).toUpperCase();
}

/**
 * 背景色ありのElement抽出
 * @param {*} values 同じ層のElementたち
 * @returns 背景色があるElementたち
 */
function getColorElement(values) {
  let elements = []

  values.forEach(elm => {
    // 透明で子要素なし
    if (window.getComputedStyle(elm).backgroundColor.includes('rgba') && elm.children.length === 0 || noChildrenTags.includes(elm.tagName.toUpperCase())) {
      return;
      // 透明で子要素あり
    } else if (window.getComputedStyle(elm).backgroundColor.includes('rgba')) {
      for (let i = 0; i < elm.children.length; i++) {
        if (!notApplicableTags.includes(elm.children[i].tagName.toUpperCase()) && elm.children[i].style.display !== 'none') {
          elements.push(elm.children[i]);
        }
      }
      // 背景色あり
    } else if (!notApplicableTags.includes(elm.tagName.toUpperCase())) {
      elements.push(elm);
    }
  });

  if (elements.some(element => window.getComputedStyle(element).backgroundColor.includes('rgba'))) {
    // 背景色が透明のエレメントがなくなるまで繰り返す
    return getColorElement(elements);
  }

  return elements.length ?
    elements.map(element => {
      return {
        element,
        color: rgbToColorCode(window.getComputedStyle(element).backgroundColor),
        area: element.clientWidth * element.clientHeight,
        children: element.children && element.children.length ? Array.from(element.children).filter(elm => !notApplicableTags.includes(elm.tagName.toUpperCase())) : []
      }
    }) : [];
}

/**
 * 表示領域の計算
 * @param {*} elements 対象のエレメント（Array）
 * @returns 表示領域計算後の対象のエレメント（Array）
 */
function totalElementArea(elements) {
  if (!elements.length) return [];

  elements.forEach(elm => {
    // 子要素なし
    if (elm.element.children.length === 0 || noChildrenTags.includes(elm.element.tagName.toUpperCase())) {
      return;
    }

    const childElements = getColorElement(Array.from(elm.element.children))
    if (!childElements.length) return;

    const total = childElements.reduce((sum, element) => {
      return sum + element.area
    }, 0);
    elm.area = elm.area > total ? elm.area - total : 0;
  });

  return elements
}

function checkedChildElementArea(elements) {
  if (!elements.length) return;
  const checkedChildElements = []

  for (let i = 0; i < elements.length; i++) {
    const childElements = totalElementArea(Array.from(getColorElement(elements[i].children)));

    for (let ci = 0; ci < childElements.length; ci++) {
      checkedChildElements.push(childElements[ci]);
      allBackgroundColors.push(childElements[ci]);
    }
  }

  if (checkedChildElements.length) {
    return checkedChildElementArea(checkedChildElements);
  }
  return allBackgroundColors;
}
