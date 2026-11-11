const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const {createInterface}=require('node:readline/promises');

function validarDestino(config){
 const url=new URL(config.url);
 assert.ok(['127.0.0.1','[::1]'].includes(url.hostname)&&url.protocol==='http:'&&url.port
  &&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash,
 'La prueba requiere una instancia Supabase local en loopback y un puerto explícito.');
 const key=config.publicKey;
 assert.equal(typeof key,'string','Falta la clave pública local.');
 if(!key.startsWith('sb_publishable_')){
  let claims;
  try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{}
  assert.ok(claims?.role==='anon'&&claims.ref!=='ujfsugivgysyhboyirtz',
   'Solo se admite una clave anon local o publishable.');
 }
 return url.origin;
}

async function verificar(config,{checkpoint,report=()=>{}}={}){
 const origin=validarDestino(config);
 const reports=config.reports;
 const ids=[reports?.allowedApr,reports?.otherAreaApr,reports?.otherModule];
 assert.ok(ids.every(id=>typeof id==='string'&&/^v242-[\da-f-]{36}$/i.test(id))&&new Set(ids).size===3,
  'Configura tres IDs ficticios distintos.');
 const accounts=[config.author,config.viewer];
 assert.ok(accounts.every(account=>typeof account?.email==='string'&&typeof account?.password==='string'&&account.password)
  &&accounts[0].email!==accounts[1].email,'Configura dos cuentas de prueba distintas.');

 async function request(path,body,token){
  const headers={apikey:config.publicKey,'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  else if(!config.publicKey.startsWith('sb_publishable_'))headers.Authorization='Bearer '+config.publicKey;
  const response=await fetch(origin+path,{method:'POST',headers,body:JSON.stringify(body),
   redirect:'error',signal:AbortSignal.timeout(8000)});
  const data=await response.json();
  return {status:response.status,data};
 }
 async function login(account,label){
  const result=await request('/auth/v1/token?grant_type=password',account);
  assert.ok(result.status===200&&typeof result.data.access_token==='string'&&result.data.user?.id,
   'Falló el inicio de sesión de '+label+' (HTTP '+result.status+').');
  return {token:result.data.access_token,id:result.data.user.id};
 }
 const load=(id,token,pdf=true)=>request('/rest/v1/rpc/hys242_cargar_informe',{p_id:id,p_pdf:pdf},token);
 const list=async(module,token)=>{
  const result=await request('/rest/v1/rpc/hys242_consultar_informes',{
   p_modulo:module,p_pagina:0,p_filtros:{proyecto:config.projectMarker}
  },token);
  assert.ok(result.status===200&&Array.isArray(result.data),'Falló el listado de '+module+'.');
  return result.data.map(row=>row.id);
 };
 function checkPdf(result,id,module,label){
  const pdf=result.data?.archivo?.pdf;
  assert.ok(result.status===200&&result.data?.id===id&&result.data?.modulo===module
    &&typeof pdf==='string'&&Buffer.from(pdf,'base64').subarray(0,5).toString()==='%PDF-',
   'No se recuperó el PDF de '+label+' (HTTP '+result.status+').');
 }
 function denied(result,label){
  assert.ok(result.status===403&&result.data?.code==='42501','El control de acceso falló para '+label+'.');
 }
 assert.ok(typeof config.projectMarker==='string'&&/^QA-[a-z0-9-]+$/i.test(config.projectMarker),
  'Identifica los datos ficticios mediante un proyecto QA único.');
 const author=await login(config.author,'elaborador');
 const viewer=await login(config.viewer,'consulta');
 assert.notEqual(author.id,viewer.id,'Se requiere una identidad distinta por cuenta.');
 for(const [id,module] of [[ids[0],'APR'],[ids[1],'APR'],[ids[2],'OTROS']]){
  const result=await load(id,author.token);
  checkPdf(result,id,module,'elaborador');
  assert.equal(result.data.creador_id,author.id,'El informe de prueba debe pertenecer al elaborador.');
 }
 checkPdf(await load(ids[0],viewer.token),ids[0],'APR','consulta autorizada');
 const metadata=await load(ids[0],viewer.token,false);
 assert.ok(metadata.status===200&&metadata.data?.archivo===null,'La consulta sin PDF debe omitir el archivo.');
 assert.deepEqual(await list('APR',viewer.token),[ids[0]],'La cuenta de consulta solo debe listar el informe APR permitido.');
 assert.deepEqual(await list('OTROS',viewer.token),[],'El listado cruzado no debe devolver informes.');
 denied(await load(ids[1],viewer.token),'área ajena');
 denied(await load(ids[2],viewer.token),'tarjeta ajena');
 const anonymous=await load(ids[0],null);
 assert.ok([401,403].includes(anonymous.status),'La descarga anónima debe estar bloqueada.');
 report('Acceso positivo y aislamiento por área/tarjeta verificados.');
 if(!checkpoint)return {access:true,revocation:false};
 await checkpoint();
 denied(await load(ids[0],viewer.token),'permiso revocado con el mismo token');
 assert.deepEqual(await list('APR',viewer.token),[],'El listado retuvo el informe después de la revocación.');
 checkPdf(await load(ids[0],author.token),ids[0],'APR','elaborador después de revocar a consulta');
 report('Revocación con el mismo token y conservación del acceso del elaborador verificadas.');
 return {access:true,revocation:true};
}
if(require.main===module){
 (async()=>{
  const [file,flag]=process.argv.slice(2);
  assert.ok(file&&(!flag||flag==='--revocacion'),'Uso: node verificar-supabase-auth.cjs ruta-config.json [--revocacion]');
  const config=JSON.parse(await readFile(file,'utf8'));
  const checkpoint=flag?async()=>{
   const cli=createInterface({input:process.stdin,output:process.stdout});
   try{
    await cli.question('Revoca el área de la cuenta de consulta en el Supabase local. Pulsa Enter cuando termines. ');
   }finally{cli.close();}
  }:undefined;
  const result=await verificar(config,{checkpoint,report:console.log});
  if(!result.revocation)console.log('Revocación pendiente. Ejecuta con --revocacion para verificarla.');
 })().catch(error=>{
  console.error('Validación detenida: '+error.message);
  process.exitCode=1;
 });
}
module.exports={verificar,validarDestino};
