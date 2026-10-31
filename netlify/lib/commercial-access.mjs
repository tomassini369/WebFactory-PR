// Commercial roles are deliberately separate from internal platform authority.
export const COMMERCIAL_ROLES = ['owner', 'employee'];
export const EMPLOYEE_GRANTS = ['pos', 'collect', 'orders', 'kitchen', 'individualStats', 'availabilityRequests'];
export const activeMembership = member => Boolean(member && !member.revokedAt && !member.suspendedAt && !['revoked','suspended'].includes(member.status));
export const isBusinessOwner = member => (member?.role === 'owner' || member?.role === 'admin' && member.platform === true);
const denied = message => Object.assign(new Error(message), {status:403});
export const ownerCapabilities = ['overview','website','share','orders','bookings','customers','catalog','employees','payments','pos','collect','marketing','analytics','integrations','settings','billing','refunds','kitchen'];
export function commercialCapabilities(member) {
  if (!activeMembership(member)) return [];
  if (isBusinessOwner(member)) return [...ownerCapabilities];
  if (member?.role !== 'employee') return [];
  return ['overview','bookings', ...EMPLOYEE_GRANTS.filter(key => member.permissions?.[key] === true)];
}
export function inAssignedLocation(site, member, record) {
  if (isBusinessOwner(member)) return true;
  const hasLocations = (site.business?.locations || []).some(location => location.active !== false);
  return hasLocations ? Boolean(record.locationId && member.locationIds?.includes(record.locationId)) : !record.locationId;
}
export function canAccessCommerce(site, member, record) {
  if (!activeMembership(member) || !record || record.siteId && record.siteId !== site.siteId) return false;
  if (isBusinessOwner(member)) return true;
  if (member.role !== 'employee' || !inAssignedLocation(site,member,record)) return false;
  if (record.kind === 'booking') return Boolean(member.employeeId && record.employeeId === member.employeeId);
  return record.kind === 'order' && (member.permissions?.orders === true || member.permissions?.kitchen === true && Boolean(record.queueNumber));
}
export function assertCommerceAction(site, member, record, action) {
  if (!canAccessCommerce(site,member,record)) throw denied('This record is not assigned to you. / Este registro no está asignado a ti.');
  if (isBusinessOwner(member)) return;
  const allowed = record.kind === 'booking' ? ['confirm','complete', ...(member.permissions?.collect === true ? ['mark_paid'] : [])] : [ ...(member.permissions?.kitchen === true ? ['kitchen_status'] : []), ...(member.permissions?.collect === true && member.permissions?.orders === true ? ['mark_paid'] : []) ];
  if (!allowed.includes(action)) throw denied('The owner has not authorized this action. / El Dueño no ha autorizado esta acción.');
}
// Explicit allowlists: private provider credentials, PINs, management links and
// salary data must never reach an employee browser, even in a hidden panel.
export function employeeCommerceRecord(record, member) {
  if (isBusinessOwner(member)) return record;
  const keys = ['transactionId','siteId','kind','employeeId','serviceId','locationId','locationName','start','end','status','paymentStatus','createdAt','updatedAt','completedAt','queueNumber','kitchenStatus','cashReceiptPending'];
  const result = Object.fromEntries(keys.filter(key => record[key] !== undefined).map(key => [key,record[key]]));
  result.customer = {name: record.customer?.name || '', ...(record.kind === 'booking' ? {email:record.customer?.email || '',phone:record.customer?.phone || ''} : {})};
  result.items = (record.items || []).map(item => ({id:item.id,name:item.name,quantity:item.quantity, ...(member.permissions?.collect === true ? {unitAmount:item.unitAmount} : {})}));
  if (member.permissions?.collect === true) for (const key of ['amountTotal','subtotal','tax','discounts','tip','bookingTotalCents']) if (record[key] !== undefined) result[key] = record[key];
  return result;
}
export function employeeSiteView(site, member) {
  if (isBusinessOwner(member)) return site;
  const professional = member.employeeId ? (site.employees || []).find(employee => employee.id === member.employeeId) : null;
  const pos = member.permissions?.pos === true;
  return {siteId:site.siteId,slug:site.slug,status:site.status,revision:site.revision,
    business:{name:site.business?.name,nameEn:site.business?.nameEn,nameEs:site.business?.nameEs,category:site.business?.category,logoAssetKey:site.business?.logoAssetKey,locations:(site.business?.locations || []).filter(location => member.locationIds?.includes(location.id)).map(({id,name,hours})=>({id,name,hours}))},
    design:{primary:site.design?.primary,secondary:site.design?.secondary},
    catalog:(site.catalog || []).filter(item => item.active !== false && (pos || professional?.serviceIds?.includes(item.id))).map(item=>Object.fromEntries(['id','type','name','nameEn','nameEs','description','descriptionEn','descriptionEs','price','active','inventory','trackInventory','allowBackorder','taxable','taxRateOverride','sku','imageAssetKey','requiresAppointment','duration','bufferMinutes'].filter(key=>item[key]!==undefined).map(key=>[key,item[key]]))),
    employees:professional?[{id:professional.id,name:professional.name,role:professional.role,active:professional.active,serviceIds:professional.serviceIds,locationIds:professional.locationIds,schedule:professional.schedule,timeOff:(professional.timeOff || []).map(({start,end})=>({start,end})),dailyLimit:professional.dailyLimit}]:[],
    hours:site.hours || {}, settings:{locale:site.settings?.locale,timezone:site.settings?.timezone,currency:site.settings?.currency},
    taxConfig:pos?site.taxConfig:undefined,features:pos?site.features:{},
    paymentRules:pos?{methods:site.paymentRules?.methods,stripeReady:Boolean(site.paymentRules?.stripeConnectedAccountId),allowTips:site.paymentRules?.allowTips}:{}
  };
}
export function assertPosLocation(site, member, input) {
  if (isBusinessOwner(member)) return;
  if (!inAssignedLocation(site,member,input)) throw denied('Choose an authorized branch. / Selecciona una sucursal autorizada.');
}

export function assertOwnPosRecord(site,member,user,record) {
  if(isBusinessOwner(member))return;
  if (!record || (record.createdById ? record.createdById !== user.id : record.createdBy !== user.email)) throw denied('POS record not assigned to this operator.');
  assertPosLocation(site,member,record);
}
