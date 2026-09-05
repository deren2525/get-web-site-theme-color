import { expect, test } from '@playwright/test'
import { getExtensionMessage, launchExtension, openPopupForTarget } from './extension'

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
    const popupTitle = await getExtensionMessage(popup, 'Popup_title')
    const welcomeTitle = await getExtensionMessage(popup, 'Welcome_title')
    const gotItLabel = await getExtensionMessage(popup, 'Action_got_it')
    const textTabLabel = await getExtensionMessage(popup, 'Tab_text')

    await expect(popup.getByText(popupTitle)).toBeVisible()
    await expect(popup.getByText(welcomeTitle)).toBeVisible()
    await expect(popup.getByRole('button', { name: 'HEX' })).toBeVisible()
    await expect(popup.getByText('#123456')).toBeVisible()

    await popup.getByRole('button', { name: gotItLabel }).click()
    await expect(popup.getByText(welcomeTitle)).toBeHidden()

    await popup.getByRole('tab', { name: textTabLabel, exact: true }).click()
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
    const reviewTitle = await getExtensionMessage(fifthPopup, 'Review_title')
    const notNowLabel = await getExtensionMessage(fifthPopup, 'Action_not_now')
    await expect(fifthPopup.getByText(reviewTitle)).toBeVisible()
    await fifthPopup.getByRole('button', { name: notNowLabel }).click()
    await fifthPopup.close()

    const nextPopup = await openPopupForTarget(context, target)
    await expect(nextPopup.getByText(reviewTitle)).toBeHidden()
  } finally {
    await context.close()
  }
})
