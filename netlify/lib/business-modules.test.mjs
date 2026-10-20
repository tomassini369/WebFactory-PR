import test from 'node:test';import assert from 'node:assert/strict';
import {businessModules,applyModuleSettings} from './business-modules.mjs';
import {emptyWorkforce,transitionWorkforce} from './workforce.mjs';
const site={siteId:'a'},user={id:'owner'},member={role:'owner'};
test('new tenants default to all optional modules disabled; historical attendance preferences are retained',()=>{
 assert.deepEqual(businessModules(emptyWorkforce('a')),{attendance:false,scheduling:false,payroll:false});
 const historical={...emptyWorkforce('a'),enabled:true,paidBreaks:true};
 assert.deepEqual(businessModules(historical),{attendance:true,scheduling:false,payroll:false});
 const next=transitionWorkforce(historical,{action:'configure_modules',operationId:'modules-123',modules:{attendance:true,scheduling:false,payroll:false}},site,user,member).state;
 assert.equal(next.enabled,true);assert.equal(next.paidBreaks,true);assert.equal(next.events.at(-1).action,'configure_modules');
});
test('unavailable payroll/scheduling fail closed without affecting booking settings or attendance history',()=>{
 const state={...emptyWorkforce('a'),shifts:[{id:'history',end:'2026-10-20'}]};
 for(const key of ['scheduling','payroll'])assert.throws(()=>applyModuleSettings(state,{modules:{attendance:false,scheduling:false,payroll:false,[key]:true}}),{status:409});
 const next=applyModuleSettings(state,{modules:{attendance:true,scheduling:false,payroll:false}});assert.deepEqual(next.shifts,state.shifts);assert.equal(next.paidBreaks,false);
 assert.throws(()=>applyModuleSettings({...state,shifts:[{end:null}]},{modules:{attendance:false,scheduling:false,payroll:false}}),{status:409});
 assert.throws(()=>transitionWorkforce(state,{action:'configure_modules',operationId:'modules-123',modules:{attendance:true,scheduling:false,payroll:false}},site,user,{role:'manager'}),{status:403});
});
