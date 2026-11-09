import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'node:path'
export default defineConfig({plugins:[react()],publicDir:false,build:{cssCodeSplit:false,rollupOptions:{input:resolve('preview/kiosk-skins.html'),output:{inlineDynamicImports:true}},sourcemap:false}})
