/** Format NANP numbers progressively without truncating international numbers. */
export function formatPhone(value:string){
 const digits=value.replace(/\D/g,'');
 const prefix=digits.startsWith('1')&&digits.length>10?'+1 ':'';
 const national=prefix?digits.slice(1):digits;
 if(national.length>10||(value.trim().startsWith('+')&&!prefix))return value;
 return prefix+[national.slice(0,3),national.slice(3,6),national.slice(6)].filter(Boolean).join('-');
}
