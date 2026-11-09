import {test} from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import ts from'typescript';
const {outputText}=ts.transpileModule(readFileSync(new URL('../src/utils/conversations.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}});
const {mergeDirectMessages,personInitials}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('message windows preserve history and deduplicate repeated deliveries with stable timestamp/ID order',()=>{
 const message=(id,time,body=id)=>({id,created_at:time,body});
 const merged=mergeDirectMessages([message('a','2026-11-03T10:00:00Z'),message('c','2026-11-03T11:00:00Z')],[message('b','2026-11-03T11:00:00Z'),message('c','2026-11-03T11:00:00Z','refreshed')]);
 assert.deepEqual(merged.map(x=>x.id),['a','b','c']);assert.equal(merged[2].body,'refreshed');assert.equal(mergeDirectMessages(merged,merged).length,3);
});
test('directory initials handle spaces and single names without exposing email addresses',()=>{
 assert.equal(personInitials('  Pessoa  Financeiro  '),'PF');assert.equal(personInitials('Pessoa'),'P');assert.equal(personInitials(''),'');
});
