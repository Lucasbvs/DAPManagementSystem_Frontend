import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
const source=await readFile(new URL('../src/services/token.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {tokenStore}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
test('sin recordar: solo sessionStorage; no conserva token persistente anterior',()=>{
 localStorage.setItem('dap_token','old');tokenStore.set('short',false);
 assert.equal(localStorage.getItem('dap_token'),null);assert.equal(sessionStorage.getItem('dap_token'),'short');assert.equal(tokenStore.get(),'short');
});
test('recordar: persiste en localStorage y sobrevive nueva sesión de pestaña',()=>{
 tokenStore.set('long',true);assert.equal(sessionStorage.getItem('dap_token'),null);
 globalThis.sessionStorage=storage();assert.equal(tokenStore.get(),'long');
});
test('logout elimina ambos almacenamientos',()=>{
 sessionStorage.setItem('dap_token','other');tokenStore.clear();assert.equal(tokenStore.get(),null);assert.equal(localStorage.getItem('dap_token'),null);
});
