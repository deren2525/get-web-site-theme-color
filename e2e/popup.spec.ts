import { expect, test } from '@playwright/test'
import { launchExtension, openPopupForTarget } from './extension'

test('対象ページのテーマカラーをポップアップへ表示する', async () => {
  const context = await launchExtension()

  try {
    const target = await context.newPage()
    await target.route('http://theme-color.test/', async (route) => {
      await route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html>
          <html style="background: rgb(18, 52, 86)">
            <body><main><h1 style="color: rgb(250, 240, 230)">Theme sample</h1></main></body>
          </html>`,
      })
    })
    await target.goto('http://theme-color.test/')

    const popup = await openPopupForTarget(context, target)

    await expect(popup.getByText('サイト配色チェッカー')).toBeVisible()
    await expect(popup.getByText('ページの配色をワンクリックで確認')).toBeVisible()
    await expect(popup.getByRole('button', { name: 'HEX' })).toBeVisible()
    await expect(popup.getByText('#123456')).toBeVisible()

    await popup.getByRole('button', { name: '閉じる' }).click()
    await expect(popup.getByText('ページの配色をワンクリックで確認')).toBeHidden()

    await popup.getByRole('tab', { name: '文字色', exact: true }).click()
    await expect(popup.getByText('#FAF0E6')).toBeVisible()
  } finally {
    await context.close()
  }
})

test('配色取得の5回目に評価依頼を一度だけ表示する', async () => {
  const context = await launchExtension()

  try {
    const target = await context.newPage()
    await target.route('http://review-request.test/', async (route) => {
      await route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html>
          <html style="background: rgb(18, 52, 86)">
            <body><p style="color: rgb(250, 240, 230)">Theme sample</p></body>
          </html>`,
      })
    })
    await target.goto('http://review-request.test/')

    const setupPopup = await openPopupForTarget(context, target)
    await expect(setupPopup.getByText('#123456')).toBeVisible()
    await setupPopup.evaluate(() => {
      localStorage.setItem('successfulExtractionCount', '4')
      localStorage.removeItem('reviewRequestHandled')
    })
    await setupPopup.close()

    const fifthPopup = await openPopupForTarget(context, target)
    await expect(fifthPopup.getByText('この拡張機能は役に立ちましたか？')).toBeVisible()
    await fifthPopup.getByRole('button', { name: '今後表示しない' }).click()
    await fifthPopup.close()

    const nextPopup = await openPopupForTarget(context, target)
    await expect(nextPopup.getByText('この拡張機能は役に立ちましたか？')).toBeHidden()
  } finally {
    await context.close()
  }
})
