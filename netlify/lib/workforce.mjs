import crypto from 'node:crypto';
import {localDay, csvCell} from './business-accounting.mjs';
import { normalizeEmail } from './client-store.mjs';
export const wfFail=(message,status=400)=>Object.assign(new Error(message),{status});
export const workforceKey=siteId=>`${siteId}/workforce/state.json`;
export const workforceAdmin=membership=>['owner','manager','admin'].includes(membership?.role);
export const emptyWorkforce=siteId=>({version:1,siteId,revision:0,enabled:false,paidBreaks:false,bindings:[],shifts:[],requests:[],events:[],operations:{}});
const locationAllowed=(membership,locationId)=>membership?.role!=='manager'||!(membership.locationIds||[]).length||membership.locationIds.includes(locationId);
const fingerprint=input=>crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
export function boundEmployee(state,site,user,membership){
 const email=normalizeEmail(user?.email),id=String(user?.id||user?.sub||'');
 if(!id||!email)throw wfFail('Verified identity required / Identidad verificada requerida.',403);
 const binding=state.bindings.find(b=>b.email===email);
 const employee=(site.employees||[]).find(e=>e.id===binding?.employeeId&&e.active!==false);
 if(!binding||!employee||(binding.userId&&binding.userId!==id))throw wfFail('Ask an administrator to link your employee record / Solicita vincular tu registro de empleado.',403);
 const locations=site.business?.locations||[];
 if(binding.locationId&&(!locations.some(l=>l.id===binding.locationId)||((membership.locationIds||[]).length&&!membership.locationIds.includes(binding.locationId))||((employee.locationIds||[]).length&&!employee.locationIds.includes(binding.locationId))))throw wfFail('Branch assignment is not authorized / Sucursal no autorizada.',403);
 return {binding,employee,userId:id};
}
export function shiftMinutes(shift,now=Date.now()){
 const end=Date.parse(shift.end||'')||now,start=Date.parse(shift.start);
 const breaks=(shift.breaks||[]).reduce((s,b)=>s+Math.max(0,Math.min(end,Date.parse(b.end||'')||end)-Math.max(start,Date.parse(b.start))),0);
 const elapsed=Math.max(0,end-start),worked=Math.max(0,elapsed-(shift.paidBreaks?0:breaks));
 return {workedMinutes:Math.floor(worked/60000),breakMinutes:Math.floor(breaks/60000),elapsedMinutes:Math.floor(elapsed/60000)};
}
export function transitionWorkforce(state,input,site,user,membership,now=Date.now()){
 const id=String(input.operationId||'');if(!/^[a-zA-Z0-9_-]{8,120}$/.test(id)||['__proto__','constructor','prototype'].includes(id))throw wfFail('Invalid operation identifier / Identificador inválido.');
 const actor=String(user.id||user.sub||''),hash=fingerprint({input,actor}),prior=Object.hasOwn(state.operations,id)?state.operations[id]:null;
 if(prior){if(prior.hash!==hash)throw wfFail('This identifier belongs to another operation / Identificador reutilizado.',409);return {state,reused:true};}
 if(!actor)throw wfFail('Identity required.',403);
 const next=structuredClone(state),at=new Date(now).toISOString(),action=input.action,admin=workforceAdmin(membership);
 let employeeId='',shiftId='';
 if(['configure','bind','approve','review_correction','close_shift'].includes(action)&&!admin)throw wfFail('Administrative permission required / Permiso administrativo requerido.',403);
 if(action==='configure'){
  if(membership.role==='manager'&&(membership.locationIds||[]).length)throw wfFail('Business-wide settings require the owner / Los ajustes globales requieren al dueño.',403);
  if(typeof input.enabled!=='boolean'||typeof input.paidBreaks!=='boolean')throw wfFail('Invalid workforce settings.');
  if(state.shifts.some(s=>!s.end)&&(input.enabled===false||input.paidBreaks!==state.paidBreaks))throw wfFail('Close open shifts before changing these rules / Cierra los turnos abiertos primero.',409);
  next.enabled=input.enabled;next.paidBreaks=input.paidBreaks;
 }else if(action==='bind'){
  const email=normalizeEmail(input.email),employee=(site.employees||[]).find(e=>e.id===input.employeeId&&e.active!==false),member=(site.members||[]).find(m=>normalizeEmail(m.email)===email);
  if(!member||!employee||!['owner','manager','employee','cashier'].includes(member.role))throw wfFail('Select an active employee and authorized portal member / Selecciona empleado y miembro autorizados.');
  if(next.bindings.some(b=>b.email!==email&&b.employeeId===employee.id))throw wfFail('Employee already linked / Empleado ya vinculado.',409);
  const current=next.bindings.find(b=>b.email===email);
  if(current&&!locationAllowed(membership,current.locationId))throw wfFail('Branch permission required.',403);
  if(next.shifts.some(s=>!s.end&&(s.employeeId===employee.id||s.employeeId===current?.employeeId)))throw wfFail('Close the active shift before changing assignment / Cierra el turno antes de reasignar.',409);
  const locationId=String(input.locationId||'');
  if(!locationAllowed(membership,locationId))throw wfFail('Branch is outside your permissions / Sucursal fuera de tus permisos.',403);
  if(locationId&&(!(site.business?.locations||[]).some(l=>l.id===locationId)||((member.locationIds||[]).length&&!member.locationIds.includes(locationId))||((employee.locationIds||[]).length&&!employee.locationIds.includes(locationId))))throw wfFail('Invalid branch assignment / Asignación de sucursal inválida.');
  next.bindings=next.bindings.filter(b=>b.email!==email);next.bindings.push({email,employeeId:employee.id,locationId,userId:current?.employeeId===employee.id?current.userId||'':'',boundAt:at});employeeId=employee.id;
 }else if(action==='close_shift'){
  const shift=next.shifts.find(s=>s.id===input.shiftId),reason=String(input.reason||'').trim();
  if(!shift||shift.end)throw wfFail('Open shift required / Se requiere turno abierto.',409);
  if(!locationAllowed(membership,shift.locationId))throw wfFail('Branch permission required.',403);
  if(reason.length<5||reason.length>1000)throw wfFail('Provide a review reason / Indica un motivo de revisión.');
  if(now<Date.parse(shift.start))throw wfFail('Server clock requires review.',503);
  const activeBreak=shift.breaks.find(b=>!b.end);if(activeBreak)activeBreak.end=at;
  shift.end=at;shift.closedBy=actor;shift.closeReason=reason;employeeId=shift.employeeId;shiftId=shift.id;
 }else if(action==='approve'){
  const shift=next.shifts.find(s=>s.id===input.shiftId);if(!shift||!shift.end)throw wfFail('Closed shift required / Se requiere turno cerrado.',409);
  if(!locationAllowed(membership,shift.locationId))throw wfFail('Branch permission required.',403);
  if(shift.approvedAt)throw wfFail('Already approved / Ya aprobado.',409);
  if(next.requests.some(r=>r.shiftId===shift.id&&r.status==='pending'))throw wfFail('Review pending correction first / Revisa la corrección pendiente.',409);
  shift.approvedAt=at;shift.approvedBy=actor;employeeId=shift.employeeId;shiftId=shift.id;
 }else if(action==='review_correction'){
  const request=next.requests.find(r=>r.id===input.requestId);if(!request||request.status!=='pending'||typeof input.accept!=='boolean')throw wfFail('Pending correction required / Corrección pendiente requerida.',409);
  const shift=next.shifts.find(s=>s.id===request.shiftId);if(!shift||shift.approvedAt)throw wfFail('Approved hours cannot be rewritten / Las horas aprobadas no se reescriben.',409);
  if(!locationAllowed(membership,shift.locationId))throw wfFail('Branch permission required.',403);
  request.status=input.accept?'accepted':'rejected';request.reviewedAt=at;request.reviewedBy=actor;
  if(input.accept)shift.correction={start:request.start,end:request.end,reason:request.reason,requestId:request.id,reviewedAt:at};
  employeeId=shift.employeeId;shiftId=shift.id;
 }else{
  if(Object.hasOwn(input,'employeeId'))throw wfFail('Employee identity is determined by the server.',400);
  if(!state.enabled)throw wfFail('Workforce is disabled / Asistencia desactivada.',403);
  const bound=boundEmployee(next,site,user,membership);employeeId=bound.employee.id;bound.binding.userId=bound.userId;
  const open=next.shifts.find(s=>s.employeeId===employeeId&&!s.end);
  if(action==='clock_in'){
   if(open)throw wfFail('A shift is already active / Ya hay un turno activo.',409);
   const shift={id:crypto.randomUUID(),employeeId,userId:actor,locationId:bound.binding.locationId,start:at,end:null,breaks:[],paidBreaks:state.paidBreaks};
   next.shifts.push(shift);shiftId=shift.id;
  }else if(action==='request_correction'){
   const shift=next.shifts.find(s=>s.id===input.shiftId&&s.employeeId===employeeId&&s.userId===actor);
   const start=Date.parse(input.start),end=Date.parse(input.end),reason=String(input.reason||'').trim();
   if(!shift||!shift.end||shift.approvedAt||next.requests.some(r=>r.shiftId===shift.id&&r.status==='pending'))throw wfFail('Select a closed, unapproved shift / Selecciona un turno cerrado sin aprobar.',409);
   if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||end>now||end-start>86400000||reason.length<5||reason.length>1000)throw wfFail('Use valid times within 24 hours and a reason / Indica horas válidas y motivo.');
   next.requests.push({id:crypto.randomUUID(),shiftId:shift.id,employeeId,userId:actor,start:new Date(start).toISOString(),end:new Date(end).toISOString(),reason,status:'pending',createdAt:at});shiftId=shift.id;
  }else{
   if(!open||open.userId!==actor)throw wfFail('No active shift / No hay un turno activo.',409);
   shiftId=open.id;const activeBreak=open.breaks.find(b=>!b.end);
   if(now<Date.parse(open.start))throw wfFail('Server clock requires review.',503);
   if(action==='start_break'){if(activeBreak)throw wfFail('Already on break / Descanso ya activo.',409);open.breaks.push({start:at,end:null});}
   else if(action==='end_break'){if(!activeBreak)throw wfFail('No active break / No hay descanso activo.',409);activeBreak.end=at;}
   else if(action==='clock_out'){if(activeBreak)activeBreak.end=at;open.end=at;}
   else throw wfFail('Unknown attendance action / Acción de asistencia inválida.');
  }
 }
 next.revision++;next.events.push({id,action,actor,employeeId,shiftId,at,revision:next.revision});next.operations[id]={hash,at};
 if(next.events.length>10000||Buffer.byteLength(JSON.stringify(next))>4*1024*1024)throw wfFail('Attendance journal requires archival; no records were removed / El historial requiere archivo; no se eliminaron registros.',503);
 return {state:next,reused:false};
}
export async function updateWorkforce(store,site,input,user,membership,now=Date.now()){
 const key=workforceKey(site.siteId);
 for(let attempt=0;attempt<6;attempt++){
  const saved=await store.getWithMetadata(key,{type:'json'});if(saved&&!saved.etag)throw wfFail('Concurrency metadata unavailable.',503);
  const state=saved?.data||emptyWorkforce(site.siteId);if(state.siteId!==site.siteId)throw wfFail('Tenant mismatch.',403);
  const result=transitionWorkforce(state,input,site,user,membership,now);if(result.reused)return result.state;
  const write=await store.setJSON(key,result.state,saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true});if(write.modified)return result.state;
 }
 throw wfFail('Attendance changed; retry the same operation / Asistencia cambió; reintenta la misma operación.',409);
}
export function attendanceTotals(shifts, now, timeZone='America/Puerto_Rico'){
 const day=localDay(new Date(now).toISOString(),timeZone),dayDate=new Date(day+'T12:00:00Z');
 const monday=new Date(dayDate);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 const boundary=date=>{const center=Date.parse(date+'T00:00:00Z');let lo=center-36*3600000,hi=center+36*3600000;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(localDay(new Date(mid).toISOString(),timeZone)<date)lo=mid;else hi=mid;}return hi;};
 const todayStart=boundary(day),weekStart=boundary(monday.toISOString().slice(0,10));
 const within=(shift,start)=>{const effective=shift.correction?{...shift,start:shift.correction.start,end:shift.correction.end}:shift;const a=Math.max(start,Date.parse(effective.start)),b=Math.min(now,Date.parse(effective.end||'')||now);return b>a?shiftMinutes({...effective,start:new Date(a).toISOString(),end:new Date(b).toISOString()},now).workedMinutes:0;};
 return {todayMinutes:shifts.reduce((sum,s)=>sum+within(s,todayStart),0),weekMinutes:shifts.reduce((sum,s)=>sum+within(s,weekStart),0),weekStart:localDay(new Date(weekStart).toISOString(),timeZone)};
}
export function workforceView(state,site,user,membership,now=Date.now()){
 const admin=workforceAdmin(membership);let bound=null;try{bound=boundEmployee(state,site,user,membership)}catch{}
 const shifts=state.shifts.filter(s=>locationAllowed(membership,s.locationId)&&(admin||(s.employeeId===bound?.employee.id&&s.userId===bound?.userId))).map(s=>({...s,...shiftMinutes(s.correction?{...s,start:s.correction.start,end:s.correction.end}:s,now)}));
 const requests=state.requests.filter(r=>shifts.some(s=>s.id===r.shiftId)&&(admin||(r.employeeId===bound?.employee.id&&r.userId===bound?.userId)));
 const employees=(site.employees||[]).filter(e=>e.active!==false&&(!(membership.role==='manager'&&(membership.locationIds||[]).length)||(e.locationIds||[]).some(id=>membership.locationIds.includes(id)))&&(admin||e.id===bound?.employee.id)).map(e=>({id:e.id,name:e.name,locationIds:e.locationIds||[]}));
 const timeZone=site.settings?.timezone||'America/Puerto_Rico';
 const totals=attendanceTotals(shifts.filter(s=>s.employeeId===bound?.employee.id&&s.userId===bound?.userId),now,timeZone);
 return {totals,timeZone:site.settings?.timezone||'America/Puerto_Rico',confirmedOperationIds:state.events.filter(e=>e.actor===String(user.id||user.sub||'')).map(e=>e.id),enabled:state.enabled,paidBreaks:state.paidBreaks,revision:state.revision,serverNow:new Date(now).toISOString(),admin,employeeId:bound?.employee.id||'',shifts,requests,employees,bindings:admin?state.bindings.filter(b=>locationAllowed(membership,b.locationId)):[],events:admin?state.events.filter(e=>!e.shiftId||shifts.some(s=>s.id===e.shiftId)):state.events.filter(e=>e.actor===bound?.userId),locations:(site.business?.locations||[]).filter(l=>locationAllowed(membership,l.id)&&(admin||l.id===bound?.binding.locationId)).map(l=>({id:l.id,name:l.name}))};
}
export function attendanceCsv(view,from='',to='',employeeId='',locationId=''){
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if((from&&!validDate(from))||(to&&!validDate(to))||(from&&to&&from>to))throw wfFail('Invalid report dates.');
 const cell=csvCell;
 const rows=view.shifts.filter(s=>(!employeeId||s.employeeId===employeeId)&&(!locationId||s.locationId===locationId)&&(!from||localDay(s.start,view.timeZone)>=from)&&(!to||localDay(s.start,view.timeZone)<=to));
 return [['shiftId','employeeId','locationId','originalStart','originalEnd','workedMinutes','breakMinutes','approvedAt','correctedStart','correctedEnd','paidBreaks','breakIntervals','approvedBy','correctionReason','closedBy','closeReason'],...rows.map(s=>[s.id,s.employeeId,s.locationId,s.start,s.end,s.workedMinutes,s.breakMinutes,s.approvedAt,s.correction?.start,s.correction?.end,s.paidBreaks,JSON.stringify(s.breaks),s.approvedBy,s.correction?.reason,s.closedBy,s.closeReason])].map(r=>r.map(cell).join(',')).join('\r\n');
}
