"""Owner redesign regression using isolated HTTP fixtures; never writes tenant data.
Run against a built local Vite preview or the PR preview. Requires Python Playwright.
"""
import argparse, base64, copy, itertools, json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:4187')
parser.add_argument('--out', default='/tmp/wf125-redesign-browser')
parser.add_argument('--quick', action='store_true')
parser.add_argument('--faults', action='store_true')
parser.add_argument('--ai', action='store_true')
parser.add_argument('--legacy', action='store_true')
parser.add_argument('--widths', nargs='+', type=int, default=[320,375,390,430,768,1024,1440])
args=parser.parse_args();base=args.base.rstrip('/');out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8l8AAAAASUVORK5CYII=')
SITE={'siteId':'fixture-redesign','slug':'fixture-redesign','revision':4,'status':'published','servicePlan':{'subscriptionStatus':'active'},
 'business':{'name':'Fixture studio','nameEn':'Fixture studio','nameEs':'Estudio de prueba','category':'Barber','email':'fixture@example.invalid','contactName':'Fixture owner','description':'Isolated browser fixture','logoAssetKey':'','heroAssetKey':'','galleryAssetKeys':[]},
 'design':{'templateSlug':'northline-barber','style':'Modern','primary':'#123456','secondary':'#285FA6'},
 'features':{'products':True,'services':True,'cart':True,'bookings':True,'calendar':True,'form':False},
 'catalog':[{'id':'stable-service','type':'service','name':'Fixture service','nameEn':'Fixture service','nameEs':'Servicio de prueba','price':25,'description':'Fixture','duration':30,'requiresAppointment':True,'imageAssetKey':'','active':True}],
 'employees':[{'id':'stable-professional','name':'Fixture professional','role':'Barber','roleEn':'Barber','serviceIds':['stable-service'],'active':True,'calendarId':'preserve-calendar','schedule':{},'dailyLimit':8,'timeOff':[]}],
 'hours':{'Lunes':{'enabled':True,'open':'09:00','close':'17:00'}},'settings':{'timezone':'America/Puerto_Rico','locale':'en'},
 'paymentRules':{'methods':{'stripe':False,'ath':False,'inPerson':True},'bookingPayment':'in_person','productPayment':'in_person','bookingDepositPercent':25}}
SITE['catalog'].append({'id':'preserved-service','type':'service','name':'Unmentioned service','price':10,'description':'Fixture','duration':30,'requiresAppointment':True,'imageAssetKey':'','active':True})
SITE['employees'][0]['serviceIds'].append('preserved-service')
if args.legacy:
 SITE['features']={};SITE['paymentRules']={'methods':{'inPerson':True}};SITE['design']={'templateSlug':'northline-barber'}
def luminance(color):
 values=[float(value)/255 for value in re.findall(r'[0-9.]+',color)[:3]]
 linear=[value/12.92 if value<=0.04045 else ((value+0.055)/1.055)**2.4 for value in values]
 return sum(a*b for a,b in zip(linear,[0.2126,0.7152,0.0722]))
def verify_save_button(button):
 style=button.evaluate('(e)=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {color:s.color,background:s.backgroundColor,image:s.backgroundImage,width:r.width,height:r.height}}')
 stops=re.findall(r'rgba?\([^)]+\)',style['image']) or [style['background']]
 foreground=luminance(style['color'])
 ratios=[(max(foreground,luminance(stop))+0.05)/(min(foreground,luminance(stop))+0.05) for stop in stops]
 assert min(ratios)>=4.5,{'style':style,'contrast':ratios}
 assert style['width']>=44 and style['height']>=44,style
 return min(ratios)
