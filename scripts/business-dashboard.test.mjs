import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
// Compile the pure helper without browser/runtime dependencies on Node 22.
const source = await readFile(new URL('../src/business-dashboard-data.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { businessDateKey, validTimeZone, monthCells, shiftMonth, dashboardSummary } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('calendar handles leap years, six-row months and year boundaries', () => {
  assert.equal(monthCells('2024-02').filter(Boolean).length,29);
  assert.equal(monthCells('2026-11').filter(Boolean).length,30);
  assert.equal(monthCells('2026-11').length,42);
  assert.equal(monthCells('2026-11')[6],'2026-11-01');
  assert.equal(shiftMonth('2026-12',1),'2027-01');
  assert.equal(shiftMonth('2026-01',-1),'2025-12');
});
test('business date does not use the browser timezone at midnight', () => {
  assert.equal(businessDateKey('2026-10-04T02:30:00Z','America/Puerto_Rico'),'2026-10-03');
  assert.equal(businessDateKey('not-a-date','America/Puerto_Rico'),'');
  assert.equal(validTimeZone('invalid'),'America/Puerto_Rico');
});
test('sales use confirmed receipt dates, subtract refunds, and exclude unpaid sales', () => {
  const common={transactionId:'a',kind:'order',amountTotal:10000,paymentStatus:'paid',status:'completed',createdAt:'2026-09-01T12:00:00Z',paidAt:'2026-10-03T15:00:00Z',customer:{email:'CLIENT@EXAMPLE.COM'}};
  const result=dashboardSummary([common,{...common,transactionId:'b',paymentStatus:'partially_refunded',refundedAmount:2000},{...common,transactionId:'c',paymentStatus:'pending'},{...common,transactionId:'d',paymentStatus:'refunded'}],[],'America/Puerto_Rico',new Date('2026-10-03T19:00:00Z'));
  assert.equal(result.revenue,18000);
  assert.equal(result.days.at(-1).sales,18000);
  assert.equal(result.days.at(-1).orders,0);
  assert.equal(result.customers,1);
});
test('booking agenda excludes cancelled or invalid dates and orders upcoming appointments', () => {
  const booking=(id,start,status='confirmed')=>({transactionId:id,kind:'booking',amountTotal:0,paymentStatus:'pending',status,createdAt:'2026-10-01T12:00:00Z',start});
  const result=dashboardSummary([], [booking('late','2026-10-06T12:00:00Z'),booking('next','2026-10-04T12:00:00Z'),booking('cancelled','2026-10-04T13:00:00Z','cancelled'),booking('invalid','bad')], 'America/Puerto_Rico',new Date('2026-10-03T19:00:00Z'));
  assert.deepEqual(result.upcoming.map(record=>record.transactionId),['next','late']);
  assert.equal(result.activeBookings.length,2);
});
test('empty history produces zero totals without inventing activity', () => {
  const result=dashboardSummary([],[],'America/Puerto_Rico',new Date('2026-10-03T19:00:00Z'));
  assert.equal(result.revenue,0);assert.equal(result.customers,0);assert.equal(result.upcoming.length,0);
  assert.equal(result.days.length,7);assert(result.days.every(day=>day.sales===0&&day.orders===0&&day.bookings===0));
});
