'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const seed=require('./risk-seed-v252.js');
const api=require('./risk-catalog-v243.js');
const css=fs.readFileSync(path.join(__dirname,'risk-selector-v243.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=fs.readFileSync(path.join(__dirname,'risk-catalog-v243.js'),'utf8');
function node(tag){
 return {
  tagName:tag,children:[],listeners:{},attributes:{},hidden:false,
  isConnected:true,textContent:'',value:'',
  append(...nodes){this.children.push(...nodes)},
  replaceChildren(...nodes){this.children=nodes},
  addEventListener(name,fn){this.listeners[name]=fn},
  setAttribute(name,value){this.attributes[name]=value},
  click(){this.listeners.click?.()},
  get classList(){return {add(){},remove(){}};}
 };
}
function mountPicker(initial=[]){
 const old=global.document,local=global.localStorage;
 global.document={createElement:node};
 global.localStorage={getItem:()=>null,setItem(){}};
 const host=node('div');
 let section;
 try{section=api.mount(host,initial);}finally{
  global.document=old;global.localStorage=local;
 }
 return {host,section,search:section.children[2],status:section.children[3],
  selected:section.children[4],results:section.children[5]};
}
test('F-253-01 catálogo no aparece hasta buscar',()=>{
 assert.equal(api.shouldShowResults(''),false);
 assert.equal(api.shouldShowResults(' \n \t'),false);
 assert.equal(api.shouldShowResults('caída'),true);
});
test('F-253-02 no se muestran los 40 riesgos iniciales',()=>{
 const screen=mountPicker();
 assert.equal(screen.results.hidden,true);
 assert.equal(screen.results.children.length,0);
 assert.match(screen.status.textContent,/Escribe un término/);
});
test('F-253-03 buscar activa resultados y reconoce tildes',()=>{
 const screen=mountPicker();
 screen.search.value='caida';
 screen.search.listeners.input();
 assert.equal(screen.results.hidden,false);
 assert.ok(screen.results.children.length>0);
 assert.ok(screen.results.children.some(x=>/Caída/i.test(x.textContent)));
});
test('F-253-04 selección múltiple guardada aunque se limpie la búsqueda',()=>{
 const screen=mountPicker();
 screen.search.value='caida';screen.search.listeners.input();
 const item=screen.results.children.find(x=>/Caída/i.test(x.textContent));
 assert.ok(item);
 item.click();
 const chosen=api.selected();
 assert.equal(chosen.length,1);
 screen.search.value='';screen.search.listeners.input();
 assert.equal(screen.results.hidden,true);
 assert.equal(screen.results.children.length,0);
 assert.equal(screen.selected.children.length,2);
 const htmlRow=api.detailRow([null,null,null,null,null,[],{risks:chosen}],7);
 assert.match(htmlRow,/Riesgos vinculados/);
 assert.match(htmlRow,/Caída/);
});
test('F-253-05 riesgo guardado aparece al volver a editar, sin catálogo desplegado',()=>{
 const chosen=[{code:'R0041',name:'Exposición a ruido'}];
 const screen=mountPicker(chosen);
 assert.deepEqual(api.selected(),chosen);
 assert.equal(screen.results.hidden,true);
 assert.equal(screen.selected.children.length,2);
 assert.match(screen.selected.children[1].textContent,/Exposición a ruido/);
});
test('F-253-06 se pueden retirar los riesgos seleccionados',()=>{
 const screen=mountPicker([{code:'R0041',name:'Exposición a ruido'}]);
 screen.selected.children[1].click();
 assert.equal(api.selected().length,0);
 assert.equal(screen.results.hidden,true);
});
test('F-253-07 resultados realmente ocultos con CSS de retícula',()=>{
 assert.match(css,/\.hys243-risk-results\[hidden\]\{display:none!important\}/);
});
test('F-253-08 se mantiene un solo buscador en APR y OTROS',()=>{
 assert.match(html,/window\.Hys243Risks\.mount/);
 assert.match(html,/embeddedOtros\?"OTROS":"APR"/);
 assert.doesNotMatch(html,/Buscar actividad/);
});
test('F-253-09 no altera guardado e impresión de riesgos',()=>{
 assert.match(html,/risks:window\.Hys243Risks\.selected\(\)/);
 assert.match(html,/Hys243Risks\?\.detailRow/);
 assert.match(html,/label:'Riesgos vinculados',value:linked/);
});
test('F-253-10 buscador respeta filtros tolerantes a errores y sinónimos',()=>{
 const list=globalThis.HYS252_RISK_SEED?.risks||[];
 assert.ok(list.length===393);
 assert.ok(api.filterCatalog(list,'trabjo altura').some(x=>x.name==='Caída a distinto nivel'));
});
test('F-253-11 no se introducen escrituras centrales o llamadas externas',()=>{
 assert.doesNotMatch(code,/\bfetch\s*\(/);
 assert.doesNotMatch(code,/supabase\.from/);
});
