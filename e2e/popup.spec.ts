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

    await expect(popup.getByText('WEB SITE THEME COLOR')).toBeVisible()
    await expect(popup.getByRole('button', { name: 'HEX' })).toBeVisible()
    await expect(popup.getByText('#123456')).toBeVisible()

    await popup.getByText('Text', { exact: true }).click()
    await expect(popup.getByText('#FAF0E6')).toBeVisible()
  } finally {
    await context.close()
  }
})
