"""Fault regressions with synthetic API responses; never calls real providers."""
import argparse,json,os,re
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect,Error

def site(key):
 return dict(siteId=key,slug=key,revision=1,status='active',business=dict(name='Synthetic '+key,nameEn='Synthetic '+key,nameEs='Synthetic '+key,category='Barber',locations=[]),design=dict(primary='#0b1529',secondary='#285fa6'),catalog=[],employees=[],members=[],hours={},settings=dict(timezone='America/Puerto_Rico',locale='en'),paymentRules={},googleCalendar={},features={},servicePlan=dict(subscriptionStatus='active',billingModel='complimentary'))

def section(page,name):
 if not page.locator('.gd-navigation').is_visible():page.locator('.gd-menu-toggle').click()
 page.locator('.gd-navigation').get_by_role('button',name=name,exact=True).click()

def run(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as p:
  for engine in args.engines:
   executable=os.environ.get('QA_CHROMIUM_PATH' if engine=='chromium' else 'QA_WEBKIT_PATH')
   proxy={'server':os.environ['HTTPS_PROXY']} if urlparse(args.base).hostname not in ['127.0.0.1','localhost'] and os.environ.get('HTTPS_PROXY') else None
   browser=getattr(p,engine).launch(headless=True,**({'proxy':proxy} if proxy else {}),**({'executable_path':executable} if executable else {}),**({'args':['--no-sandbox']} if engine=='chromium' else {}))
   try:
    for width in args.widths:
     for theme in ['light','dark']:
      for lang in ['es','en']:
       es=lang=='es';state=dict(receipt='pending',null_link=False,directory_error=False,redesign_error=False,history_error=False,hold_a=False,held=[],checkouts=[],trace=[])
       context=browser.new_context(viewport=dict(width=width,height=950),service_workers='block',reduced_motion='reduce')
       context.add_init_script('localStorage.setItem("webfactory-language",'+json.dumps(lang)+');localStorage.setItem("webfactory-theme-v2",'+json.dumps(theme)+');')
       errors=[];page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
       def fulfill(route,body,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(body))
       def api(route):
        req=route.request;url=urlparse(req.url);name=url.path.rsplit('/',1)[-1];query=parse_qs(url.query)
        state['trace'].append(dict(function=name,method=req.method))
        user=dict(id='synthetic-owner',email='owner@example.invalid',confirmedAt='2026-11-01',mfa=dict(required=False))
        body=dict(ok=True,records=[],orders=[],bookings=[],customers=[])
        if name=='portal-session':
         if req.method=='POST':assert req.post_data_json['action']=='refresh'
         body=dict(ok=True,user=user)
        elif name=='public-payment-link':
         if state['null_link']:return fulfill(route,None)
         body=dict(ok=True,business=dict(name='Synthetic shop',logo=''),locale=lang,paymentMethods=dict(stripe=True,ath_movil=False),link=dict(title='Synthetic payment',description='',amount=1200,currency='usd',allowQuantity=True))
        elif name=='public-buyer-receipt':
         assert req.method=='POST' and req.post_data_json['token']=='r'*32
         body=dict(ok=True,status=state['receipt'])
         if state['receipt'] in ['paid','refunded']:
          body=dict(ok=True,status='ready',receipt=dict(paymentStatus=state['receipt']))
        elif name=='create-payment-link-checkout':
         state['checkouts'].append(dict(body=req.post_data_json,key=req.headers.get('idempotency-key')))
         return fulfill(route,dict(ok=False,message='Synthetic uncertain checkout'),503)
        elif name=='client-admin':
         assert req.method=='GET','This browser test cannot edit tenant data'
         if 'siteId' not in query:body=dict(ok=True,sites=[dict(siteId=key,slug=key,businessName='Synthetic '+key,status='active') for key in ['tenant-a','tenant-b']])
         else:
          if state['redesign_error']:return fulfill(route,dict(ok=False,message='Synthetic business outage'),503)
          body=dict(ok=True,site=site(query['siteId'][0]),membership=dict(role='owner'),posOperations=dict(cashierEnabled=True,displayEnabled=False,profile='auto',revision=0))
        elif name=='client-v3-admin':
         assert req.method=='GET'
         if state['history_error']=='malformed':return fulfill(route,dict(ok=True,records=[None]))
         if state['history_error']:return fulfill(route,dict(ok=False,message='Synthetic history preparation'),503)
         body=dict(ok=True,records=[],nextCursor=None)
        elif name=='client-commerce-admin':
         key=query['siteId'][0]
         if state['hold_a'] and key=='tenant-a':state['held'].append(route);return
         body=dict(ok=True,orders=[dict(transactionId=key+'-order',kind='order',customer=dict(name='CUSTOMER-'+key),paymentStatus='paid',status='paid',amountTotal=1000,createdAt='2026-11-16T10:00:00Z',items=[])],bookings=[])
        elif name=='dashboard-appearance':body=dict(ok=True,prefs={},hasCustom=False)
        elif name=='portal-profile':body=dict(ok=True,profile=dict(name='',phone='',theme=None,language=lang),hasPhoto=False,revision=0,version='synthetic')
        elif name=='marketplace-profile':body=dict(ok=True,profile=dict(name='Synthetic consumer',municipality='',favorites=[],following=[],revision=0,needsAcceptance=False,restricted=False))
        elif name=='marketplace-directory':
         if state['directory_error']:return fulfill(route,dict(ok=False),503)
         body=dict(ok=True,entries=[],truncated=False)
        else:assert req.method=='GET',f'Unexpected write: {name}'
        return fulfill(route,body)
       context.route('**/.netlify/functions/**',api)
       context.route('**/.netlify/identity/settings',lambda route:fulfill(route,dict(disable_signup=False,external=dict(email=True))))
       def visit(path):
        response=page.goto(args.base+path,wait_until='networkidle');assert response.status==200
       def fits():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
       try:
        for query in ['checkout=success','checkout=cancelled']:
         visit('/pay/synthetic/public-token?'+query)
         expect(page.get_by_role('heading',name='Estado del pago sin verificar' if es else 'Payment status unverified',exact=True)).to_be_visible()
         assert page.get_by_role('heading',name='Pago recibido' if es else 'Payment received',exact=True).count()==0
         assert 'No charge was completed' not in page.inner_text('body');fits()
        for status in ['paid','pending','refunded']:
         state['receipt']=status;visit('/pay/synthetic/public-token?checkout=success&receipt='+'r'*32)
         if status=='paid':expect(page.get_by_role('heading',name='Pago recibido' if es else 'Payment received',exact=True)).to_be_visible()
         else:assert page.get_by_role('heading',name='Pago recibido' if es else 'Payment received',exact=True).count()==0
         assert 'receipt=' not in page.url;fits()
        state['null_link']=True;visit('/pay/synthetic/public-token');expect(page.get_by_role('alert')).to_be_visible();assert 'properties of null' not in page.inner_text('body')
        state['null_link']=False;page.get_by_role('button',name='Reintentar' if es else 'Retry',exact=True).click();expect(page.get_by_role('heading',name='Synthetic payment')).to_be_visible();fits()
        page.locator('input').nth(0).fill('Synthetic buyer');page.locator('input[type=email]').fill('buyer@example.invalid');page.locator('form button').click();expect(page.get_by_role('alert').filter(has_text='Synthetic uncertain checkout')).to_be_visible()
        assert len(state['checkouts'])==1;expect(page.locator('input[type=email]')).to_be_disabled()
        page.locator('form button').click();expect(page.locator('form button')).to_be_enabled();assert len(state['checkouts'])==2;assert state['checkouts'][0]==state['checkouts'][1];assert re.fullmatch('[a-f0-9]{64}',state['checkouts'][0]['key'])
        state['redesign_error']=True;visit('/builder?edit=tenant-a');expect(page.get_by_role('alert').filter(has_text='Synthetic business outage')).to_be_visible();state['redesign_error']=False;page.get_by_role('button',name='Reintentar' if es else 'Retry',exact=True).focus();page.keyboard.press('Enter');expect(page.locator('.wf-builder-app')).to_be_visible();fits()
        state['directory_error']=True;visit('/cuenta');expect(page.get_by_role('button',name='Reintentar directorio' if es else 'Retry directory')).to_be_visible();expect(page.locator('#perfil')).to_be_visible();state['directory_error']=False;page.get_by_role('button',name='Reintentar directorio' if es else 'Retry directory').click();expect(page.get_by_role('button',name='Reintentar directorio' if es else 'Retry directory')).to_have_count(0);fits()
        state['hold_a']=True
        # The intentionally held request prevents networkidle; wait for the mounted workspace instead.
        page.goto(args.base+'/client-admin',wait_until='domcontentloaded');page.locator('.gd-client-dashboard').wait_for();page.wait_for_function('document.querySelector(".ca-site-switcher select")!==null')
        page.locator('.ca-site-switcher select').select_option('tenant-b');expect(page.locator('.ca-site-switcher select')).to_have_value('tenant-b');section(page,'Ver órdenes' if es else 'View orders');expect(page.get_by_text('CUSTOMER-tenant-b',exact=True)).to_be_visible()
        for route in state['held']:
         try:fulfill(route,dict(ok=True,orders=[dict(transactionId='old-order',kind='order',customer=dict(name='OLD-TENANT-A'),paymentStatus='paid',status='paid',amountTotal=1000,createdAt='2026-11-16T10:00:00Z',items=[])],bookings=[]))
         except Error:pass # Aborted transport is also an accepted cancellation outcome.
        state['held']=[];state['hold_a']=False
        expect(page.get_by_text('CUSTOMER-tenant-b',exact=True)).to_be_visible();assert page.get_by_text('OLD-TENANT-A',exact=True).count()==0;fits()
        state['history_error']='malformed' if theme=='dark' else True;section(page,'Cobros y pagos' if es else 'Payments');panel=page.locator('[data-training=payment-links]');expect(panel.get_by_role('button',name='Reintentar historial' if es else 'Retry history')).to_be_visible();state['history_error']=False;panel.get_by_role('button',name='Reintentar historial' if es else 'Retry history').click();expect(panel.get_by_role('alert')).to_have_count(0);fits()
        page.screenshot(path=str(out/f'{engine}-{width}-{theme}-{lang}.png'),full_page=True)
        assert not errors,errors
        print('PASS architecture faults, trusted payment state and recovery',engine,width,theme,lang,flush=True)
       except Exception:
        print('Architecture failure state',json.dumps(dict(engine=engine,width=width,theme=theme,lang=lang,path=urlparse(page.url).path,requests=state['trace'][-25:],headings=page.locator('h1').all_text_contents(),errors=errors)),flush=True)
        page.screenshot(path=str(out/f'failure-{engine}-{width}-{theme}-{lang}.png'),full_page=True);raise
       finally:context.close()
   finally:browser.close()

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:5444');parser.add_argument('--widths',type=int,nargs='+',default=[320,375,390,430,768,1024,1440]);parser.add_argument('--engines',nargs='+',choices=['chromium','webkit'],default=['chromium','webkit']);parser.add_argument('--out',default='/tmp/webfactory-architecture-reliability');run(parser.parse_args())
