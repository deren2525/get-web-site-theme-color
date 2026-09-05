# Chrome ウェブストア掲載原稿

Chrome ウェブストアの管理画面へ設定する公開用原稿と確認項目。

## 日本語

### 名前候補

サイト配色チェッカー - Webページの色を抽出

既存ユーザーへの影響を抑える場合は、最初のリリースでは現在の名前を維持し、掲載画像と説明文だけを更新する。

### 概要

Webページの背景色と文字色をワンクリックで抽出。使用割合をグラフで確認し、HEX・RGB・HSL形式でコピーできます。

### 詳細説明

表示中のWebページで使われている背景色と文字色を抽出し、配色と使用割合をひと目で確認できます。デベロッパーツールを開かずに、気になる色をそのままコピーできます。

主な機能:

- 背景色と文字色を自動で抽出
- 背景色は表示面積、文字色は文字量をもとに使用割合を表示
- HEX、RGB/RGBA、HSL/HSLA、元のCSS表現を切り替え
- 色の一覧またはグラフをクリックしてカラーコードをコピー
- LAB、LCH、OKLab、OKLCH、Display-P3にも対応
- 閲覧データを収集せず、解析はブラウザ内だけで完結

Webデザイン、フロントエンド実装、配色調査、デザインリサーチに利用できます。

注意事項:

- Chromeの内部ページとChrome ウェブストアでは動作しません。
- 拡張機能の追加・更新直後は、既に開いていたページを一度再読み込みしてください。
- 画像内の色は対象外です。HTMLとCSSで指定された色を解析します。

## English

### Name candidate

Site Palette - Extract Website Colors

### Summary

Extract background and text colors from any web page. See usage in a chart and copy colors as HEX, RGB, HSL, or original CSS.

### Detailed description

Instantly extract the background and text colors used on the current web page. Understand its palette and color usage without opening DevTools, then copy any color with one click.

Key features:

- Extracts background and text colors from the current page
- Measures background colors by visible area and text colors by character count
- Switches between HEX, RGB/RGBA, HSL/HSLA, and original CSS values
- Copies a color by clicking the list or chart
- Supports LAB, LCH, OKLab, OKLCH, and Display-P3 colors
- Collects no browsing data; analysis stays in your browser

Useful for web design, frontend development, palette research, and design inspiration.

Notes:

- Chrome internal pages and the Chrome Web Store cannot be analyzed.
- Reload tabs that were already open when the extension was installed or updated.
- Colors inside images are not detected. The extension analyzes colors defined in HTML and CSS.

## 掲載素材チェックリスト

- 128x128アイコン: 小サイズでも判別でき、周囲に透明余白があるもの
- スクリーンショット: 最大5枚を日英それぞれ用意
  1. クリック一回でページの配色を抽出
  2. 背景色の使用割合
  3. 文字色の使用割合
  4. HEX・RGB・HSL・Originalの切り替え
  5. ワンクリックコピーとプライバシー訴求
- 小プロモーション画像: 440x280
- マーキー画像: 1400x560
- ウェブサイトURL: GitHubリポジトリまたは専用ランディングページ
- サポートURL: `https://github.com/deren2525/get-web-site-theme-color/issues/new/choose`
- カテゴリ: Developer Toolsを第一候補として管理画面で確認

更新履歴は詳細説明の先頭に置かず、各リリースのリリースノートへ記載する。
