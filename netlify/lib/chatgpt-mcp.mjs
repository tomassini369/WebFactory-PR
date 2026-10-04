import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {z} from 'zod';
import {operations,authorizeGrant,businessView,listRecords,readCollections,platformBusinesses,accountingForSite,safeOutput} from './chatgpt-operations.mjs';
import {prepareProposal,proposalKey} from './chatgpt-proposals.mjs';
import {clientOAuthStore} from './client-store.mjs';
import {oauthError} from './chatgpt-oauth.mjs';
export async function serveMcp(request,grant,user){
 const origin=new URL(request.url).origin;
 await authorizeGrant(grant,user,grant.siteId);
 const server=new McpServer({name:'WebFactory PR',version:'1.0.0'});
 const out=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
 function tool(name,description,schema,callback,propose=false){server.registerTool(name,{description,inputSchema:schema,annotations:{readOnlyHint:!propose,destructiveHint:false,idempotentHint:true,openWorldHint:false},_meta:{securitySchemes:[{type:'oauth2',scopes:propose?['webfactory.read','webfactory.propose']:['webfactory.read']}]}},async args=>{try{return out(await callback(args));}catch(e){return {...out({error:e.status&&e.status<500?e.message:'Unable to complete operation. Review the portal.'}),isError:true};}});}
 const siteId=z.string().min(1).max(120).optional();
 const access=async(args,capability='overview')=>{
  if(!grant.platform&&args.siteId&&args.siteId!==grant.siteId)throw oauthError('Cross-business access denied.',403);
  const target=grant.platform?args.siteId:grant.siteId;if(!target)throw oauthError('Select a business siteId.');
  return authorizeGrant(grant,user,target,capability);
 };
 tool('wf_connection','Identify the current connection and its fixed permissions. Passwords, source code, terminal, secrets and deployments are unavailable.',z.object({}),async()=>({email:user.email,platform:grant.platform,siteId:grant.siteId,scopes:grant.scopes,expiresAt:grant.expiresAt,reviewUrl:origin+'/chatgpt',manualPortal:origin+(grant.platform?'/webfactory-admin':'/client-admin')}));
 tool('wf_business','Read the selected business configuration. Platform administrators must specify siteId.',z.object({siteId}),async args=>{const a=await access(args);return businessView(a.site,a.membership);});
 tool('wf_records','Read a bounded page of records from this business. Follow nextOffset for additional records; no global customer search.',z.object({siteId,collection:z.enum(Object.keys(readCollections)),limit:z.number().int().min(1).max(100).default(50),offset:z.number().int().min(0).max(10000).default(0)}),async args=>{const {site}=await access(args,readCollections[args.collection]);return listRecords(site.siteId,args.collection,args);});
 tool('wf_accounting','Read salary, approved hours, income and cost report. Results over 500 rows are truncated; use the authenticated business portal export for complete records.',z.object({siteId,from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),employeeId:z.string().optional()}),async args=>{const {site}=await access(args,'analytics');const report=await accountingForSite(site,args);return {report:safeOutput(report),rowLimit:500,completeExportPortal:origin+'/client-admin'};});
 if(grant.platform)tool('wf_businesses','List businesses for an explicitly authorized platform administrator.',z.object({}),async()=>({businesses:await platformBusinesses()}));
 if(grant.scopes.includes('webfactory.propose'))for(const [name,op] of Object.entries(operations)){
  if(op.platform&&!grant.platform)continue;
  tool('wf_prepare_'+name,(op.description||name)+ ' Creates a proposal only. The signed-in user must review and confirm in WebFactory; never claim it is executed before wf_action_status confirms completion.',z.object({siteId,requestId:z.string().uuid().describe('New UUID for a new instruction; reuse exactly for retries.'),input:op.fields}),args=>prepareProposal(grant,user,{...args,operation:name},origin),true);
 }
 tool('wf_action_status','Read the status of a proposal created by this connection. A pending proposal has not changed the business.',z.object({proposalId:z.string().uuid()}),async({proposalId})=>{const p=await clientOAuthStore().get(proposalKey(proposalId),{type:'json'});if(!p||p.userId!==user.id||p.grantId!==grant.id)throw oauthError('Proposal unavailable.',404);return {id:p.id,status:p.status,result:safeOutput(p.result),approvalUrl:origin+'/chatgpt?proposal='+p.id};});
 const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 await server.connect(transport);
 try{return await transport.handleRequest(request);}finally{await server.close();}
}
