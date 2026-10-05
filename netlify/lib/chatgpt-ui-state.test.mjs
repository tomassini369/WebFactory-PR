import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source=await readFile(new URL('../../src/chatgpt-ui-state.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {canApproveInWebFactory,chatgptError,proposalStatus}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('New MCP proposals never offer approval in WebFactory, including false confirmation flag',()=>{
  const pending={status:'pending',expiresAt:200};
  assert.equal(canApproveInWebFactory({...pending,requiresChatConfirmation:false},100),false);
  assert.equal(canApproveInWebFactory({...pending,requiresChatConfirmation:true},100),false);
  assert.equal(canApproveInWebFactory(pending,100),true);
  assert.equal(canApproveInWebFactory(pending,300),false);
  assert.equal(canApproveInWebFactory({...pending,status:'completed'},100),false);
});
test('Authentication and fallback errors respect selected language',()=>{
  assert.match(chatgptError(401,'Authentication required.','en'),/^Sign in/);
  assert.match(chatgptError(401,'Authentication required.','es'),/^Inicia sesión/);
  assert.match(chatgptError(0,undefined,'es'),/^No se pudo/);
});
test('Proposal statuses are translated without hiding unknown states',()=>{
  assert.equal(proposalStatus('review_required','es'),'Requiere revisión');
  assert.equal(proposalStatus('completed','en'),'Completed');
  assert.equal(proposalStatus('pending','es'),'Pendiente');
  assert.equal(proposalStatus('future_state','es'),'future_state');
});
test('Failed connection refresh clears stale permissions and propagates failure',async()=>{
  const page=await readFile(new URL('../../src/ChatgptControlPage.tsx',import.meta.url),'utf8');
  assert.match(page,/catch\(e\)\{setData\(null\);setSite\(''\)/);
  assert.match(page,/throw e\}\}/);
  assert.match(page,/canApproveInWebFactory\(p\)/);
});
