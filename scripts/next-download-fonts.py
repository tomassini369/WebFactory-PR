import urllib.request,json,concurrent.futures,pathlib,hashlib,io
from fontTools.ttLib import TTFont
root=pathlib.Path(__file__).resolve().parents[1]; dest=root/'assets/next/fonts'; notices=root/'docs/next/font-licenses';notices.mkdir(exist_ok=True)
families={'Sora':'sora','Plus Jakarta Sans':'plusjakartasans','Space Grotesk':'spacegrotesk','Bricolage Grotesque':'bricolagegrotesque','Instrument Serif':'instrumentserif','Syne':'syne','Geist':'geist','Manrope':'manrope','DM Sans':'dmsans','Figtree':'figtree','Outfit':'outfit','Fraunces':'fraunces','Newsreader':'newsreader','Bodoni Moda':'bodonimoda','JetBrains Mono':'jetbrainsmono'}
def get(url):
 for i in range(2):
  try:return urllib.request.urlopen(url,timeout=35).read()
  except Exception:
   if i:raise
def work(item):
 name,slug=item; base='https://api.github.com/repos/google/fonts/contents/ofl/'+slug
 listing=json.loads(get(base)); license=next(x for x in listing if x['name']=='OFL.txt');licensebytes=get(license['download_url']);assert b'SIL OPEN FONT LICENSE Version 1.1' in licensebytes
 files=[x for x in listing if x['name'].endswith('.ttf') and 'Italic' not in x['name']];f=files[0];data=get(f['download_url']);font=TTFont(io.BytesIO(data)); cmap=font.getBestCmap();assert all(ord(c) in cmap for c in 'áéíóúñü¿¡ÁÉÍÓÚÑÜ')
 # Preserve outlines and names. Only convert the container to WOFF2, no subsetting.
 font.flavor='woff2';p=dest/(slug+'.woff2');font.save(p);(notices/(slug+'-OFL.txt')).write_bytes(licensebytes)
 return {'family':name,'slug':slug,'source':f['download_url'],'sourceBlobSha':f['sha'],'sourceSha256':hashlib.sha256(data).hexdigest(),'woff2Sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'licenseSource':license['download_url'],'licenseSha256':hashlib.sha256(licensebytes).hexdigest(),'license':'OFL-1.1','spanishEnglishGlyphsVerified':True,'file':'/next/fonts/'+slug+'.woff2'}
rows=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as e:
 for f in e.map(work,families.items()):rows.append(f);print(f['family'],flush=True)
(root/'docs/next/fonts.json').write_text(json.dumps(rows,indent=2)+'\n')
(root/'src/next/fonts.css').write_text('\n'.join('@font-face{font-family:"'+r['family']+'";src:url("'+r['file']+'") format("woff2");font-weight:'+('400' if r['family']=='Instrument Serif' else '100 900')+';font-style:normal;font-display:swap}' for r in rows))
