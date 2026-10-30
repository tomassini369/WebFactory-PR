import {execFileSync} from 'node:child_process'
import {writeNextDeployArtifacts} from './next-deploy-artifacts.mjs'
import {mkdirSync,writeFileSync,cpSync,existsSync} from 'node:fs'
const id='76c0eacd-27e4-41b9-99ac-5bd5dbe82879'
if(process.env.NETLIFY&&process.env.SITE_ID!==id)throw Error('Next may only build on its isolated experimental project. Original site build blocked before any action.')
execFileSync(process.execPath,['scripts/restore-hero-media.mjs'],{stdio:'inherit'})
mkdirSync('assets/next/business',{recursive:true})
cpSync('preview/fixtures/faro-norte/images','assets/next/business',{recursive:true})
execFileSync(process.execPath,['scripts/cache-template-images.mjs'],{stdio:'inherit'})
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.app.json'],{stdio:'inherit'})
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.next.config.ts'],{stdio:'inherit'})
writeFileSync('dist-next/robots.txt','User-agent: *\nDisallow: /\n')
writeFileSync('dist-next/experiment.json',JSON.stringify({product:'WebFactory PR Next',source:'234dd9361f413277b438e754b479e7e5681b036d',commit:process.env.COMMIT_REF||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),backend:'local-fixtures-only',productionConnected:false}))

writeNextDeployArtifacts('dist-next')
