"""Exercise real portal components/handlers with isolated HTTP fixtures only."""
import argparse, copy, itertools, json, os
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5173')
parser.add_argument('--output',default='/tmp/wf-glisse-personalization')
parser.add_argument('--quick',action='store_true')
parser.add_argument('--engine',choices=['chromium','webkit','both'],default='both')
args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
SITE={'siteId':'glisse-fixture','slug':'glisse-fixture','status':'published','revision':1,'business':{'name':'Isolated Glisse fixture','category':'Retail','phone':'','locations':[]},'design':{'primary':'#0B1529','secondary':'#3C86F6','style':'Modern'},'catalog':[],'employees':[],'hours':{},'members':[],'settings':{'locale':'en','timezone':'America/Puerto_Rico','currency':'USD'},'paymentRules':{},'googleCalendar':{},'features':{},'servicePlan':{'code':'complimentary','billingModel':'complimentary','subscriptionStatus':'complimentary'}}
CAPS=['overview','website','share','orders','bookings','customers','catalog','employees','payments','pos','collect','marketing','analytics','integrations','settings','billing','refunds','kitchen']
PREFS={'paletteId':'','background':'room','backgroundNatural':False,'glassStyle':'classic','blur':34,'alpha':.66,'dim':.36,'motion':1,'accent':'#6aa8ff','cardDepth':'soft','buttonDepth':'soft'}
rows=[]
def select(page,name):
 drawer=page.locator('.gd-navigation')
 if not drawer.is_visible():page.locator('.ca-mobile-menu-toggle').click()
 drawer.get_by_role('button',name=name,exact=True).click()
