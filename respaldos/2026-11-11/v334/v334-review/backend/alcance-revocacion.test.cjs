const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const {join}=require('node:path');
const {randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {preparar,autor,revisor,ajeno}=require('./fixture-local.cjs');
const {createSessions}=require('./sesiones-informes-local.cjs');
const {ejecutarInforme}=require('./servidor-local.cjs');

test('El mismo token pierde listado y descarga al revocar su área en PostgreSQL',async()=>{
 const db=new PGlite();
 try{
  await preparar(db);
  for(const file of readdirSync(__dirname).filter(name=>/^00[4-9]-.*\.sql$/.test(name)).sort()){
   await db.exec(readFileSync(join(__dirname,file),'utf8'));
  }
  const sessions=createSessions();
  const viewer=sessions.login({usuario:'consulta-apr',clave:'prueba-consulta'});
  const writer=sessions.login({usuario:'otro-elaborador',clave:'prueba-otro'});
  const run=(token,body)=>ejecutarInforme(db,{module:'APR',...body},sessions.require('Bearer '+token));
  const idElectric='v242-'+randomUUID();
  const idMechanical='v242-'+randomUUID();
  const table='hys318_lab.borradores';
  for(const [id,area] of [[idElectric,'Eléctrica'],[idMechanical,'Mecánica']]){
   await db.query(`insert into ${table}(actor,id,revision,payload,cerrado,pdf,nombre_pdf)
     values($1,$2,2,$3,now(),decode('YQ==','base64'),'prueba.pdf')`,
    [autor,id,JSON.stringify({module:'APR',area,status:'Finalizado',authenticatedUser:autor})]);
  }
  const ids=async()=> (await run(viewer.token,{action:'listarCerrados'})).items.map(row=>row.id);
  const read=id=>run(viewer.token,{action:'leerCerrado',id,pdf:true});
  assert.deepEqual(await ids(),[idElectric]);
  assert.equal((await read(idElectric)).pdf,'YQ==');
  assert.equal(await read(idMechanical),null);

  const payload={module:'APR',authenticatedUser:ajeno,area:'Eléctrica',
   status:'En edición',reportId:'v242-'+randomUUID(),data:{activities:[],inspections:[],findings:[]}};
  await assert.rejects(run(writer.token,{action:'guardar',payload,revision:0}),{code:'42501'});
  payload.area='Mecánica';
  assert.equal((await run(writer.token,{action:'guardar',payload,revision:0})).revision,1);

  await db.query(`delete from hys318_lab.areas_acceso_informe
    where usuario=$1 and modulo='APR' and area='Eléctrica'`,[revisor]);
  assert.equal(sessions.require('Bearer '+viewer.token).actor,revisor);
  assert.deepEqual(await ids(),[]);
  assert.equal(await read(idElectric),null);
  await db.query(`insert into hys318_lab.areas_acceso_informe values($1,'APR','Mecánica')`,[revisor]);
  assert.deepEqual(await ids(),[idMechanical]);
  assert.equal((await read(idMechanical)).pdf,'YQ==');
  assert.equal(await read(idElectric),null);
  // Varias filas comparten fecha, incluso en el límite entre páginas.
  const inserted=Array.from({length:42},()=> 'v242-'+randomUUID()).sort();
  const seed=(id,at)=>db.query(`insert into ${table}(actor,id,revision,payload,cerrado,pdf,nombre_pdf)
    values($1,$2,2,$3,$4::timestamptz,decode('YQ==','base64'),'prueba.pdf')`,
   [autor,id,JSON.stringify({module:'APR',area:'Eléctrica',status:'Finalizado',authenticatedUser:autor}),at]);
  for(const id of inserted)await seed(id,'2026-11-11 11:00:00.123456+00');
  const author=sessions.login({usuario:'elaborador',clave:'prueba-elaborador'});
  const page=cursor=>run(author.token,{action:'listarCerrados',cursor});
  const first=await page(null);
  assert.equal(first.items.length,20);
  const newId='v242-'+randomUUID();
  await seed(newId,'2026-11-11 12:00:00+00');
  const all=[...first.items];
  let next=first.next;
  let requests=1;
  while(next&&requests<5){
   const result=await page(next);
   all.push(...result.items);
   next=result.next;
   requests++;
  }
  assert.equal(requests,3);
  assert.equal(next,null);
  assert.equal(all.length,44);
  assert.equal(new Set(all.map(item=>item.id)).size,44);
  assert.ok(inserted.every(id=>all.some(item=>item.id===id)));
  assert.ok(!all.some(item=>item.id===newId));
  assert.ok((await page(null)).items.some(item=>item.id===newId));
  await assert.rejects(page({at:'no-es-fecha',id:inserted[0]}),{status:400});
 }finally{await db.close();}
});
