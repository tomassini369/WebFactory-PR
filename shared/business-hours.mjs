export const BUSINESS_WEEK = [
 {en:'Monday',es:'Lunes'},{en:'Tuesday',es:'Martes'},{en:'Wednesday',es:'Miércoles'},
 {en:'Thursday',es:'Jueves'},{en:'Friday',es:'Viernes'},{en:'Saturday',es:'Sábado'},{en:'Sunday',es:'Domingo'},
];
export const isBusinessTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function normalizeHoursWindow(hours){
 if(!hours||typeof hours!=='object'||Array.isArray(hours))throw Object.assign(new Error('Invalid business hours.'),{status:400});
 const enabled=Boolean(hours.enabled);
 const time=(field,fallback)=>{
  const raw=hours[field]??fallback;
  if(raw===''&&!enabled)return fallback;
  if(!isBusinessTime(raw))throw Object.assign(new Error('Choose a valid time in HH:MM format (00:00–23:59).'),{status:400});
  return raw;
 };
 const open=time('open','09:00'),close=time('close','17:00');
 if(enabled&&open>=close)throw Object.assign(new Error('Closing time must be after opening time. Overnight hours are not supported.'),{status:400});
 return {enabled,open,close};
}
// Match the booking engine's Spanish-first precedence without renaming saved keys.
export function businessHoursRows(hours={}){
 hours=hours&&typeof hours==='object'&&!Array.isArray(hours)?hours:{};
 return BUSINESS_WEEK.map(day=>{
  const key=Object.hasOwn(hours,day.es)?day.es:Object.hasOwn(hours,day.en)?day.en:day.es;
  return {...day,key,hours:{enabled:false,open:'09:00',close:'17:00',...hours[key]}};
 });
}
export function completeBusinessHours(hours={}){
 return {...hours,...Object.fromEntries(businessHoursRows(hours).map(row=>[row.key,row.hours]))};
}

export function daySchedule(hours,day){
 const names=BUSINESS_WEEK.find(entry=>entry.es===day||entry.en===day);
 return names?(hours?.[names.es]??hours?.[names.en]):undefined;
}
export function effectiveBusinessSchedule(site,employee,locationId,day){
 const location=(site.business?.locations||[]).find(row=>row.id===locationId);
 const schedules=[daySchedule(site.hours,day),daySchedule(location?.hours,day),daySchedule(employee?.schedule,day)].filter(Boolean);
 if(!schedules.length||schedules.some(row=>!row.enabled))return null;
 const open=schedules.map(row=>row.open||'09:00').sort().at(-1),close=schedules.map(row=>row.close||'17:00').sort()[0];
 if(!isBusinessTime(open)||!isBusinessTime(close)||open>=close)return null;
 return {enabled:true,open,close,breaks:schedules.flatMap(row=>row.breaks||[])};
}
