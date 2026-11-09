import test from 'node:test';import assert from 'node:assert/strict';import {publicContact} from '../functions/dmca-public-contact.mjs';
const input={status:'active',name:'Example operator',organization:'Example operator',address:'Example mailing address',phone:'555-0100',email:'agent@example.invalid',registration:'DMCA-123',secret:'never expose'};
test('public designation exposes only explicitly configured contact fields',()=>{const result=publicContact(JSON.stringify(input));assert.equal(result.registration,'DMCA-123');assert(!JSON.stringify(result).includes('never expose'));assert.equal(Object.keys(result).length,7)});
test('unverified, absent, malformed or incomplete registration does not claim an active agent',()=>{for(const value of ['',JSON.stringify({...input,status:'pending'}),JSON.stringify({...input,registration:'bad'}),JSON.stringify({...input,email:'bad'}),JSON.stringify({...input,address:''})])assert.equal(publicContact(value),null)});
test('the complete published public-contact response can be imported without selecting nested JSON',()=>{
 const flat=publicContact(JSON.stringify(input));
 const wrapped=publicContact(JSON.stringify({ok:true,contact:input,private:'never expose wrapper fields'}));
 assert.deepEqual(wrapped,flat);assert(!JSON.stringify(wrapped).includes('never expose'));
});
test('public-response import keeps active designation and field validation mandatory',()=>{
 for(const value of [{ok:false,contact:input},{ok:true,contact:{...input,status:'pending'}},{ok:true,contact:{...input,email:'bad'}},{ok:true,contact:{}},{ok:true,contact:[]},{ok:true,contact:'invalid'}])assert.equal(publicContact(JSON.stringify(value)),null);
});
