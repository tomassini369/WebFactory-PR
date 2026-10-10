import {appendEntry,localDay,fail} from './business-accounting.mjs';
import {shiftMinutes} from './workforce.mjs';
export function importApprovedShift(ledger,input,state,site,actor){
 if(state?.siteId!==site.siteId)throw fail('Attendance does not belong to this business.',403);
 const shift=state.shifts.find(s=>s.id===input.shiftId);
 if(!shift?.end||!shift.approvedAt)throw fail('Approve a closed attendance shift first / Aprueba un turno cerrado primero.',409);
 const id=`attendance_${shift.id}`;
 const existing=ledger.entries.find(e=>e.id===id);
 if(existing){if(existing.sourceShiftId!==shift.id)throw fail('Ledger identifier conflict.',409);return ledger;}
 const effective=shift.correction?{...shift,start:shift.correction.start,end:shift.correction.end}:shift;
 const minutes=shiftMinutes(effective).workedMinutes,overtime=input.overtimeMinutes;
 if(!Number.isSafeInteger(overtime)||overtime<0||overtime>minutes||minutes>1440)throw fail('Review overtime minutes and shifts over 24 hours / Revisa horas extra y turnos mayores de 24 horas.');
 const next=appendEntry(ledger,{...input,id,type:'work',employeeId:shift.employeeId,date:localDay(effective.start,site.settings?.timezone||'America/Puerto_Rico'),regularMinutes:minutes-overtime,overtimeMinutes:overtime,commissionCents:0,tipCents:0,note:`Attendance ${shift.id}; compensation pending owner approval`},site,actor);
 const entry=next.entries.at(-1);entry.sourceShiftId=shift.id;entry.attendanceApprovedAt=shift.approvedAt;entry.sourceStart=effective.start;entry.sourceEnd=effective.end;entry.locationId=shift.locationId;
 return next;
}
