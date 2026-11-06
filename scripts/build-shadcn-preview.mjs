import {mkdir,readFile,writeFile} from 'node:fs/promises';
// Static preview entry avoids broad SPA catch-all rewrites and stays absent from production.
if(process.env.CONTEXT!=='production'){
 const html=(await readFile(new URL('../dist/index.html',import.meta.url),'utf8')).replace('</head>','<meta name="robots" content="noindex,nofollow">\n</head>');
 for(const route of ['shadcn-preview','glisse-preview']){
  const directory=new URL(`../dist/${route}/`,import.meta.url);
  await mkdir(directory,{recursive:true});await writeFile(new URL('index.html',directory),html);
 }
}
