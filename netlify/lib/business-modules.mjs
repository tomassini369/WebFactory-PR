// Attendance's existing enabled flag remains the single authority. These
// optional HR modules never inherit booking availability or compensation data.
export function businessModules(state){return{attendance:Boolean(state?.enabled),scheduling:state?.modules?.scheduling===true,payroll:state?.modules?.payroll===true};}
export const MODULE_IMPLEMENTATION=Object.freeze({attendance:true,scheduling:false,payroll:false});
export function moduleAvailability(){return{
 attendance:{implemented:true,available:true},
 scheduling:{implemented:false,available:false,reason:'Frappe HR scheduling is not configured and validated / Horarios Frappe HR sin configurar y validar.'},
 payroll:{implemented:false,available:false,reason:'Frappe HR payroll and jurisdiction rules require configuration and professional validation / Nómina Frappe HR y reglas jurisdiccionales pendientes de configuración y validación profesional.'},
};}
export function applyModuleSettings(state,input){
 if(!input.modules||['attendance','scheduling','payroll'].some(key=>typeof input.modules[key]!=='boolean'))throw Object.assign(new Error('Select explicit module settings.'),{status:400});
 for(const key of ['scheduling','payroll'])if(input.modules[key]&&!MODULE_IMPLEMENTATION[key])throw Object.assign(new Error(moduleAvailability()[key].reason),{status:409});
 if(!input.modules.attendance&&state.shifts.some(shift=>!shift.end))throw Object.assign(new Error('Close open shifts before disabling attendance / Cierra turnos abiertos antes de desactivar asistencia.'),{status:409});
 return{...state,enabled:input.modules.attendance,modules:{scheduling:input.modules.scheduling,payroll:input.modules.payroll}};
}
