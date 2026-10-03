import test from 'node:test';import assert from 'node:assert/strict';
import reminderHandler from '../functions/booking-reminders.mjs';
import backupHandler from '../functions/scheduled-tenant-backup.mjs';
import verifyHandler from '../functions/verify-tenant-backup.mjs';
import sitemapHandler from '../functions/tenant-sitemap.mjs';
test('scheduled jobs cannot access stores or providers from previews or unpublished production',async()=>{for(const context of [{deploy:{context:'deploy-preview',published:false}},{deploy:{context:'production',published:false}}]){await reminderHandler(new Request('https://preview.example'),context);await backupHandler(new Request('https://preview.example'),context)}});
test('backup scheduling stays disabled without explicit opt-in even in published production',async()=>{await backupHandler(new Request('https://example.com'),{deploy:{context:'production',published:true}})});
test('backup verification rejects foreign-origin writes before authentication/storage',async()=>{const response=await verifyHandler(new Request('https://example.com/.netlify/functions/verify-tenant-backup',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{"siteId":"business"}'}));assert.equal(response.status,403);assert.equal(response.headers.get('cache-control'),'no-store')});
test('preview sitemap stays empty and nonindexable, without reading production',async()=>{const response=await sitemapHandler(new Request('https://preview.example/sitemap.xml'),{deploy:{context:'deploy-preview'}});assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),'noindex');assert.ok(!(await response.text()).includes('<loc>'))});
