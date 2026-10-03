import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'node:path'
export default defineConfig({plugins:[react()],resolve:{alias:{'./portal-auth':resolve('preview/identity.ts'),'@netlify/identity':resolve('preview/identity.ts')}},publicDir:false,build:{outDir:'preview-dist',cssCodeSplit:false,rollupOptions:{input:resolve('preview.html'),output:{inlineDynamicImports:true}},sourcemap:false}})
