import test from 'node:test'
import assert from 'node:assert/strict'
import {availableCourses,acceptsStep,trainingCourses} from '../../src/training/curriculum.ts'
import {createPracticeRuntime} from '../../src/training/practice-runtime.mjs'
import {siteRoleCapabilities} from './client-auth.mjs'
const scope=(role,extra={})=>({role,siteId:'unit-site',userId:'unit-user',capabilities:siteRoleCapabilities(role),category:'Retail',operations:{cashierEnabled:true,displayEnabled:true},...extra})
test('courses follow the authenticated role capability set',()=>{
 const employee=availableCourses(scope('employee')).map(course=>course.id)
 for(const id of ['catalog','pos','team','accounting','settings','billing','builder','kiosk'])assert(!employee.includes(id),id)
 assert(!employee.includes('workforce'));assert(employee.includes('my-bookings'))
 const cashier=availableCourses(scope('employee',{capabilities:['overview','bookings','pos']})).map(course=>course.id)
 assert(cashier.includes('pos-cart'));assert(!cashier.includes('pos'));assert(!cashier.includes('catalog'));assert(!cashier.includes('accounting'))
})
test('disabled cashier/display modules are absent from the training library',()=>{
 const courses=availableCourses(scope('owner',{operations:{cashierEnabled:false,displayEnabled:false}})).map(course=>course.id)
 assert(!courses.includes('pos'));assert(!courses.includes('display'))
 const employee=availableCourses(scope('employee',{capabilities:['overview','bookings','pos'],operations:{cashierEnabled:false}})).map(course=>course.id)
 assert(!employee.includes('pos-cart'))
})
test('kitchen practice appears for food businesses using existing capabilities',()=>{
 assert(!availableCourses(scope('owner')).some(course=>course.id==='kitchen'))
 assert(availableCourses(scope('owner',{category:'Restaurant',operations:{profile:'restaurant',cashierEnabled:true}})).some(course=>course.id==='kitchen'))
})
test('practice action steps cannot be skipped by a manual next/read event',()=>{
 const runtime=createPracticeRuntime(scope('owner'))
 for(const course of trainingCourses)for(const step of course.steps.filter(step=>!step.read)){
  assert.equal(acceptsStep(step,{name:'next'},runtime),false,course.id+':'+step.id)
  assert.equal(acceptsStep(step,{name:'guide.acknowledged',detail:{stepId:step.id}},runtime),false,course.id+':'+step.id)
 }
})
test('read acknowledgments are restricted to the current step identifier',()=>{
 const runtime=createPracticeRuntime(scope('owner')),step=trainingCourses.find(course=>course.id==='overview').steps[0]
 assert.equal(acceptsStep(step,{name:'guide.acknowledged',detail:{stepId:'other'}},runtime),false)
 assert.equal(acceptsStep(step,{name:'guide.acknowledged',detail:{stepId:step.id}},runtime),true)
})
test('POS quantity step requires the selected practice product and a changed quantity',()=>{
 const runtime=createPracticeRuntime(scope('owner')),step=trainingCourses.find(course=>course.id==='pos').steps.find(step=>step.id==='quantity')
 assert.equal(acceptsStep(step,{name:'ui.pos',detail:{cart:[{id:'practice-product',quantity:1}]}},runtime),false)
 assert.equal(acceptsStep(step,{name:'ui.pos',detail:{cart:[{id:'practice-product',quantity:2}]}},runtime),true)
})
test('retired workforce lessons are absent for every commercial role',()=>{assert(!trainingCourses.some(course=>course.id==='workforce'));});
test('course IDs and step IDs remain unique and every course has bilingual instructions',()=>{
 assert.equal(new Set(trainingCourses.map(course=>course.id)).size,trainingCourses.length)
 for(const course of trainingCourses){assert(course.steps.length>0);assert.equal(new Set(course.steps.map(step=>step.id)).size,course.steps.length);for(const step of course.steps){assert(step.target);assert(step.title.every(Boolean));assert(step.instruction.every(Boolean));assert(step.read||step.event)}}
})

test('employee learning follows each independent permission combination without owner-only actions',()=>{
 const keys=['pos','collect','orders','kitchen','individualStats','availabilityRequests'];
 for(let mask=0;mask<64;mask++){
  const capabilities=['overview','bookings',...keys.filter((_,i)=>mask&(1<<i))],courses=availableCourses(scope('employee',{capabilities})).map(course=>course.id);
  assert(!courses.includes('orders'));assert.equal(courses.includes('orders-employee'),capabilities.includes('orders'));
  assert.equal(courses.includes('pos'),capabilities.includes('pos')&&capabilities.includes('collect'));
  assert.equal(courses.includes('pos-cart'),capabilities.includes('pos')&&!capabilities.includes('collect'));
 }
});
