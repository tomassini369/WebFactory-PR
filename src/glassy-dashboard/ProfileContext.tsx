import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import {usePractice} from '../training/practice-context'
import {usePortalLanguage} from '../portal-language'
import {useWebFactoryTheme} from '../theme'
import {useUnsavedChanges} from '../interaction-state'

type Profile={name:string;phone:string;language:'es'|'en'|null;theme:'dark'|'light'|null}
type RecordData={profile:Profile;hasPhoto:boolean;revision:number;version:string}
type State={data:RecordData|null;draft:{name:string;phone:string};setDraft:(v:{name:string;phone:string})=>void;busy:boolean;error:string;notice:string;reload:()=>Promise<void>;save:()=>Promise<boolean>;upload:(file:File)=>Promise<boolean>;remove:()=>Promise<boolean>;asset:string;fallback:string}
const Context=createContext<State|null>(null)
export const usePortalProfile=()=>useContext(Context)
export function PortalProfileProvider({siteId,userId,name='',children}:{siteId?:string;userId:string;name?:string;children:ReactNode}){
 const practice=usePractice(),[lang,setLang]=usePortalLanguage(),{theme,setTheme}=useWebFactoryTheme();
 const endpoint='/.netlify/functions/portal-profile'+(siteId?'?siteId='+encodeURIComponent(siteId):'');
 const [data,setData]=useState<RecordData|null>(null),[draft,setDraft]=useState({name,phone:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[epoch,setEpoch]=useState(0);
 const current=useRef<RecordData|null>(null),alive=useRef(true),queue=useRef(Promise.resolve(true)),choices=useRef({lang,theme}),lastChoices=useRef('');choices.current={lang,theme};
 useUnsavedChanges(draft,epoch,setDraft,lang)
 const accept=(next:RecordData)=>{current.current=next;setData(next)};
 const read=async(response:Response)=>{if(!response.ok)throw Error(String(response.status));const value=await response.json();if(!value.profile||typeof value.version!=='string')throw Error('load');return value as RecordData};
 const reload=async()=>{
  if(practice){const next={profile:{name,phone:'',language:null,theme:null},hasPhoto:false,revision:0,version:''};accept(next);return}
  setBusy(true);setError('');const started={...choices.current};
  try{const next=await read(await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}));if(!alive.current)return;accept(next);setDraft({name:next.profile.name||name,phone:next.profile.phone});setEpoch(v=>v+1);
   if(choices.current.lang===started.lang&&next.profile.language)setLang(next.profile.language);
   if(choices.current.theme===started.theme&&next.profile.theme)setTheme(next.profile.theme);
   lastChoices.current=JSON.stringify({lang:next.profile.language||choices.current.lang,theme:next.profile.theme||choices.current.theme});
  }catch{if(alive.current)setError('load')}finally{if(alive.current)setBusy(false)}
 };
 useEffect(()=>{alive.current=true;void reload();return()=>{alive.current=false}},[endpoint,userId,Boolean(practice)])
 const mutate=(method:string,body?:BodyInit,type='application/json',explicit=true)=>{
  const run=async()=>{if(!alive.current)return false;if(practice){setNotice('practice');return false}if(!current.current)return false;setBusy(true);setError('');if(explicit)setNotice('');
   try{const next=await read(await fetch(endpoint,{method,credentials:'same-origin',headers:{'Content-Type':type,'X-Profile-Version':current.current.version},body}));if(!alive.current)return false;accept(next);if(explicit){setNotice('saved');if(method==='PUT'){setDraft({name:next.profile.name,phone:next.profile.phone});setEpoch(v=>v+1)}}return true}
   catch(e){if(alive.current)setError(e instanceof Error&&e.message==='409'?'conflict':'save');return false}
   finally{if(alive.current)setBusy(false)}
  };queue.current=queue.current.then(run,run);return queue.current;
 };
 const action=useRef(mutate);action.current=mutate;
 useEffect(()=>{if(!data||practice||error)return;const next=JSON.stringify({lang,theme});if(next===lastChoices.current)return;const timer=setTimeout(()=>{lastChoices.current=next;void action.current('PUT',JSON.stringify({language:lang,theme}),'application/json',false)},400);return()=>clearTimeout(timer)},[lang,theme,Boolean(data),Boolean(practice),error]);
 return <Context.Provider value={{data,draft,setDraft:v=>{setDraft(v);setNotice('')},busy,error,notice,reload,save:()=>mutate('PUT',JSON.stringify({...draft,language:lang,theme})),upload:async f=>mutate('POST',await f.arrayBuffer(),f.type),remove:()=>mutate('DELETE'),asset:endpoint+(siteId?'&':'?')+'asset=1&v='+(data?.revision||0),fallback:data?.profile.name||name}}>{children}</Context.Provider>
}
export function ProfileAvatar({fallback='',className='gd-profile-avatar'}:{fallback?:string;className?:string}){
 const profile=usePortalProfile(),[failed,setFailed]=useState('');const source=profile?.data?.hasPhoto?profile.asset:'';
 return <span className={className} aria-hidden="true">{source&&source!==failed?<img src={source} alt="" onError={()=>setFailed(source)}/>:((profile?.fallback||fallback).slice(0,1).toUpperCase()||'?')}</span>
}
