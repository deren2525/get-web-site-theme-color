# GET WEB SITE THEME COLOR 🎨

<div align="center">
  <img src="https://user-images.githubusercontent.com/32975158/124476500-d8d0b700-dddd-11eb-8837-5f4abedbc46e.png" width="80%">
</div>

<br>
現在表示中のウェブサイトからテーマカラーを抽出し、色の使用率やカラーコードを簡単に確認できます。

[このChrome拡張機能をインストール](https://chromewebstore.google.com/detail/get-web-site-theme-color/dbnbaoinihpfmkcmnlabklckngadaadm)

バグの報告や改善案ご要望など[こちら](https://github.com/deren2525/get-web-site-theme-color/issues/new/choose)からお願いします。

## Documentation

- [プロダクト仕様](docs/product-specification.md)
- [色抽出・変換仕様](docs/color-extraction-specification.md)
- [指定色と計算済み色の保持方針](docs/decisions/001-authored-and-computed-colors.md)

## リリースノート

`develop`から`main`へのPRをマージすると、GitHub Releaseとタグを自動作成します。
バージョンはマージ時点の`wxt.config.ts`の`manifest.version`を使います。
同じバージョンのReleaseが存在する場合は上書きしません。

リリースPR本文の`## リリース内容`を変更内容へ、`## 対象PR`のPR一覧を関連PRへ挿入します。
対象PRがない場合は関連PRの見出しも省略します。リリース内容が空の場合は作成を中止します。
表示形式は[テンプレート](.github/release-notes-template.md)で変更できます。
導入前にマージ済みのPRからは自動作成されません。

## WXT + Vue 3

This template should help get you started developing with Vue 3 in WXT.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).
