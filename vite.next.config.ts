import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({plugins:[react(),tailwindcss()],publicDir:'assets',server:{allowedHosts:['terminal.local']},resolve:{alias:{'@':new URL('./src',import.meta.url).pathname}},define:{__WF_PREVIEW_REVIEW__:'false'},build:{outDir:'dist-next',target:'es2022',sourcemap:false,rollupOptions:{input:'index.html'}}})
