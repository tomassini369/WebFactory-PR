export const BUSINESS_WEEK = [
 {en:'Monday',es:'Lunes'},{en:'Tuesday',es:'Martes'},{en:'Wednesday',es:'Miércoles'},
 {en:'Thursday',es:'Jueves'},{en:'Friday',es:'Viernes'},{en:'Saturday',es:'Sábado'},{en:'Sunday',es:'Domingo'},
];
export const isBusinessTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
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
