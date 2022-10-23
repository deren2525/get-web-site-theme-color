const backgroundColorCtx = document.getElementById("backgroundColorChart");
const textColorCtx = document.getElementById("textColorChart");
const textColorList = document.getElementById("textColorList");
const backgroundColorList = document.getElementById("backgroundColorList");
const loadings = document.getElementsByClassName('loader');

// 背景カラー比率円グラフの生成
let backgroundColorChart = new Chart(backgroundColorCtx, {
  type: 'doughnut',
  data: {
    labels: [],
    datasets: []
  },
  options: {
    title: {
      display: true,
      text: ['Background Color'],
    },
    legend: {
      display: false,
    },
    maintainAspectRatio: false
  }
});

// テキストカラー比率円グラフの生成
let textColorChart = new Chart(textColorCtx, {
  type: 'doughnut',
  data: {
    labels: [],
    datasets: []
  },
  options: {
    title: {
      display: true,
      text: ['Text Color'],
    },
    legend: {
      display: false,
    },
    maintainAspectRatio: false
  }
});

function waitPageLoad(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // 現在開いているタブのページ情報を取得
    const currentTab = tabs[0];
    if (currentTab.status === 'complete') {
      // ロードが完了していたら、コールバックを実行
      callback(currentTab);
    } else {
      setTimeout(() => {
        // まだロード中だった場合はちょっと待って繰り返す
        waitPageLoad(callback);
      }, 50);
    }
  });
}

const backgroundColors = [];
const textColors = [];

waitPageLoad((currentTab) => {
  // tab
  const tabs = document.getElementsByClassName('tab');
  Array.from(document.getElementsByClassName('is-show')).forEach(element => {
    element.classList.remove('is-show');
  });
  document.getElementsByClassName('panel')[0].classList.add('is-show');
  tabs[0].classList.add('is-active');

  chrome.tabs.sendMessage(currentTab.id, {}, (val) => {
    for (let i = 0; i < loadings.length; i++) {
      loadings[i].style.display = 'none';
    }

    const matches = currentTab.url.match(/(\w+):\/\/([\w.]+)\/(\S*)/);
    const url = matches[0];
    const protocol = matches[1];
    const host = matches[2];

    if (matches) {
      if (host === 'chrome.google.com') {
        toast(chrome.i18n.getMessage('Error_access_chrome_web_store'), 'error', 0);
        return;
      } else if (protocol === 'chrome') {
        toast(chrome.i18n.getMessage('Error_access_chrome_pages'), 'error', 0);
        return;
      }

      if (!val || !val.backgroundColors.length && !val.textColors.length) {
        toast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0);
        return;
      }
    } else {
      if (!val || !val.backgroundColors.length && !val.textColors.length) {
        toast(chrome.i18n.getMessage('Error_access_reload'), 'error', 0);
        return;
      }
    }


    val.backgroundColors.sort((a, b) => {
      return b.value - a.value;
    });

    val.textColors.sort((a, b) => {
      return b.value - a.value;
    });

    // background
    // label
    backgroundColorChart.data.labels = val.backgroundColors.map(item => item.color);
    // data
    backgroundColorChart.data.datasets = [{
      backgroundColor: val.backgroundColors.map(item => item.color),
      data: val.backgroundColors.map(item => item.value)
    }];
    // tooltip label
    backgroundColorChart.options.tooltips.callbacks.label = ((tooltipItem, data) => {
      return data.labels[tooltipItem.index];
    });
    // color list
    val.backgroundColors.forEach(item => {
      backgroundColorList.insertAdjacentHTML("beforeend",
        `<div class="color-item">
        <div style="background: ${item.color};" data-color="${item.color}"></div>
        <p data-color="${item.color}">${item.color}</p>
        </div>`
      );
    })
    Array.from(backgroundColorList.getElementsByClassName('color-item')).forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e) return;
        // color code copy
        copyText(e.target.dataset.color || '');
      });
    });
    backgroundColorChart.update();

    // text
    // label
    textColorChart.data.labels = val.textColors.map(item => item.color);
    // data
    textColorChart.data.datasets = [{
      backgroundColor: val.textColors.map(item => item.color),
      data: val.textColors.map(item => item.value)
    }];
    // tooltip label
    textColorChart.options.tooltips.callbacks.label = ((tooltipItem, data) => {
      return data.labels[tooltipItem.index];
    });
    // color list
    val.textColors.forEach(item => {
      textColorList.insertAdjacentHTML("beforeend",
        `<div class="color-item">
        <div style="background: ${item.color};" data-color="${item.color}"></div>
        <p data-color="${item.color}">${item.color}</p>
        </div>`
      );
    })
    Array.from(textColorList.getElementsByClassName('color-item')).forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e) return;
        // color code copy
        copyText(e.target.dataset.color || '');
      });
    });
    textColorChart.update();
  });
});



backgroundColorCtx.addEventListener('click', e => {
  const elements = backgroundColorChart.getElementAtEvent(e);
  if (!elements.length) return;

  // color code copy
  copyText(elements[0]._model.label);
});

textColorCtx.addEventListener('click', e => {
  const elements = textColorChart.getElementAtEvent(e);
  if (!elements.length) return;

  // color code copy
  copyText(elements[0]._model.label);
});

// tab
Array.from(document.getElementsByClassName('tab')).forEach((tab, idx) => {
  tab.addEventListener('click', () => {
    document.getElementsByClassName('is-active')[0].classList.remove('is-active');
    tab.classList.add('is-active');
    document.getElementsByClassName('is-show')[0].classList.remove('is-show');
    document.getElementsByClassName('panel')[idx].classList.add('is-show');
  });
});

// toast
function toast(text, type, time) {
  const toast = document.querySelector("#toast");
  toast.innerHTML = `<p>${text}</p>`;
  toast.style.opacity = 0;

  if (type === 'error') {
    toast.classList.remove('success');
    toast.classList.add('error');
  } else {
    toast.classList.remove('error');
    toast.classList.add('success');
  }
  toast.style.opacity = 1;

  // disappear after a few seconds.
  if (time) {
    setTimeout(() => {
      toast.style.opacity = 0;
    }, time);
  }
}

// copy
function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    toast(chrome.i18n.getMessage('Success_copy_color'), 'success', 2000);
  }
}