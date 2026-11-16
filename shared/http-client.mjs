const fallback='No se pudo completar la solicitud. Intenta nuevamente. / Unable to complete the request. Please try again.';
export class HttpError extends Error {
 constructor(message,{status=0,code='',retryable=false}={}){super(message);this.name='HttpError';this.status=status;this.code=code;this.retryable=retryable;}
}
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
async function attempt(input,init,{fetcher,timeoutMs,errorMessage,requireOk}){
 if(init.signal?.aborted)throw init.signal.reason||new DOMException('Cancelled','AbortError');
 const controller=new AbortController();let timer,onAbort;
 const abort=new Promise((_,reject)=>{
  onAbort=()=>{controller.abort(init.signal?.reason);reject(init.signal?.reason||new DOMException('Cancelled','AbortError'));};
  init.signal?.addEventListener('abort',onAbort,{once:true});
  timer=setTimeout(()=>{controller.abort();reject(new HttpError(errorMessage,{code:'REQUEST_TIMEOUT',retryable:true}));},timeoutMs);
 });
 try{
  if(init.signal?.aborted)throw init.signal.reason||new DOMException('Cancelled','AbortError');
  return await Promise.race([abort,(async()=>{
   let response;
   try{response=await fetcher(input,{...init,signal:controller.signal});}
   catch(error){if(controller.signal.aborted)throw error;throw new HttpError(errorMessage,{code:'NETWORK_ERROR',retryable:true});}
   let body;try{body=await response.json();}catch{body=null;}
   if(!response.ok)throw new HttpError(object(body)&&typeof body.message==='string'?body.message:errorMessage,{status:response.status,code:object(body)&&typeof body.code==='string'?body.code:'HTTP_ERROR',retryable:[429,502,503,504].includes(response.status)});
   if(!object(body))throw new HttpError(errorMessage,{status:502,code:'INVALID_RESPONSE'});
   if(body.ok===false||(requireOk&&body.ok!==true))throw new HttpError(typeof body.message==='string'?body.message:errorMessage,{status:response.status,code:typeof body.code==='string'?body.code:'INVALID_RESPONSE'});
   return body;
  })()]);
 }finally{clearTimeout(timer);init.signal?.removeEventListener('abort',onAbort);}
}
function pause(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(signal.reason);return;}const stop=()=>{clearTimeout(timer);reject(signal.reason||new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);signal?.addEventListener('abort',stop,{once:true});});}
export async function requestJson(input,init={},options={}){
 const config={fetcher:(url,options)=>globalThis.fetch(url,options),timeoutMs:12000,errorMessage:fallback,requireOk:false,...options};
 const method=(init.method||(typeof Request!=='undefined'&&input instanceof Request?input.method:'GET')).toUpperCase();
 const attempts=['GET','HEAD'].includes(method)&&options.retry===true?3:1;
 for(let n=0;n<attempts;n++){
  try{return await attempt(input,{credentials:'same-origin',cache:'no-store',...init},config);}
  catch(error){if(init.signal?.aborted||!(error instanceof HttpError)||!error.retryable||n===attempts-1)throw error;await pause(400*2**n,init.signal);}
 }
}
