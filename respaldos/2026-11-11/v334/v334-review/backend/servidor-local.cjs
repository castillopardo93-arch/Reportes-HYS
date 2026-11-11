const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { createSessions } = require('./sesiones-informes-local.cjs');
const {reportRequestMaxBytes,reportRequestLimitMessage}=require('../archive-policy-v293.js');
const { borrador } = require('./borrador-local.cjs');
const { PGlite } = require('@electric-sql/pglite');
const { autor, revisor, cierre, ajeno, area, preparar } = require('./fixture-local.cjs');

const web = resolve(__dirname,'..');
const types = { html:'text/html', js:'text/javascript', css:'text/css' };
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function entradaInvalida() {
 return Object.assign(new Error('Solicitud de laboratorio inválida.'),{status:400});
}
async function readJson(req,{limit=7100000,message}={}) {
 function tooLarge(){
  return message?Object.assign(new Error(message),{status:413}):entradaInvalida();
 }
 if(Number(req.headers['content-length'])>limit){
  req.resume();
  throw tooLarge();
 }
 let size=0;
 const parts=[];
 for await(const part of req.iterator({destroyOnReturn:false})){
  size+=part.length;
  if(size>limit){
   req.resume();
   throw tooLarge();
  }
  parts.push(part);
 }
 try{return JSON.parse(Buffer.concat(parts,size).toString('utf8'));}catch{throw entradaInvalida();}
}
async function ejecutarInforme(db,input,session){
 return db.transaction(async tx=>{
  await tx.query("select set_config('test.usuario',$1,true)",[session.actor]);
  await tx.exec('set local role hys323_report_user');
  return borrador(tx,input,session);
 });
}

