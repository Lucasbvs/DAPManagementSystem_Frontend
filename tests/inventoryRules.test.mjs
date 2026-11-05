import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/services/inventoryRules.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {stockByColor,priceOrderError,LOW_STOCK_LIMIT}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('stock por color suma tallas y normaliza nombres, sin falsos avisos por talla',()=>{
 const colors=stockByColor([{color:'Rojo',talla:'S',cantidad_stock:1},{color:' rojo ',talla:'M',cantidad_stock:2},{color:'Azul',talla:'S',cantidad_stock:2},{color:'Negro',talla:null,cantidad_stock:0}]);
 assert.deepEqual(colors,[{color:'Rojo',quantity:3},{color:'Azul',quantity:2},{color:'Negro',quantity:0}]);
 assert.deepEqual(colors.filter(c=>c.quantity<=LOW_STOCK_LIMIT).map(c=>c.color),['Azul','Negro']);
});
test('precios estrictamente decrecientes y descuentos opcionales independientes',()=>{
 for(const [u,q,h] of [['100','90','80'],['100',null,null],['100','90',null],['100',null,'80'],['100','','']])assert.equal(priceOrderError(u,q,h),'');
 for(const [u,q,h] of [['100','100','80'],['100','101',null],['100','90','90'],['100','90','95'],['100',null,'100'],['100',null,'101']])assert.notEqual(priceOrderError(u,q,h),'');
});