with sync_playwright() as p:
 for engine in (['chromium','webkit'] if args.engine=='both' else [args.engine]):
  options={'headless':True}
  executable='/usr/bin/chromium' if engine=='chromium' else '/workspace/.playwright/webkit-2336/pw_run.sh'
  if Path(executable).exists():options['executable_path']=executable
  if engine=='chromium':options['args']=['--no-sandbox']
  if args.base.startswith('https://'):options['proxy']={'server':os.environ['HTTPS_PROXY']}
  browser=getattr(p,engine).launch(**options)
  cases=[('owner',w,lang,theme) for w,lang,theme in itertools.product([390] if args.quick else [320,375,390,430,768,1024,1440],['es'] if args.quick else ['es','en'],['dark'] if args.quick else ['light','dark'])]+[('employee',390,'es','dark')]
  for role,width,lang,theme in cases:
   row={'engine':engine,'role':role,'width':width,'lang':lang,'theme':theme,'errors':[],'unexpected_requests':[],'failed_requests':[],'http_errors':[],'writes':[]}
   prefs=copy.deepcopy(PREFS);profile={'name':'Fixture','phone':'','language':None,'theme':None};presets=[];version=1;fail_next=True
   context=browser.new_context(viewport={'width':width,'height':900},has_touch=width<768,reduced_motion='reduce',service_workers='block')
   context.add_init_script('if(!localStorage.getItem("webfactory-language"))localStorage.setItem("webfactory-language",'+json.dumps(lang)+');if(!localStorage.getItem("webfactory-theme-v2"))localStorage.setItem("webfactory-theme-v2",'+json.dumps(theme)+');window.__rejections=[];addEventListener("unhandledrejection",e=>__rejections.push(String(e.reason)));')
   def handler(route):
    global prefs,profile,presets,version,fail_next
    req=route.request;url=urlparse(req.url);name=url.path.rsplit('/',1)[-1];query=parse_qs(url.query)
    if '/.netlify/functions/' not in url.path:return route.continue_()
    body=req.post_data_json if req.method not in ['GET','HEAD','OPTIONS'] and req.post_data else {}
    status=200;data={'ok':True,'orders':[],'bookings':[],'configuration':[],'policies':{},'entries':[]}
    if name=='portal-session':data={'ok':True,'user':{'id':'glisse-user','email':'glisse@example.invalid','mfa':{'required':False}}}
    elif name=='client-admin':
     assert req.method=='GET'
     data={'ok':True,'site':SITE,'membership':{'role':role,'capabilities':CAPS if role=='owner' else ['overview','bookings']}} if query.get('siteId') else {'ok':True,'sites':[{'siteId':SITE['siteId'],'slug':SITE['slug'],'businessName':SITE['business']['name'],'status':'published'}]}
    elif name=='dashboard-appearance':
     assert query.get('siteId')==[SITE['siteId']]
     if req.method=='PUT':
      assert req.headers.get('x-appearance-version')==str(version)
      row['writes'].append({'endpoint':name,'value':body,'status':409 if fail_next else 200})
      if fail_next:status=409;data={'error':'conflict'};fail_next=False
      else:prefs=body;version+=1
     elif req.method!='GET':raise AssertionError('Unexpected appearance mutation')
     if status==200:data={'ok':True,'prefs':prefs,'hasCustom':False,'revision':version,'version':str(version)}
    elif name=='portal-profile':
     if req.method=='PUT':
      assert set(body)<= {'language','theme'}
      profile.update(body)
     elif req.method!='GET':raise AssertionError('Unexpected profile mutation')
     data={'ok':True,'profile':profile,'hasPhoto':False,'revision':1,'version':'profile-1'}
    elif name=='client-kiosk':
     assert role=='owner','Employee attempted kiosk API'
     if req.method=='POST':
      assert body.get('action')=='appearance_presets' and body.get('siteId')==SITE['siteId']
      presets=body['presets'];row['writes'].append({'endpoint':name,'value':body,'status':200})
     elif req.method!='GET':raise AssertionError('Unexpected kiosk mutation')
     data={'ok':True,'enabled':True,'touchKeyboard':False,'checkoutMode':'screen','bookingModes':{'newBookings':False,'existingBookings':False},'devices':[],'appearance':{},'presets':presets,'backgroundAssets':[]}
    elif req.method not in ['GET','HEAD','OPTIONS']:
     row['unexpected_requests'].append({'url':req.url,'method':req.method});return route.abort()
    route.fulfill(status=status,json=data)
   context.route('**/*',handler);page=context.new_page();page.set_default_timeout(12000)
   page.on('pageerror',lambda error:row['errors'].append({'message':str(error),'stack':error.stack}))
   # A deliberately injected 409 is the expected save-conflict test.
   page.on('console',lambda m:row['errors'].append(m.text) if m.type=='error' and not ('409' in m.text and '/.netlify/functions/dashboard-appearance' in m.location.get('url','')) else None)
   page.on('response',lambda response:row['http_errors'].append({'url':response.url,'status':response.status}) if response.status>=400 and not (response.status==409 and '/.netlify/functions/dashboard-appearance' in response.url) else None)
   page.on('requestfailed',lambda r:row['failed_requests'].append({'url':r.url,'error':r.failure}))
   es=lang=='es';t=lambda a,b:a if es else b
   try:
    page.goto(args.base+'/client-admin');page.wait_for_load_state('networkidle');select(page,t('Personalización','Personalization'))
    tabs=page.locator('.wf-personalization-areas')
    expect(tabs.get_by_role('tab',name=t('Portal y POS','Portal and POS'),exact=True)).to_be_visible()
    if role=='employee':
     expect(tabs.get_by_role('tab')).to_have_count(1)
     expect(page.locator('.kiosk-appearance-settings')).to_have_count(0)
     assert not row['writes'] and not row['errors'] and not row['failed_requests'] and not row['http_errors'] and not row['unexpected_requests'] and not page.evaluate('window.__rejections'),row
     row['passed']=True;rows.append(row);context.close();print(engine,role,width,lang,theme,True,flush=True);continue
    expect(tabs.get_by_role('tab')).to_have_count(3)
    assert tabs.evaluate('e=>e.scrollWidth<=e.clientWidth+1'), 'Area tabs overflow their container'
    if width==390:tabs.screenshot(path=str(out/f'{engine}-{lang}-{theme}-areas.png'))
    expect(page.locator('.gd-appearance fieldset').last).to_be_enabled()
    search=page.get_by_label(t('Buscar fondos','Search wallpapers'),exact=True)
    search.fill(t('violeta','violet'));expect(page.locator('.gd-wallpaper-choice')).to_have_count(1)
    page.get_by_role('button',name=t('Paisaje violeta Vista previa','Violet landscape Preview'),exact=True).click()
    search.fill('zzzz');expect(page.locator('.gd-wallpaper-choice')).to_have_count(0)
    page.get_by_role('button',name=t('Borrar búsqueda de fondos','Clear wallpaper search'),exact=True).click()
    expect(page.locator('.gd-wallpaper-choice')).to_have_count(3)
    natural=page.get_by_role('switch',name=t('Mantener imagen de fondo original (sin oscurecer)','Keep original background image (no dimming)'),exact=True)
    natural.click();expect(page.get_by_role('slider',name=t('Oscurecimiento del fondo','Wallpaper dim'),exact=True)).to_be_disabled();natural.click()
    blur=page.get_by_role('slider',name=t('Desenfoque','Blur'),exact=True);blur.focus();blur.press('Home');blur.press('ArrowRight');expect(blur).to_have_value('1')
    scene=page.locator('.gd-appearance .wf-glisse-live-scene');expect(scene).to_be_visible()
    expect(scene.locator('[data-glisse-backdrop]')).to_have_css('background-image',__import__('re').compile('portal-violet-landscape'))
    save=page.get_by_role('button',name=t('Guardar desde vista Glass','Save from Glass preview'),exact=True)
    save.click();expect(page.get_by_role('alert')).to_contain_text(t('otro dispositivo','another device'));expect(blur).to_have_value('1')
    page.get_by_role('button',name=t('Aplicar y guardar','Apply and save'),exact=True).click()
    expect(page.get_by_role('status').filter(has_text=t('Apariencia guardada.','Appearance saved.'))).to_be_visible()
    assert prefs['blur']==1 and prefs['background']=='landscape'
    menu=page.get_by_role('button',name=t('Opciones de vista Glass','Glass preview options'),exact=True)
    menu.click();page.get_by_role('menuitem',name=t('Ocultar vista Glass','Hide Glass preview')).click();expect(scene).to_have_count(0)
    menu.click();page.get_by_role('menuitem',name=t('Mostrar vista Glass','Show Glass preview')).click();expect(scene).to_be_visible()
    # Existing personal settings, synchronized to the existing profile endpoint.
    theme_switch=page.get_by_role('switch',name=t('Modo oscuro','Dark mode'),exact=True)
    theme_switch.click();expect(page.locator('html')).to_have_attribute('data-wf-theme','light' if theme=='dark' else 'dark');theme_switch.click()
    language=page.get_by_role('radiogroup',name=t('Idioma','Language'),exact=True)
    language.get_by_role('radio',name='English' if es else 'Español',exact=True).click()
    expect(page.locator('html')).to_have_attribute('lang','en' if es else 'es')
    page.get_by_role('radiogroup',name='Language' if es else 'Idioma',exact=True).get_by_role('radio',name='Español' if es else 'English',exact=True).click()
    # Wait for the existing debounced profile save before navigating away.
    page.wait_for_timeout(550)
    if width==390:scene.screenshot(path=str(out/f'{engine}-{lang}-{theme}-glass.png'))
    page.reload();page.wait_for_load_state('networkidle');select(page,t('Personalización','Personalization'))
    expect(page.get_by_role('slider',name=t('Desenfoque','Blur'),exact=True)).to_have_value('1')
    tabs=page.locator('.wf-personalization-areas');tabs.get_by_role('tab',name=t('Kiosco','Kiosk'),exact=True).click()
    expect(page.locator('.kiosk-editor-controls fieldset').first).to_be_enabled()
    name=page.get_by_label(t('Nombre de mi diseño','My design name'),exact=True);name.fill('Glisse fixture preset')
    assert name.evaluate('e=>e.parentElement.classList.contains("lg-input")')
    page.get_by_role('button',name=t('Guardar como diseño propio','Save as my design'),exact=True).click()
    expect(page.get_by_role('status').filter(has_text=t('Diseños guardados.','Designs saved.'))).to_be_visible()
    assert len(presets)==1 and presets[0]['name']=='Glisse fixture preset'
    tabs.get_by_role('tab',name=t('Página web','Website'),exact=True).click()
    builder=page.get_by_role('button',name=t('Abrir editor de página','Open website editor'),exact=True)
    assert builder.evaluate('e=>e.classList.contains("lg-button")');builder.click()
    expect(page.get_by_role('link',name=t('Abrir Builder para rediseñar ↗','Open Builder to redesign ↗'),exact=True)).to_have_attribute('href','/builder?edit=glisse-fixture')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Horizontal overflow'
    assert not page.evaluate('window.__rejections') and not row['errors'] and not row['failed_requests'] and not row['http_errors'] and not row['unexpected_requests'],row
    row['passed']=True
   except Exception as error:
    row['passed']=False;row['failure']=str(error);page.screenshot(path=str(out/f'failure-{engine}-{role}-{width}-{lang}-{theme}.png'))
   rows.append(row);context.close();print(engine,role,width,lang,theme,row.get('passed'),flush=True)
  browser.close()
(out/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(json.dumps({'count':len(rows),'passed':sum(r.get('passed',False) for r in rows),'failed':[r for r in rows if not r.get('passed')]}),flush=True)
raise SystemExit(0 if all(r.get('passed') for r in rows) else 1)
