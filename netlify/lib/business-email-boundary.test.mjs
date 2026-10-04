import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const operational=[
  "client-notifications.mjs",
  "booking-management.mjs",
  "booking-reminders.mjs",
].map(name=>new URL(`./${name}`,import.meta.url));

test("customer-facing business mail modules do not import the WebFactory transactional transport",()=>{
  for(const file of operational){
    const source=fs.readFileSync(file,"utf8");
    assert.doesNotMatch(source,/from\s+["']\.\/email\.mjs["']/);
    assert.doesNotMatch(source,/\bsendEmail\b/);
    assert.match(source,/business-email\.mjs/);
  }
  for(const relative of ["../functions/client-contact.mjs","../functions/process-review-requests.mjs"]){
    const source=fs.readFileSync(new URL(relative,import.meta.url),"utf8");
    assert.doesNotMatch(source,/\.\/\.\.\/lib\/email\.mjs|\.\.\/lib\/email\.mjs/);
    assert.match(source,/business-email\.mjs/);
  }
});
