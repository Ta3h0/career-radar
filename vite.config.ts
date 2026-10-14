import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command, isPreview }) => ({
  // Keep localhost development at /; built Pages assets live under the repo URL.
  base: command === 'build' || isPreview ? '/career-radar/' : '/',
  plugins: [react()],
  // Only public UI assets belong in this directory. Never serve the repo root.
  publicDir: 'public',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      deny: ['.env', '.env.*', '**/*.{crt,pem,key}', '**/.git/**', '**/.agents/**', '**/.tools/**', '**/.setup/**', '**/server/**', '**/docs/**'],
    },
  },
}))
