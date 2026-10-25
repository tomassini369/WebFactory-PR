import test from 'node:test';
import assert from 'node:assert/strict';
import {errorResponse} from './client-auth.mjs';
test('unexpected provider errors cannot leak personal data into API responses or logs',async()=>{
 const original=console.error,logs=[];console.error=(...args)=>logs.push(args);
 try{const error=Object.assign(new Error('buyer@example.invalid provider private payload'),{status:503,raw:{token:'secret-payment-token'}});const response=errorResponse(error);assert.equal(response.status,503);const serialized=JSON.stringify({body:await response.json(),logs});assert(!serialized.includes('buyer@example.invalid'));assert(!serialized.includes('secret-payment-token'));assert.deepEqual(logs,[['client-api',{status:503}]]);}finally{console.error=original}
});
