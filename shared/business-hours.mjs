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
