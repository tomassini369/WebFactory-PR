import {oauthError} from './chatgpt-oauth.mjs';
import {parseComponentNames,planShadcnComponents} from './shadcn-components.mjs';

const REPO='tomassini369/WebFactory-PR';
const WORKFLOW='shadcn-components.yml';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const componentBranch=id=>'feature/shadcn-'+id.toLowerCase();
export function createShadcnGitHub({fetchImpl=(...args)=>globalThis.fetch(...args),getToken=()=>globalThis.Netlify?.env?.get('WF_SHADCN_GITHUB_TOKEN')||'',planner=planShadcnComponents}={}){
 async function api(path,method='GET',body){
  const token=getToken();if(!token)throw oauthError('GitHub execution is not configured. Use the connected GitHub coding workflow with wf_shadcn_prepare, or configure WF_SHADCN_GITHUB_TOKEN on the server.',409);
  let response;
  try{response=await fetchImpl(`https://api.github.com/repos/${REPO}/${path}`,{method,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(12000),headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}catch{throw oauthError('GitHub request could not be verified. Query status before retrying.',409);}
  if(!response.ok)throw oauthError(response.status===404?'The component workflow is not available on main yet.':response.status===401||response.status===403?'GitHub execution access needs configuration.':'GitHub execution could not be verified. Query status before retrying.',409);
  if(response.status===204)return {};
  const raw=await response.text();if(raw.length>2_000_000)throw oauthError('GitHub response too large.',503);
  return JSON.parse(raw);
 }
 function validateId(id){if(!UUID.test(id||''))throw oauthError('A UUID requestId is required.',400);}
 async function status({requestId}){
  validateId(requestId);
  const branch=componentBranch(requestId);
  const prs=await api('pulls?state=all&head='+encodeURIComponent('tomassini369:'+branch)+'&base=main&per_page=1');
  const pr=Array.isArray(prs)?prs[0]:null;
  const data=await api(`actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=100`);
  let previewStatus=pr?'pending_verification':null;
  if(pr&&/^[0-9a-f]{40}$/i.test(pr.head?.sha||'')){
   const checks=await api(`commits/${pr.head.sha}/status`);
   const netlify=(checks.statuses||[]).find(check=>check.context==='netlify/webfactorypr/deploy-preview');
   previewStatus=netlify?.state==='success'?'ready':['failure','error'].includes(netlify?.state)?'failed':'pending';
  }
  const run=(data.workflow_runs||[]).find(run=>run.display_title===`shadcn:${requestId.toLowerCase()}`);
  return {requestId,branch,status:pr?'pull_request_created':run?run.status==='completed'?run.conclusion==='success'?'completed':'failed':run.status:'not_found',pullRequest:pr?{number:pr.number,url:`https://github.com/${REPO}/pull/${pr.number}`,state:pr.state}:null,previewUrl:pr?`https://deploy-preview-${pr.number}--webfactorypr.netlify.app`:null,previewStatus,workflow:run?{url:`https://github.com/${REPO}/actions/runs/${run.id}`,status:run.status,conclusion:run.conclusion}:null,productionPublished:false};
 }
 return {
  status,
  async add({components,requestId}){
   validateId(requestId);components=parseComponentNames(components);
   // Validate official registry paths/dependencies before causing any remote mutation.
   await planner(components);
   if(!getToken())return {status:'github_connection_required',requestId,repository:REPO,branch:componentBranch(requestId),next:'Call wf_shadcn_prepare, then use the connected GitHub coding workflow to create a branch, apply complete component files, install listed dependencies, update package-lock.json, run tests/build and create a PR. If workflow dispatch is available, dispatch shadcn-components.yml on main with inputs components and request_id. Do not claim a PR or preview exists until status verifies it.',productionPublished:false};
   const existing=await status({requestId});if(existing.status!=='not_found')return existing;
   await api(`actions/workflows/${WORKFLOW}/dispatches`,'POST',{ref:'main',inputs:{components:components.join(','),request_id:requestId.toLowerCase()}});
   return {status:'queued',requestId,branch:componentBranch(requestId),next:'Poll wf_shadcn_status with the same requestId. The workflow installs dependencies, tests and builds before opening the PR; Netlify then builds a preview. Production is unchanged.',productionPublished:false};
  },
 };
}
export const shadcnGitHub=createShadcnGitHub();
