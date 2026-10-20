import crypto from 'node:crypto';
import {admin,requestPasswordRecovery} from '@netlify/identity';

// Invitations reuse Identity. Pending invitations do not add a tenant to JWT
// metadata or grant membership. Existing account roles/MFA remain untouched.
export async function ensureAccountingIdentity(email){
 const normalized=String(email).trim().toLowerCase();
 for(let page=1;page<=50;page++){
  const users=await admin.listUsers({page,perPage:100});
  if(!Array.isArray(users))throw new Error('Identity directory unavailable.');
  if(users.some(user=>String(user.email).toLowerCase()===normalized))return;
  if(users.length<100){
   await admin.createUser({email:normalized,password:crypto.randomBytes(48).toString('base64url'),data:{role:'client',app_metadata:{roles:['client'],webfactory_site_ids:[]}}});
   await requestPasswordRecovery(normalized);return;
  }
 }
 throw new Error('Identity directory lookup limit reached.');
}
