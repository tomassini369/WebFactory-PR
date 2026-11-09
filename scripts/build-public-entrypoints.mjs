import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {publicPageMetadata} from '../src/public-page-metadata.ts'

// Preserve the same Vite entry point. Only the initial /crear head differs so
// link previews and crawlers receive the business landing metadata before JS.
const shell=await readFile('dist/index.html','utf8')
const metadata=publicPageMetadata('/crear','es')
const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
let html=shell.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escape(metadata.title)+'</title>')
for(const [attribute,key,value]of [
 ['name','description',metadata.description],
 ['property','og:title',metadata.title],
 ['property','og:description',metadata.description],
 ['property','og:url',metadata.url],
 ['name','twitter:title',metadata.title],
 ['name','twitter:description',metadata.description],
])html=html.replace(new RegExp('<meta '+attribute+'="'+key+'" content="[^"]*"\\s*/?>','i'),'<meta '+attribute+'="'+key+'" content="'+escape(value)+'" />')
html=html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i,'<link rel="canonical" href="'+metadata.url+'" />')
await mkdir('dist/crear',{recursive:true})
await writeFile('dist/crear/index.html',html)
console.log('Prepared /crear static entry with the same application bundle.')
