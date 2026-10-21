import crypto from 'node:crypto';
import {EMPLOYEE_GRANTS, isBusinessOwner} from './commercial-access.mjs';
const emailOf = value => String(value || '').trim().toLowerCase();
const fail = (message,status=400) => Object.assign(new Error(message),{status});
export function changeCommercialMember(site,input,actor,identity,now=new Date().toISOString()) {
  if (!isBusinessOwner(actor.membership)) throw fail('Only the owner can manage access.',403);
  if (!Number.isInteger(input.revision) || input.revision !== Number(site.revision || 0)) throw fail('Business changed. Reload before saving.',409);
  if (input.role && !['owner','employee'].includes(input.role) && input.action!=='migrate') throw fail('Only Owner and Employee are commercial roles.');
  const email=emailOf(input.email), current=(site.members || []).find(member=>emailOf(member.email)===email);
  if (!email || !email.includes('@')) throw fail('A valid email is required.');
  if (!['invite','configure','migrate','undo_migration','revoke','resend_invite'].includes(input.action)) throw fail('Unsupported access action.');
  if (input.action === 'invite' && current) throw fail('This account already has access. Edit its permissions instead.',409);
  if (input.action !== 'invite' && !current) throw fail('Membership not found.',404);
  if (current?.role === 'owner' && input.action !== 'configure') throw fail('Owner access cannot be changed here.',409);
  if (input.action === 'migrate' && (['owner','employee'].includes(current.role) || input.confirmLegacy !== true)) throw fail('The owner must explicitly confirm this legacy conversion.',409);
  if (input.action === 'configure' && !['owner','employee'].includes(current.role)) throw fail('Confirm the legacy migration first.',409);
  let next;
  if (input.action === 'resend_invite') {
    if(current.role!=='employee')throw fail('Review legacy access first.',409);
    next=current;
  } else if (input.action === 'undo_migration') {
    const event=(site.membershipAudit || []).find(event=>event.id===input.migrationId && event.email===email && event.action==='migrate');
    const latest=(site.membershipAudit || []).filter(event=>event.email===email).at(-1);
    if (!event || latest?.id!==event.id) throw fail('Only the most recent unchanged migration can be reversed.',409);
    // Restored legacy roles stay quarantined by client-auth until owner review.
    next=event.before;
  } else if (input.action !== 'revoke') {
    if (!identity?.id || emailOf(identity.email)!==email) throw fail('Verified portal identity required.',409);
    const employeeId=String(input.employeeId || '');
    const employee=(site.employees || []).find(employee=>employee.id===employeeId);
    if (employeeId && !employee) throw fail('Professional profile not found.');
    if (employeeId && (site.members || []).some(member=>emailOf(member.email)!==email && member.employeeId===employeeId)) throw fail('This professional already has a portal account.',409);
    const locations=(site.business?.locations || []).filter(location=>location.active!==false);
    const locationIds=[...new Set(Array.isArray(input.locationIds)?input.locationIds:[])];
    if (locationIds.some(id=>!locations.some(location=>location.id===id) || employee && !employee.locationIds?.includes(id))) throw fail('Choose branches assigned to this professional.');
    const permissions=Object.fromEntries(EMPLOYEE_GRANTS.map(key=>[key,input.permissions?.[key]===true]));
    next={...current,email,role:current?.role==='owner'?'owner':'employee',userId:identity.id,employeeId,locationIds,permissions,status:'active',updatedAt:now};
    delete next.revokedAt;
  }
  const members=(site.members || []).filter(member=>emailOf(member.email)!==email);
  if (next) members.push(next);
  const event={id:crypto.randomUUID(),action:input.action,email,before:current || null,after:next || null,actorId:actor.user.id,at:now};
  return {...site,members,membershipAudit:[...(site.membershipAudit || []),event],revision:Number(site.revision || 0)+1,updatedAt:now};
}
