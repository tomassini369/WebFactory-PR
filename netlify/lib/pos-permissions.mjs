export function requirePosAdjustments(membership,payload){
 for(const field of ['discountCents','tipCents']){
  const value=Number(payload[field]??0);
  if(!Number.isSafeInteger(value)||value<0)throw Object.assign(new Error('Discount and tip must be nonnegative integer cents.'),{status:400});
  if(value>0&&!['owner','manager','admin'].includes(membership?.role))throw Object.assign(new Error('Discounts and tips require manager permission. / Descuentos y propinas requieren permiso de administrador.'),{status:403});
 }
}
