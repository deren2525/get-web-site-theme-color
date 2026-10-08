import { expect, test } from '@playwright/test'
import { getExtensionMessage, launchExtension, openPopupForTarget } from './extension'

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
    const popupTitle = await getExtensionMessage(popup, 'Popup_title')
    const textTabLabel = await getExtensionMessage(popup, 'Tab_text')

    await expect(popup.getByText(popupTitle)).toBeVisible()
    await expect(popup.locator('[data-color]')).not.toHaveCount(0)

    await popup.getByRole('tab', { name: textTabLabel, exact: true }).click()
    await expect(popup.locator('[data-color]')).not.toHaveCount(0)
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})
