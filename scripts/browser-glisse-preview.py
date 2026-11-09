"""Glisse integration regression. No business data or write APIs are used.
Run against Vite or a built preview: python scripts/browser-glisse-preview.py --base http://127.0.0.1:5173
"""
import argparse, itertools, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5173')
parser.add_argument('--output',default='/tmp/wf-glisse-browser')
parser.add_argument('--quick',action='store_true')
parser.add_argument('--motion',choices=['reduce','no-preference'],default='reduce')
args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  options={'headless':True}
  executable=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium') if engine=='chromium' else os.environ.get('WEBKIT_PATH','/workspace/.playwright/webkit-2336/pw_run.sh')
  if Path(executable).exists():options['executable_path']=executable
  if engine=='chromium':options['args']=['--no-sandbox']
  if args.base.startswith('https://') and os.environ.get('HTTPS_PROXY'):options['proxy']={'server':os.environ['HTTPS_PROXY']}
  try:browser=getattr(p,engine).launch(**options)
  except Exception as error:
   results.append({'engine':engine,'unavailable':str(error)});continue
  cases=itertools.product([390] if args.quick else [320,375,390,430,768,1024,1440],['es'] if args.quick else ['es','en'],['dark'] if args.quick else ['light','dark'])
  for width,lang,theme in cases:
   row={'engine':engine,'width':width,'lang':lang,'theme':theme,'motion':args.motion,'errors':[],'failed_requests':[],'http_errors':[],'api_requests':[]}
   context=browser.new_context(viewport={'width':width,'height':844 if width<768 else 900},has_touch=width<768,reduced_motion=args.motion,service_workers='block')
   context.add_init_script('if(!localStorage.getItem("webfactory-language"))localStorage.setItem("webfactory-language",'+json.dumps(lang)+');if(!localStorage.getItem("webfactory-theme-v2"))localStorage.setItem("webfactory-theme-v2",'+json.dumps(theme)+');window.__rejections=[];addEventListener("unhandledrejection",e=>window.__rejections.push(String(e.reason)));')
   def guard(route):
    if '/.netlify/functions/' in route.request.url:
     row['api_requests'].append(route.request.url);route.abort()
    else:route.continue_()
   context.route('**/*',guard)
   page=context.new_page();page.set_default_timeout(8000)
   page.on('pageerror',lambda e:row['errors'].append({'message':str(e),'stack':e.stack}))
   page.on('console',lambda m:row['errors'].append({'message':m.text,'location':m.location}) if m.type=='error' else None)
   page.on('requestfailed',lambda r:row['failed_requests'].append({'url':r.url,'error':r.failure}))
   page.on('response',lambda r:row['http_errors'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
   es=lang=='es'
   try:
    page.goto(args.base+'/glisse-preview/');page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading',level=1)).to_have_text('Prueba de controles Glisse' if es else 'Glisse controls preview')
    expect(page.locator('.wf-glisse-grid>section')).to_have_count(8)
    expect(page.locator('.wf-glisse-preview')).to_have_attribute('data-theme',theme)
    theme_switch=page.get_by_role('switch',name='Modo oscuro' if es else 'Dark mode')
    expect(page.locator('.wf-theme-toggle.floating')).to_have_count(0)
    theme_switch.focus();theme_switch.press('Space')
    next_theme='light' if theme=='dark' else 'dark'
    expect(page.locator('html')).to_have_attribute('data-wf-theme',next_theme)
    assert page.evaluate('localStorage.getItem("webfactory-theme-v2")')==next_theme
    page.reload();page.wait_for_load_state('networkidle')
    expect(page.locator('.wf-glisse-preview')).to_have_attribute('data-theme',next_theme)
    page.get_by_role('switch',name='Modo oscuro' if es else 'Dark mode').click()
    expect(page.locator('.wf-glisse-preview')).to_have_attribute('data-theme',theme)
    expect(page.get_by_role('switch',name='Interruptor deshabilitado' if es else 'Disabled switch')).to_be_disabled()
    title=page.get_by_label('Título de la tarjeta de prueba' if es else 'Test card title')
    apply=page.get_by_role('button',name='Aplicar a la muestra' if es else 'Apply to sample')
    title.fill('');apply.click();expect(page.get_by_test_id('apply-count')).to_have_text('0')
    title.fill('Mi muestra');apply.click();expect(page.get_by_test_id('apply-count')).to_have_text('1')
    expect(page.get_by_test_id('glass-result').locator('strong')).to_have_text('Mi muestra')
    expect(page.get_by_role('button',name='Deshabilitado' if es else 'Disabled',exact=True)).to_be_disabled()
    search=page.get_by_label('Buscar un componente de esta biblioteca' if es else 'Find a component in this library')
    search.fill('switch');expect(page.get_by_test_id('search-results').locator('li')).to_have_count(1)
    search.fill('no-match');expect(page.get_by_test_id('search-count')).to_have_text('0 / 9')
    page.get_by_role('button',name='Borrar búsqueda' if es else 'Clear search',exact=True).click()
    expect(search).to_have_value('');expect(page.get_by_test_id('search-results').locator('li')).to_have_count(9)
    slider=page.get_by_role('slider',name='Radio de la tarjeta de muestra' if es else 'Sample card radius',exact=False)
    slider.focus();slider.press('ArrowRight');expect(slider).to_have_value('17')
    expect(page.get_by_test_id('glass-result')).to_have_css('border-radius','17px')
    slider.press('End');expect(slider).to_have_value('32');slider.press('Home');expect(slider).to_have_value('0')
    if args.motion=='no-preference':
     slider.scroll_into_view_if_needed();box=slider.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']*.75,box['y']+box['height']/2,steps=8);page.mouse.up()
     assert 20<=int(slider.input_value())<=28, 'Slider pointer drag did not update value'
    expect(page.get_by_role('slider',name='Slider deshabilitado' if es else 'Disabled slider')).to_be_disabled()
    page.get_by_role('radio',name='Lista' if es else 'List',exact=True).click()
    expect(page.get_by_test_id('glass-result')).to_have_attribute('data-layout','list')
    page.get_by_role('radio',name='Lista' if es else 'List',exact=True).press('ArrowLeft')
    expect(page.get_by_test_id('glass-result')).to_have_attribute('data-layout','cards')
    result_tab=page.get_by_role('tab',name='Resultado' if es else 'Result',exact=True)
    result_tab.click();expect(result_tab).to_have_attribute('aria-selected','true')
    expect(page.get_by_test_id('glass-result')).to_contain_text('resultado local' if es else 'local test result')
    trigger=page.get_by_role('button',name='Acciones de la muestra' if es else 'Sample actions')
    trigger.click();expect(page.get_by_role('menu')).to_be_visible()
    expect(page.get_by_role('menuitem',name='Acción deshabilitada' if es else 'Disabled action')).to_be_disabled()
    page.keyboard.press('Escape');expect(page.get_by_role('menu')).to_have_count(0);expect(trigger).to_be_focused()
    trigger.click();page.get_by_role('menuitem',name='Restablecer muestra' if es else 'Reset sample').click()
    expect(title).to_have_value('WebFactory PR');expect(page.get_by_test_id('apply-count')).to_have_text('0')
    expect(slider).to_have_value('16');expect(page.get_by_test_id('glass-result')).to_have_attribute('data-layout','cards')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Horizontal overflow'
    assert not page.evaluate('window.__rejections'), 'Unhandled promise rejection'
    assert not row['errors'] and not row['failed_requests'] and not row['http_errors'] and not row['api_requests'],row
    if (width==390 and lang=='es' and theme=='dark') or (width==1440 and lang=='en' and theme=='light'):
     page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
     page.screenshot(path=str(out/f'{engine}-{width}-{lang}-{theme}.png'),full_page=engine=='chromium')
     if engine=='webkit':
      page.locator('.lg-tab-bar').screenshot(path=str(out/f'{engine}-{width}-{lang}-{theme}-tabs.png'))
      page.locator('.lg-slider').first.screenshot(path=str(out/f'{engine}-{width}-{lang}-{theme}-slider.png'))
    row['passed']=True
   except Exception as error:
    row['passed']=False;row['failure']=str(error)
    page.screenshot(path=str(out/f'failure-{engine}-{width}-{lang}-{theme}.png'),full_page=True)
   results.append(row);context.close();print(engine,width,lang,theme,row.get('passed'),flush=True)
  browser.close()
(out/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
print(json.dumps({'cases':len(results),'passed':sum(r.get('passed',False) for r in results),'failed':[r for r in results if not r.get('passed')]}),flush=True)
raise SystemExit(0 if results and all(r.get('passed') for r in results) else 1)
