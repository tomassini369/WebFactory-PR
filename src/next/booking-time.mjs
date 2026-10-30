// Browser-safe equivalent of booking-engine.mjs zonedToUtc; no provider imports.
export function bookingTime(value,timeZone='America/Puerto_Rico'){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Selecciona una fecha y hora válidas.')
 const [date,time]=value.split('T'),[y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number),wall=Date.UTC(y,m-1,d,h,min)
 const offsetAt=timestamp=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timestamp));const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-timestamp}
 const candidates=[...new Set([-86400000,0,86400000].map(delta=>offsetAt(wall+delta)))].map(offset=>wall-offset).filter(t=>t+offsetAt(t)===wall).sort((a,b)=>a-b)
 if(!candidates.length)throw Error('Esa hora no existe en la zona horaria del negocio.')
 return new Date(candidates[0]).toISOString()
}
