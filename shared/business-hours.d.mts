export type BusinessDayHours={enabled:boolean;open:string;close:string;breaks?:Array<{start:string;end:string}>};
export const BUSINESS_WEEK:Array<{en:string;es:string}>;
export function isBusinessTime(value:unknown):value is string;
export function businessHoursRows(hours?:Record<string,BusinessDayHours>):Array<{en:string;es:string;key:string;hours:BusinessDayHours}>;
export function completeBusinessHours(hours?:Record<string,BusinessDayHours>):Record<string,BusinessDayHours>;
export function normalizeHoursWindow(hours:unknown):BusinessDayHours;

export function daySchedule(hours:any,day:string):any;
export function effectiveBusinessSchedule(site:any,employee:any,locationId:string,day:string):{enabled:boolean;open:string;close:string;breaks:any[]}|null;
