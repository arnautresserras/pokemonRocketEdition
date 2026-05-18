import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // CI env var is set automatically by GitHub Actions
  base: process.env.CI ? '/pokemonRocketEdition/' : '/',
})
