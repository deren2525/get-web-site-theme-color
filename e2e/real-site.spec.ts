import { expect, test } from '@playwright/test'
import { launchExtension, openPopupForTarget } from './extension'

test.skip(!process.env.REAL_SITE_E2E, '実サイト確認時だけ実行する')

test('実サイトからテーマカラーを取得し、実行時エラーを出さない', async () => {
  const context = await launchExtension()
  const errors: string[] = []

  try {
    const target = await context.newPage()
    await target.goto(process.env.REAL_SITE_URL ?? 'https://example.com/', {
      waitUntil: 'domcontentloaded',
    })

    const popup = await openPopupForTarget(context, target, (message) => errors.push(message))

    await expect(popup.getByText('WEB SITE THEME COLOR')).toBeVisible()
    await expect(popup.locator('[data-color]')).not.toHaveCount(0)

    await popup.getByText('Text', { exact: true }).click()
    await expect(popup.locator('[data-color]')).not.toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})
