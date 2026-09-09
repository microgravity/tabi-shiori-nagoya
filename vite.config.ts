import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

function pwaServiceWorkerPlugin(): Plugin {
  return {
    name: 'pwa-service-worker',
    generateBundle(_, bundle) {
      const buildAssets = Object.keys(bundle).filter((fileName) => fileName.startsWith('assets/')).sort()
      const version = createHash('sha256').update(buildAssets.join('\n')).digest('hex').slice(0, 12)
      const source = readFileSync(new URL('./src/service-worker.js', import.meta.url), 'utf8')
        .replace('__BUILD_VERSION__', JSON.stringify(version))
        .replace('__PRECACHE_ASSETS__', JSON.stringify(buildAssets))

      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

function socialImageMeta(html: string): string {
  const siteUrl = process.env.PUBLIC_SITE_URL
  if (!siteUrl) return html.replace('    <!-- social-image -->\n', '')
  try {
    const base = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`)
    if (base.protocol !== 'https:') return html.replace('    <!-- social-image -->\n', '')
    const imageUrl = new URL('og.png', base).href
    const tags = [
      `<meta property="og:image" content="${imageUrl}" />`,
      `<meta name="twitter:image" content="${imageUrl}" />`,
    ].join('\n    ')
    return html.replace('<!-- social-image -->', tags)
  } catch {
    return html.replace('    <!-- social-image -->\n', '')
  }
}

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), pwaServiceWorkerPlugin(), { name: 'social-image-meta', transformIndexHtml: socialImageMeta }],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
