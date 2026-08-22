import { chromium, type BrowserContext, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import path from 'node:path'

export const extensionPath = path.resolve('.output/chrome-mv3')
const headless = process.env.PW_HEADLESS !== 'false'

export const launchExtension = async (): Promise<BrowserContext> => {
  return chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })
}

export const getExtensionId = async (): Promise<string> => {
  const normalizedPath = (await realpath(extensionPath)).normalize('NFC')
  const digest = createHash('sha256').update(normalizedPath).digest().subarray(0, 16)

  return Array.from(digest)
    .flatMap((byte) => [byte >> 4, byte & 0x0f])
    .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
    .join('')
}

export const openPopupForTarget = async (
  context: BrowserContext,
  target: Page,
  onError?: (message: string) => void
): Promise<Page> => {
  const popup = await context.newPage()
  if (onError) {
    popup.on('pageerror', (error) => onError(error.message))
    popup.on('console', (message) => {
      if (message.type() === 'error') onError(message.text())
    })
  }
  await target.bringToFront()
  await popup.goto(`chrome-extension://${await getExtensionId()}/popup.html`)
  return popup
}
