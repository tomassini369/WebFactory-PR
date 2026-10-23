import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = (relativePath) => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("Google Workspace OAuth integrations request separate, minimal scopes", () => {
  const gmail = source("../functions/business-email-google-start.mjs");
  const calendar = source("../functions/google-calendar-start.mjs");
  assert.match(gmail, /auth\/gmail\.send/);
  assert.doesNotMatch(gmail, /auth\/gmail\.(?:readonly|modify|full|metadata)/);
  assert.doesNotMatch(gmail, /auth\/calendar/);
  assert.match(calendar, /auth\/calendar\.events/);
  assert.match(calendar, /auth\/calendar\.events\.freebusy/);
  assert.doesNotMatch(calendar, /auth\/gmail/);
});

test("Factory AI does not directly read Google Workspace APIs or OAuth tokens", () => {
  const assistant = source("../functions/builder-ai.mjs");
  assert.doesNotMatch(assistant, /gmail\.googleapis\.com|\/calendar\/v3|googleApi\(|refreshGoogleToken|refreshGoogleBusinessEmailToken/);
  assert.match(assistant, /const userPayload = \{/);
  assert.match(assistant, /current:\s*\{/);
  assert.match(assistant, /business:\s*\{/);
  assert.match(assistant, /catalog:\s*Array\.isArray\(current\?\.catalog\)/);
});

test("Google Limited Use disclosure and pre-authorization notices exist in both languages", () => {
  const legal = source("../../src/LegalPage.tsx");
  const calendar = source("../../src/ClientAdminPage.tsx");
  const gmail = source("../../src/ClientAdminV3Panels.tsx");
  assert.match(legal, /including the Limited Use requirements/);
  assert.match(legal, /Uso Limitado \(Limited Use\)/);
  assert.match(legal, /generalized or foundational AI/);
  assert.match(legal, /modelos generalizados o fundamentales/);
  for (const page of [calendar, gmail]) {
    assert.match(page, /href="\/privacy"/);
    assert.match(page, /Política de Privacidad/);
    assert.match(page, /Privacy Policy/);
  }
});
