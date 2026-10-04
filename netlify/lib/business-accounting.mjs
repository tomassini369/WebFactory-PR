// Private owner ledger. Money is integer USD cents; time is integer minutes.
export const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export const emptyLedger = () => ({ revision: 0, entries: [] });
export function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw fail('Enter a valid date / Fecha inválida.');
  return value;
}
function integer(value, max = 100000000, min = 0) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw fail('Invalid amount or hours / Cantidad u horas inválidas.');
  return value;
}
const text = (value, max = 300) => String(value || '').trim().slice(0, max);
export function activeEntries(ledger) { const voided = new Set(ledger.entries.filter(e => e.type === 'void').map(e => e.targetId)); return ledger.entries.filter(e => e.type !== 'void' && !voided.has(e.id)); }
export function rateOn(entries, employeeId, date) { return entries.filter(e => e.type === 'rate' && e.employeeId === employeeId && e.date <= date).sort((a,b) => b.date.localeCompare(a.date))[0]; }
export function appendEntry(ledger, input, site, actor, now = new Date().toISOString()) {
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(input.id || '')) throw fail('Stable entry ID required.');
  const duplicate = ledger.entries.find(e => e.id === input.id);
  if (duplicate) return ledger; // Safe retry after a lost response; no second write.
  if (input.revision !== ledger.revision) throw fail('Reload: another owner changed this ledger / Recarga los datos.', 409);
  const entries = activeEntries(ledger);
  let entry = { id: input.id, type: input.type, date: day(input.date), createdAt: now, createdBy: actor, note: text(input.note) };
  const employee = (site.employees || []).find(e => e.id === input.employeeId);
  if (['rate','work','allocation'].includes(input.type) && !employee) throw fail('Choose a saved employee / Selecciona un empleado guardado.');
  if (employee) entry = { ...entry, employeeId: employee.id, employeeName: employee.name || employee.nameEn || employee.nameEs || employee.id };
  if (input.type === 'rate') {
    if (entries.some(e => e.type === 'rate' && e.employeeId === employee.id && e.date === entry.date)) throw fail('A rate already exists for this date. Void it before replacing it.',409);
    entry.hourlyCents = integer(input.hourlyCents, 10000000);
  } else if (input.type === 'work') {
    const rate = rateOn(entries, employee.id, entry.date);
    if (!rate) throw fail('Set an hourly rate effective on this work date / Asigna el salario primero.',409);
    entry.regularMinutes = integer(input.regularMinutes,1440);
    entry.overtimeMinutes = integer(input.overtimeMinutes,1440);
    if (!entry.regularMinutes && !entry.overtimeMinutes) throw fail('Enter worked hours.');
    const existingMinutes = entries.filter(e => e.type === 'work' && e.employeeId === employee.id && e.date === entry.date).reduce((s,e) => s+e.regularMinutes+e.overtimeMinutes,0);
    if (existingMinutes + entry.regularMinutes + entry.overtimeMinutes > 1440) throw fail('Daily hours exceed 24 / Las horas exceden 24.');
    entry.hourlyCents = rate.hourlyCents; entry.rateId = rate.id;
    entry.overtimeHourlyCents = entry.overtimeMinutes ? integer(input.overtimeHourlyCents,10000000,1) : 0;
    entry.commissionCents = integer(input.commissionCents);
    entry.tipCents = integer(input.tipCents);
    entry.baseCents = Math.round(entry.regularMinutes * entry.hourlyCents / 60);
    entry.overtimeCents = Math.round(entry.overtimeMinutes * entry.overtimeHourlyCents / 60);
    entry.amountCents = entry.baseCents + entry.overtimeCents + entry.commissionCents + entry.tipCents;
    entry.approved = false;
  } else if (input.type === 'approve' || input.type === 'payment') {
    const work = entries.find(e => e.type === 'work' && e.id === input.targetId);
    if (!work) throw fail('Work entry not found.',404);
    const approved = entries.some(e => e.type === 'approve' && e.targetId === work.id);
    if (entry.date < work.date) throw fail('Approval or payment cannot precede the work date.');
    entry.targetId = work.id; entry.employeeId = work.employeeId; entry.employeeName = work.employeeName;
    if (input.type === 'approve') { if (approved) throw fail('Already approved.',409); }
    else {
      if (!approved) throw fail('Approve hours before recording payment.',409);
      entry.amountCents = integer(input.amountCents,work.amountCents,1);
      const paid = entries.filter(e => e.type === 'payment' && e.targetId === work.id).reduce((s,e) => s+e.amountCents,0);
      if (paid + entry.amountCents > work.amountCents) throw fail('Payment exceeds remaining gross amount.',409);
    }
  } else if (input.type === 'expense') {
    if (!['operations','material_consumption','inventory_purchase'].includes(input.category)) throw fail('Choose an expense category.');
    entry.category = input.category; entry.description = text(input.description);
    if (!entry.description) throw fail('Description required.');
    entry.amountCents = integer(input.amountCents,100000000,1);
    entry.reference = text(input.reference);
    entry.itemId = text(input.itemId,120);
    if (entry.itemId && !(site.catalog || []).some(e => e.id === entry.itemId)) throw fail('Catalog item not found.');
    entry.quantity = integer(input.quantity,1000000);
    entry.unitCostCents = entry.quantity ? Math.round(entry.amountCents / entry.quantity) : 0;
  } else if (input.type === 'allocation') {
    entry.transactionId = text(input.transactionId,120);
    if (!entry.transactionId) throw fail('Transaction required.');
    if (entries.some(e => e.type === 'allocation' && e.transactionId === entry.transactionId)) throw fail('Transaction already assigned. Void its allocation first.',409);
  } else if (input.type === 'void') {
    const target = entries.find(e => e.id === input.targetId);
    if (!target || ['approve','void'].includes(target.type)) throw fail('Entry cannot be voided.',409);
    if (!entry.note) throw fail('A correction reason is required / Indica el motivo.');
    if (target.type === 'rate' && entries.some(e => e.type === 'work' && e.rateId === target.id)) throw fail('Rate is used by work records. Add a new effective rate.',409);
    if (target.type === 'work' && entries.some(e => e.type === 'payment' && e.targetId === target.id)) throw fail('Void its payment records first.',409);
    entry.targetId = target.id; entry.employeeId = target.employeeId || ''; entry.employeeName = target.employeeName || ''; 
  } else throw fail('Unknown ledger action.');
  const result = { ...ledger, revision: ledger.revision + 1, entries: [...ledger.entries, entry] };
  if (result.entries.length > 5000 || Buffer.byteLength(JSON.stringify(result)) > 2*1024*1024) throw fail('Ledger capacity reached. Contact support; no records were discarded.',413);
  return result;
}
export function localDay(value, timeZone = 'America/Puerto_Rico') {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function accountingReport(ledger, transactions, site, from, to, employeeFilter = '') {
  day(from); day(to); if (from > to) throw fail('Start date must precede end date.');
  const entries = activeEntries(ledger), within = date => date >= from && date <= to;
  const matches = e => !employeeFilter || e.employeeId === employeeFilter;
  const work = entries.filter(e => e.type === 'work' && within(e.date) && matches(e)).map(e => {
    const approved = entries.some(a => a.type === 'approve' && a.targetId === e.id);
    const paidCents = entries.filter(a => a.type === 'payment' && a.targetId === e.id && a.date <= to).reduce((s,a) => s+a.amountCents,0);
    return {...e, approved, paidCents, pendingCents: approved ? e.amountCents-paidCents : 0};
  });
  const allocations = new Map(entries.filter(e => e.type === 'allocation').map(e => [e.transactionId,e.employeeId]));
  const sales = [...new Map(transactions.map(e => [e.transactionId,e])).values()].filter(e => within(localDay(e.paidAt || e.createdAt,site.settings?.timezone || 'America/Puerto_Rico'))).map(e => {
    const employeeId = allocations.get(e.transactionId) || e.employeeId || '';
    const paid = ['paid','paid_in_person','partially_refunded','refunded'].includes(e.paymentStatus);
    const grossCents = paid ? Math.max(0,Number(e.amountTotal)||0) : 0;
    const refundCents = paid ? Math.min(grossCents,Math.max(0,Number(e.refundedAmount)||0)) : 0;
    const taxCents = paid ? Math.max(0,Number(e.tax)||0) : 0, tipCents = paid ? Math.max(0,Number(e.tip)||0) : 0;
    const revenueCents = Math.max(0,grossCents-taxCents-tipCents);
    // Refund components are not recorded by legacy commerce: explicitly estimated pro rata.
    const estimatedRevenueCents = grossCents ? Math.round(revenueCents*(grossCents-refundCents)/grossCents) : 0;
    return {transactionId:e.transactionId,employeeId,kind:e.kind,date:localDay(e.paidAt||e.createdAt,site.settings?.timezone||'America/Puerto_Rico'),status:e.paymentStatus,currency:e.currency||'usd',subtotalCents:Number(e.subtotal)||0,discountCents:Number(e.discounts)||0,grossCents,refundCents,taxCents,tipCents,estimatedRevenueCents,review:!paid||Boolean(refundCents)||!employeeId};
  }).filter(matches);
  const expenses = entries.filter(e => e.type === 'expense' && within(e.date) && matches(e));
  const sum = (rows,key) => rows.reduce((s,e) => s+(e[key]||0),0);
  const approved = work.filter(e => e.approved);
  const salaryCents = sum(approved,'baseCents')+sum(approved,'overtimeCents')+sum(approved,'commissionCents');
  const operatingCents = sum(expenses.filter(e=>e.category==='operations'),'amountCents');
  const materialsCents = sum(expenses.filter(e=>e.category==='material_consumption'),'amountCents');
  const purchaseCents = sum(expenses.filter(e=>e.category==='inventory_purchase'),'amountCents');
  const estimatedRevenueCents = sum(sales,'estimatedRevenueCents');
  const inventory = (site.catalog||[]).filter(item=>item.type==='product'&&item.trackInventory).map(item=>{const purchase=entries.filter(e=>e.type==='expense'&&e.category==='inventory_purchase'&&e.itemId===item.id&&e.quantity>0&&e.date<=to).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0];return {itemId:item.id,name:item.name||item.nameEn||item.nameEs||item.id,quantityNow:Number(item.inventory)||0,unitCostCents:purchase?.unitCostCents??null,estimatedValueCents:purchase?Math.round((Number(item.inventory)||0)*purchase.unitCostCents):null,valuationBasis:'Current stock, last recorded purchase cost; not historical inventory'};});
  const employees = [...new Set([...(site.employees||[]).map(e=>e.id),...entries.map(e=>e.employeeId).filter(Boolean)])].filter(id=>!employeeFilter||id===employeeFilter).map(id => {
    const rows=work.filter(e=>e.employeeId===id&&e.approved), rate=rateOn(entries,id,to);
    return {employeeId:id,name:(site.employees||[]).find(e=>e.id===id)?.name||entries.find(e=>e.employeeId===id)?.employeeName||id,hourlyCents:rate?.hourlyCents??null,regularMinutes:sum(rows,'regularMinutes'),overtimeMinutes:sum(rows,'overtimeMinutes'),salaryCents:sum(rows,'baseCents')+sum(rows,'overtimeCents'),commissionCents:sum(rows,'commissionCents'),tipCents:sum(rows,'tipCents'),grossCents:sum(rows,'amountCents'),paidCents:sum(rows,'paidCents'),pendingCents:sum(rows,'pendingCents'),estimatedRevenueCents:sum(sales.filter(e=>e.employeeId===id),'estimatedRevenueCents')};
  });
  return {from,to,employeeFilter,inventory,employees,work,sales,expenses,entries:ledger.entries.filter(e=>within(e.date)&&matches(e)),summary:{estimatedRevenueCents,salaryCents,operatingCents,materialsCents,purchaseCents,estimatedResultCents:estimatedRevenueCents-salaryCents-operatingCents-materialsCents,regularMinutes:sum(approved,'regularMinutes'),overtimeMinutes:sum(approved,'overtimeMinutes'),paidCents:sum(approved,'paidCents'),pendingCents:sum(approved,'pendingCents'),taxCents:sum(sales,'taxCents'),tipCents:sum(sales,'tipCents'),refundCents:sum(sales,'refundCents'),unassignedRevenueCents:sum(sales.filter(e=>!e.employeeId),'estimatedRevenueCents')}};
}
export function csvCell(value) { const raw=String(value??''); return `"${(/^[\s]*[=+@\-]/.test(raw)?"'":'')+raw.replaceAll('"','""')}"`; }
export function reportCsv(report, ledger) {
  const rows=[['section','id','date','employee_id','field','value','unit']];
  const add=(section, records)=>records.forEach(r=>Object.entries(r).forEach(([k,v])=>rows.push([section,r.id||r.transactionId||r.employeeId||'',r.date||'',r.employeeId||'',k,k.endsWith('Cents')&&v!==null?(v/100).toFixed(2):v,k.endsWith('Cents')?'USD':k.endsWith('Minutes')?'minutes':''])));
  add('summary',[report.summary]);add('inventory_current_snapshot',report.inventory);add('employees',report.employees);add('work',report.work);add('sales',report.sales);add('expenses',report.expenses);add('audit',report.entries);add('rate_history',ledger.entries.filter(e=>e.type==='rate'&&e.date<=report.to&&(!report.employeeFilter||e.employeeId===report.employeeFilter)));
  rows.push(['notes','','','','basis','Work-date accrual; paid amounts through end date. Sales grouped by original payment date; refunds are cumulative, allocated proportionally to estimate revenue. Inventory purchases excluded from result; record consumption separately. No tax filing, withholding or net payroll calculation. Inventory quantity is a cost reference, not a stock adjustment.','']);
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