rows=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  opts={'headless':True,'executable_path':'/usr/bin/chromium' if engine=='chromium' else '/workspace/.playwright/webkit-2336/pw_run.sh'}
  if engine=='chromium':opts['args']=['--no-sandbox']
  if base.startswith('https:'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  browser=getattr(p,engine).launch(**opts)
  cases=[(390,'es','light')] if args.quick else itertools.product(args.widths,['es','en'],['light','dark'])
  for width,lang,theme in cases:
   state=copy.deepcopy(SITE);row={'engine':engine,'width':width,'language':lang,'theme':theme,'errors':[],'console_errors':[],'requests_failed':[],'http_errors':[],'writes':[]};uploads=[];saved=[];held=[];control={'hold':False,'rejectUpload':False,'rejectSave':args.faults};expected_http=[]
   context=browser.new_context(viewport={'width':width,'height':844 if width<768 else 1024},has_touch=width<1024,reduced_motion='reduce',service_workers='block')
   context.add_init_script('if(window===window.top){localStorage.setItem("webfactory-language",'+json.dumps(lang)+');localStorage.setItem("webfactory-theme-v2",'+json.dumps(theme)+');localStorage.setItem("webfactory-v3-builder-draft","creation-draft-sentinel");sessionStorage.setItem("wf-builder-step","6");window.__rejections=[];addEventListener("unhandledrejection",e=>__rejections.push(String(e.reason)));}')
   def guard(route):
    q=route.request;endpoint=q.url.split('?')[0].rsplit('/',1)[-1]
    if '/.netlify/functions/' in q.url or '/api/' in q.url:
     if endpoint=='builder-ai' and args.ai:
      current=q.post_data_json['current'];member=current['team'][0]
      return route.fulfill(json={'ok':True,'proposal':{'summaryEn':'Isolated AI proposal','summaryEs':'Propuesta de prueba aislada','business':current['business'],'design':current['design'],'features':{},'catalog':[current['catalog'][0]],'team':[dict(member,serviceIndexes=[0])]}})
     if endpoint=='portal-session':return route.fulfill(json={'ok':True,'user':None})
     if endpoint=='client-admin' and q.method=='GET':return route.fulfill(json={'ok':True,'membership':{'role':'owner'},'site':state})
     if endpoint=='client-asset' and q.method=='GET':return route.fulfill(body=PNG,content_type='image/png')
     if endpoint=='client-asset' and q.method=='POST':
      if control['hold']:
       held.append(route);return
      if control['rejectUpload']:
       control['rejectUpload']=False;return route.fulfill(status=500,json={'ok':False,'message':'Fixture upload failure'})
      assert b'fixture-redesign' in q.post_data_buffer
      key=f'sites/fixture-redesign/upload-{len(uploads)}.png';uploads.append(key)
      return route.fulfill(json={'ok':True,'assetKey':key,'imageUrl':f'/.netlify/functions/client-asset?siteId=fixture-redesign&key={key}'})
     if endpoint=='client-admin' and q.method=='PATCH':
      body=q.post_data_json;assert body['section']=='builder';assert body['revision']==state['revision']
      if control['rejectSave']:
       control['rejectSave']=False;return route.fulfill(status=409,json={'ok':False,'message':'Fixture revision conflict'})
      saved.append(body)
      value=body['value'];state.update({'revision':state['revision']+1,'business':{**state['business'],**value['business'],'galleryAssetKeys':[x['assetKey'] for x in value['business']['galleryAssets']]},'design':value['design'],'features':value['features'],'catalog':value['catalog'],'employees':value['team'],'hours':value['hours'],'paymentRules':value['payments']})
      return route.fulfill(json={'ok':True,'site':state})
     row['writes'].append(q.method+' '+q.url);return route.abort()
    if q.resource_type=='image' and not q.url.startswith(base):return route.fulfill(body=PNG,content_type='image/png')
    if q.method not in ['GET','HEAD','OPTIONS']:row['writes'].append(q.method+' '+q.url);return route.abort()
    return route.continue_()
   context.route('**/*',guard);page=context.new_page();page.set_default_timeout(15000)
   page.on('pageerror',lambda e:row['errors'].append({'message':str(e),'stack':e.stack}))
   page.on('console',lambda m:row['console_errors'].append({'message':m.text,'location':m.location}) if m.type=='error' else None)
   page.on('response',lambda response:row['http_errors'].append({'url':response.url,'status':response.status}) if response.status>=400 else None)
   page.on('requestfailed',lambda q:row['requests_failed'].append({'url':q.url,'failure':q.failure}))
   try:
    page.goto(base+'/builder?edit=fixture-redesign',wait_until='networkidle');page.locator('.wf-builder-nav button').first.wait_for()
    assert page.locator('.wf-builder-nav button').count()==8
    assert page.locator('.wf-builder-nav button').first.get_attribute('aria-current')=='step'
    page.locator('.wf-business-optional summary').click() if page.locator('.wf-business-optional summary').count() else page.locator('details summary').first.click()
    page.get_by_label('Business name · English',exact=True).fill('Updated fixture studio')
    photo=page.locator('.wf-builder-panel input[type=file]');assert photo.count()==3
    for i in range(3):
     if args.faults and i==1:control['hold']=True
     photo.nth(i).set_input_files({'name':f'fixture-{i}.png','mimeType':'image/png','buffer':PNG})
     if args.faults and i==1:
      page.locator('.wf-builder-nav button').last.click();expect(page.get_by_role('button',name='Subiendo imágenes…')).to_be_disabled();assert len(held)==1
      key=f'sites/fixture-redesign/upload-{len(uploads)}.png';uploads.append(key);control['hold']=False;held.pop().fulfill(json={'ok':True,'assetKey':key,'imageUrl':f'/.netlify/functions/client-asset?siteId=fixture-redesign&key={key}'})
      expect(page.get_by_role('button',name='Guardar y publicar',exact=True)).to_be_enabled();page.locator('.wf-builder-nav button').first.click()
     expect(photo.nth(i)).to_be_enabled()
    assert len(uploads)==3
    page.locator('.wf-builder-nav button').nth(3).click();page.locator('.wf-catalog-tile').first.click()
    if args.faults:
     control['rejectUpload']=True;page.locator('.wf-builder-item-modal input[type=file]').set_input_files({'name':'fixture-catalog.png','mimeType':'image/png','buffer':PNG});page.locator('.wf-builder-item-modal').get_by_role('alert').filter(has_text='Fixture upload failure').wait_for();expect(page.locator('.wf-builder-item-modal input[type=file]')).to_be_enabled()
    page.locator('.wf-builder-item-modal input[type=file]').set_input_files({'name':'fixture-catalog.png','mimeType':'image/png','buffer':PNG})
    expect(page.locator('.wf-builder-item-modal input[type=file]')).to_be_enabled();assert len(uploads)==4
    page.locator('.wf-builder-item-modal input[type=number]').fill('33.50')
    if args.faults:page.screenshot(path=str(out/f'{engine}-native-dialog.png'))
    assert page.locator('dialog.wf-builder-modal-backdrop').evaluate("(element)=>element.matches(':modal')")
    page.locator('.wf-builder-item-modal header button').click()
    if args.faults:
     page.locator('.wf-catalog-tile').first.click();page.keyboard.press('Escape');expect(page.locator('.wf-builder-item-modal')).to_have_count(0)
    page.locator('.wf-builder-nav button').nth(1).click();page.locator('.wf-style-grid button').last.click()
    page.locator('.wf-builder-nav button').nth(2).click();page.locator('.wf-feature-grid .wf-toggle').first.click()
    page.locator('.wf-builder-nav button').nth(4).click();page.locator('.wf-team-editor input').first.fill('Updated professional')
    page.locator('.wf-builder-nav button').nth(5).click();page.locator('.wf-hours-editor input[type=time]').first.fill('10:00')
    page.locator('.wf-builder-nav button').nth(6).click();page.locator('.wf-payment-extras .wf-toggle').last.click()
    # All existing sections are reachable without replacing the live preview iframe.
    iframe=page.locator('.wf-template-preview-frame');handle=iframe.element_handle()
    for index in range(8):page.locator('.wf-builder-nav button').nth(index).click()
    assert handle.evaluate('(element)=>element.isConnected')
    if args.ai:
     page.locator('.wf-ai-toggle').click();page.locator('.wf-ai-body textarea').fill('Isolated proposal to update this existing business');page.get_by_role('button',name='Generar propuesta' if lang=='es' else 'Generate proposal',exact=False).click();page.get_by_role('button',name='Aplicar al Builder' if lang=='es' else 'Apply to Builder',exact=False).click();expect(page.locator('.wf-ai-body')).to_have_count(0)
    save=page.get_by_role('button',name='Guardar y publicar' if lang=='es' else 'Save and publish',exact=True);row['save_button_contrast']=verify_save_button(save);save.click()
    if args.faults:
     page.get_by_role('alert').filter(has_text='Fixture revision conflict').wait_for();assert not saved;expect(save).to_be_enabled();save.click()
    page.get_by_text('Cambios publicados.' if lang=='es' else 'Changes published.',exact=True).wait_for();assert len(saved)==1
    assert saved[0]['value']['team'][0]['id']=='stable-professional';assert saved[0]['value']['catalog'][0]['id']=='stable-service'
    assert saved[0]['value']['catalog'][0]['imageAssetKey']==uploads[3]
    assert saved[0]['value']['hours']['Martes']['enabled'] is False
    assert saved[0]['value']['features']['calls'] is False
    assert saved[0]['value']['payments']['methods']['stripe'] is False;assert saved[0]['value']['payments']['methods']['ath'] is False
    if args.legacy:assert saved[0]['value']['payments']['bookingPayment']=='full'
    assert any(item['id']=='preserved-service' for item in saved[0]['value']['catalog']);assert 'preserved-service' in saved[0]['value']['team'][0]['serviceIds']
    assert saved[0]['value']['business']['nameEn']=='Updated fixture studio';assert saved[0]['value']['design']['style']=='Bold';assert saved[0]['value']['catalog'][0]['price']==33.5;assert saved[0]['value']['team'][0]['name']=='Updated professional';assert saved[0]['value']['hours']['Lunes']['open']=='10:00';assert saved[0]['value']['payments']['allowTips'] is True
    assert page.evaluate('localStorage.getItem("webfactory-v3-builder-draft")')=='creation-draft-sentinel'
    assert page.evaluate('sessionStorage.getItem("wf-builder-step")')=='6'
    page.reload(wait_until='networkidle');page.locator('.wf-builder-nav button').first.wait_for()
    view=page.locator('.wf-builder-view-switch button').nth(1)
    if view.is_visible():view.click()
    expect(iframe).to_be_visible();frame=page.frame_locator('.wf-template-preview-frame');frame.locator('body').wait_for()
    page.wait_for_function('()=>{const f=document.querySelector(".wf-template-preview-frame");return f?.contentDocument?.querySelector(`img[src*="upload-1"]`)}')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    if width==390:page.screenshot(path=str(out/f'{engine}-{lang}-{theme}.png'))
    if args.faults:
     # Expected HTTP diagnostics are retained separately; application exceptions still fail.
     expected=[entry for entry in row['console_errors'] if ('client-asset' in entry['location'].get('url','') and '500' in entry['message']) or ('client-admin' in entry['location'].get('url','') and '409' in entry['message'])]
     row['expected_http_responses']=row['http_errors'];assert sorted(response['status'] for response in row['http_errors'])==[409,500];row['http_errors']=[]
     row['expected_http_console']=expected;row['console_errors']=[entry for entry in row['console_errors'] if entry not in expected];assert len(expected)==2,expected
    assert not row['errors'],row['errors'];assert not row['console_errors'],row['console_errors'];assert not row['requests_failed'],row['requests_failed'];assert not row['http_errors'],row['http_errors'];assert not row['writes'],row['writes'];assert not page.evaluate('window.__rejections')
    row['passed']=True
   except Exception as e:
    row['failure']=str(e);page.screenshot(path=str(out/f'failure-{len(rows)}.png'));(out/f'dom-{len(rows)}.html').write_text(page.content())
   rows.append(row);(out/'results.json').write_text(json.dumps(rows,indent=2));print(engine,width,lang,theme,row.get('passed',False),row.get('failure',''),flush=True);context.close()
  browser.close()
assert all(row.get('passed') for row in rows)
