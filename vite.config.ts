import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the built asset URLs work under a GitHub Pages
  // project path (https://<user>.github.io/<repo>/).
  base: './',
  plugins: [react(), tailwindcss()],
})
