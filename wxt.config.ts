// wxt.config.ts
import { defineConfig } from 'wxt'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  manifestVersion: 3,
  vite() {
    return {
      plugins: [vue()],
    }
  },
  manifest: {
    name: '__MSG_Name__',
    description: '__MSG_Description__',
    version: '2.3.0',
    default_locale: 'en',
    action: {
      default_title: '__MSG_Name__',
      default_popup: 'popup.html',
      default_icon: {
        '19': 'icon/icon.png',
      },
    },
    permissions: ['activeTab'],
    icons: {
      '16': 'icon/icon.png',
      '48': 'icon/icon.png',
      '128': 'icon/icon.png',
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
      sandbox: "sandbox allow-scripts; script-src 'self'; object-src 'self'",
    },
  },
})
