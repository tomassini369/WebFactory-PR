import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'assets',
  // The visual review route (/preview-review) is compiled only into non-production builds.
  // Netlify sets CONTEXT=production for production deploys; previews, branch deploys and local dev keep it.
  define: {
    __WF_PREVIEW_REVIEW__: JSON.stringify(process.env.CONTEXT !== 'production')
  },
  build: {
    target: 'es2022',
    // Do not publish original client sources in downloadable .map files.
    sourcemap: false
  }
})
