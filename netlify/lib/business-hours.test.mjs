import test from 'node:test';
import assert from 'node:assert/strict';
import {businessHoursRows,completeBusinessHours,isBusinessTime} from '../../shared/business-hours.mjs';
test('an empty week is editable without activating or mutating missing days',()=>{
 const saved=Object.freeze({});const rows=businessHoursRows(saved);
 assert.equal(rows.length,7);assert(rows.every(row=>row.hours.enabled===false));assert.deepEqual(saved,{});
 const complete=completeBusinessHours(saved);assert.equal(Object.keys(complete).length,7);assert(Object.values(complete).every(day=>day.open==='09:00'&&day.close==='17:00'&&!day.enabled));
 assert.equal(businessHoursRows(null).length,7);
});
test('completing a partial week preserves English keys, breaks and current availability',()=>{
 const monday={enabled:true,open:'10:00',close:'19:00',breaks:[{start:'12:00',end:'13:00'}]};const saved={Monday:monday};
 const complete=completeBusinessHours(saved);assert.equal(Object.keys(complete).length,7);assert.deepEqual(complete.Monday,monday);assert.equal(complete.Lunes,undefined);assert.equal(complete.Martes.enabled,false);assert.deepEqual(saved,{Monday:monday});
});
test('the editor uses the same Spanish alias precedence as booking without deleting old data',()=>{
 const saved={Monday:{enabled:false,open:'09:00',close:'17:00'},Lunes:{enabled:true,open:'10:00',close:'18:00'}};
 const rows=businessHoursRows(saved);assert.equal(rows[0].key,'Lunes');assert.equal(rows[0].hours.enabled,true);assert.equal(new Set(rows.map(row=>row.en)).size,7);assert.deepEqual(completeBusinessHours(saved).Monday,saved.Monday);
});
test('clock validation accepts only supported local times',()=>{
 for(const value of ['00:00','09:00','23:59'])assert(isBusinessTime(value));
 for(const value of ['24:00','25:00','99:59','09:60','9:00','',null,undefined,900,{},[]])assert(!isBusinessTime(value));
});
