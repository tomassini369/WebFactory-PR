import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'node:path'
export default defineConfig({plugins:[react()],resolve:{alias:{'@netlify/identity':resolve('preview/identity.ts')}},publicDir:false,build:{outDir:'home-preview-dist',cssCodeSplit:false,rollupOptions:{input:resolve('home-preview.html'),output:{inlineDynamicImports:true}},sourcemap:false}})