async function start(dir,port=0){
 const db=new PGlite(dir);
 const existe=await db.query("select to_regclass('hys313_private.documentos') as tabla");
 if(!existe.rows[0].tabla)await preparar(db);
 else{
  const migration=await db.query("select to_regprocedure('public.hys317_evidencia(uuid,text,text,uuid,text,text,text,text,text)') as funcion");
  if(!migration.rows[0].funcion){
   const {readFileSync}=require('node:fs');
   await db.exec(readFileSync(join(__dirname,'003-evidencias-revision.sql'),'utf8'));
  }
 }

 const daily=await db.query("select to_regclass('hys318_lab.borradores') as tabla");
 if(!daily.rows[0].tabla)await db.exec(await readFile(join(__dirname,'004-borradores-laboratorio.sql'),'utf8'));

 const cierreDiario=await db.query("select to_regclass('hys318_lab.borradores_cerrados_actor_fecha') as indice");
 if(!cierreDiario.rows[0].indice)await db.exec(await readFile(join(__dirname,'005-cierre-laboratorio.sql'),'utf8'));

 const acuse=await db.query(`select 1 from information_schema.columns
  where table_schema='hys318_lab' and table_name='borradores' and column_name='operacion_cierre'`);
 if(!acuse.rows.length)await db.exec(await readFile(join(__dirname,'006-acuse-cierre-laboratorio.sql'),'utf8'));

 const uniqueReport=await db.query("select to_regclass('hys318_lab.borradores_id_unico') as indice");
 if(!uniqueReport.rows[0].indice)await db.exec(await readFile(join(__dirname,'007-identidad-informe-laboratorio.sql'),'utf8'));

 const rls=await db.query("select to_regclass('hys318_lab.accesos_informes') as tabla");
 if(!rls.rows[0].tabla)await db.exec(await readFile(join(__dirname,'008-rls-informes-laboratorio.sql'),'utf8'));

 const alcance=await db.query("select to_regclass('hys318_lab.areas_acceso_informe') as tabla");
 if(!alcance.rows[0].tabla)await db.exec(await readFile(join(__dirname,'009-alcance-area-laboratorio.sql'),'utf8'));

 const historial=await db.query("select to_regclass('hys318_lab.borradores_historial_tarjeta') as indice");
 if(!historial.rows[0].indice)await db.exec(await readFile(join(__dirname,'010-indice-historial-laboratorio.sql'),'utf8'));

 const correlativo=await db.query(`select 1 from information_schema.columns
  where table_schema='hys313_private' and table_name='expedientes' and column_name='numero'`);
 if(!correlativo.rows.length)await db.exec(await readFile(join(__dirname,'011-codigo-investigacion-laboratorio.sql'),'utf8'));

 const acciones=await db.query("select to_regprocedure('public.hys333_investigacion_listar(text,uuid,integer)') as funcion");
 if(!acciones.rows[0].funcion)await db.exec(await readFile(join(__dirname,'012-auditoria-investigacion-laboratorio.sql'),'utf8'));

 const sessions=createSessions();
 const server=createServer(async(req,res)=>{
  const origin='http://127.0.0.1:'+server.address().port;
  const json=(status,value)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value));
  try{
   if(req.headers.host!==new URL(origin).host)return json(403,{error:'Host no autorizado.'});
   const url=new URL(req.url,origin);
   if(['/qa-borrador-diario','/qa-sesion-informes'].includes(url.pathname)){
    if(req.method!=='POST'||req.headers.origin!==origin||
       req.headers['content-type']!=='application/json')return json(403,{error:'Origen no autorizado.'});
    if(url.pathname==='/qa-sesion-informes'){
     const input=await readJson(req);
     if(input?.action==='login'){
      const result=sessions.login(input);
      sessions.logout(req.headers.authorization);
      return json(200,result);
     }
     if(input?.action==='logout'){
      sessions.logout(req.headers.authorization);
      return json(200,{ok:true});
     }
     throw entradaInvalida();
    }
    const session=sessions.require(req.headers.authorization);
    const input=await readJson(req,{limit:reportRequestMaxBytes,message:reportRequestLimitMessage});
    const result=await ejecutarInforme(db,input,session);
    return json(200,result);
   }
   if(url.pathname==='/qa-investigacion'){
    if(req.method!=='POST'||req.headers.origin!==origin||
       req.headers['content-type']!=='application/json')return json(403,{error:'Origen no autorizado.'});
    const input=await readJson(req);
    if(!input||typeof input!=='object'||Array.isArray(input))throw entradaInvalida();
    const actor=input.actor||autor;
    if(![autor,revisor,cierre,ajeno].includes(actor))throw entradaInvalida();
    const result=await db.transaction(async tx=>{
     await tx.query("select set_config('test.usuario',$1,true)",[actor]);
     await tx.exec('set local role authenticated');
     if(input.action==='contexto'){
      return {actor,autor,actors:[
       {id:autor,nombre:'Elaborador ficticio'},
       {id:revisor,nombre:'José Revisor ficticio'},
       {id:cierre,nombre:'Cierre autorizado ficticio'},
       {id:ajeno,nombre:'Usuario ficticio de otra área'}
      ]};
     }
     if(input.action==='listar'){
      if(!Number.isInteger(input.page)||input.page<0||input.page>10000)throw entradaInvalida();
      return (await tx.query('select * from public.hys333_investigacion_listar($1,$2,$3)',['APR',area,input.page])).rows;
     }
     if(input.action==='revisores'){
      if(typeof input.query!=='string')throw entradaInvalida();
      return (await tx.query('select * from public.hys313_investigacion_revisores($1,$2,$3)',['APR',area,input.query])).rows;
     }
     const {id,kind,version,data}=input;
     if(typeof id!=='string'||!uuid.test(id)||!['flash','final'].includes(kind))throw entradaInvalida();
     if(input.action==='leer'){
      const since=input.since??0;
      if(!Number.isSafeInteger(since)||since<0)throw entradaInvalida();
      return (await tx.query('select public.hys313_investigacion_leer($1,$2,$3) as resultado',[id,kind,since])).rows[0].resultado;
     }
     if(input.action==='evidencia'){
      const actions=['subir','leer','listar','eliminar'];
      if(!actions.includes(input.operation)||input.fileId!=null&&!uuid.test(input.fileId))throw entradaInvalida();
      return (await tx.query('select public.hys317_evidencia($1,$2,$3,$4,$5,$6,$7,$8,$9) as resultado',
       [id,kind,input.operation,input.fileId??null,input.name??null,input.mime??null,
        input.base64??null,input.reason??null,input.field||'fotografias'])).rows[0].resultado;
     }
     if(!['guardar','enviar','devolver','aprobar','cerrar'].includes(input.action)
       ||!Number.isSafeInteger(version)||version<0)throw entradaInvalida();
     if(input.reviewer!=null&&!uuid.test(input.reviewer))throw entradaInvalida();
     return (await tx.query('select public.hys313_investigacion_aplicar($1,$2,$3,$4,$5,$6,$7,$8,$9) as resultado',
      [id,kind,input.action,version,'APR',area,data??null,input.reviewer??null,input.reason??null])).rows[0].resultado;
    });
    return json(200,result);
   }
   const advanced=['/','/index.html','/interfaz-local.html'].includes(url.pathname);
   const filename=advanced?'index.html':url.pathname.slice(1);
   const match=/^[a-z0-9-]+\.(html|js|css)$/i.exec(filename);
   if(req.method!=='GET'||!match)return json(404,{error:'Página no disponible.'});
   let bytes=await readFile(join(web,filename));
   if(advanced){
    let html=bytes.toString('utf8').replace('window.HYS265_PREVIEW_ONLY=false;','window.HYS265_PREVIEW_ONLY=true;');
    html=html.replace('<head>','<head><script>window.HYS316_ADVANCED_LOCAL=true;window.HYS322_SESSION_STORAGE=window.sessionStorage;window.HYS308_DEMO_PAGE=true;window.HYS315_PERSISTENTE=true;</script>');
    html=html.replace('<script src="investigacion-flujo-v308.js','<script src="investigacion-pdf-v332.js"></script><script src="investigacion-flujo-v308.js');
    html=html.replace('</body>','<script src="interfaz-local-v316.js"></script><script src="borrador-diario-local-v318.js"></script></body>');
    bytes=Buffer.from(html);
   }
   res.writeHead(200,{'Content-Type':types[match[1]]+'; charset=utf-8','Cache-Control':'no-store'}).end(bytes);
  }catch(error){
   const status=error.status??({ENOENT:404,'40001':409,'42501':403,'22023':400,'22008':400}[error.code]||500);
   if(!res.headersSent)json(status,{error:status===500?'No se pudo completar la operación local.':error.message});
  }
 });
 await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done)});
 return {
  url:'http://127.0.0.1:'+server.address().port,
  close:async()=>{await new Promise(done=>server.close(done));await db.close()}
 };
}
if(require.main===module){
 const {homedir}=require('node:os');
 const dir=join(homedir(),'.reportes-hys-v334-laboratorio');
 const portFlag=process.argv.indexOf('--port');
 const port=Number(portFlag>=0?process.argv[portFlag+1]:process.env.PORT||8177);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Puerto inválido.');
 start(dir,port).then(app=>{
  console.log('Laboratorio local: '+app.url+' · Solo datos ficticios.');
  process.once('SIGINT',()=>app.close());
  process.once('SIGTERM',()=>app.close());
 }).catch(e=>{console.error(e.message);process.exitCode=1});
}
module.exports={start,ejecutarInforme};
