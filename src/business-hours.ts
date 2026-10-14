type Hours = Record<string,{enabled?:boolean;open?:string;close?:string}>
const days=[['domingo','Sunday','Domingo'],['lunes','Monday','Lunes'],['martes','Tuesday','Martes'],['miércoles','Wednesday','Miércoles'],['jueves','Thursday','Jueves'],['viernes','Friday','Viernes'],['sábado','Saturday','Sábado']]
/** Group only adjacent days that really share a schedule. Closed days split groups. */
export function formatBusinessHours(hours:Hours,lang:'es'|'en') {
  const normalized=new Map(Object.entries(hours||{}).map(([day,value])=>[day.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),value]))
  const ordered=[...days.slice(1),days[0]]
  const groups:Array<{first:string;last:string;open:string;close:string}>=[]
  let previousOpen=false
  for(const [es,en,label] of ordered){
    const row=normalized.get(es.normalize('NFD').replace(/[\u0300-\u036f]/g,''))||normalized.get(en.toLowerCase())
    if(!row?.enabled){previousOpen=false;continue}
    const name=lang==='es'?label:en,open=row.open||'09:00',close=row.close||'17:00',last=groups.at(-1)
    if(previousOpen&&last&&last.open===open&&last.close===close)last.last=name
    else groups.push({first:name,last:name,open,close})
    previousOpen=true
  }
  return groups.map(group=>`${group.first}${group.last!==group.first?`–${group.last}`:''} · ${group.open}–${group.close}`).join('; ')
}
