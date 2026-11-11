const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {preparar,autor,revisor,ajeno}=require('./fixture-local.cjs');

test('RLS de informes protege directamente las filas, el módulo y los permisos',async()=>{
 const db=new PGlite();
 const table='hys318_lab.borradores';
 async function as(user,query,params=[],role='hys323_report_user'){
  return db.transaction(async tx=>{
   await tx.query("select set_config('test.usuario',$1,true)",[user||'']);
   await tx.exec('set local role '+role);
   return tx.query(query,params);
  });
 }
 try{
  await preparar(db);
  for(const migration of ['004-borradores-laboratorio.sql','005-cierre-laboratorio.sql',
   '006-acuse-cierre-laboratorio.sql','007-identidad-informe-laboratorio.sql','008-rls-informes-laboratorio.sql']){
   await db.exec(readFileSync(join(__dirname,migration),'utf8'));
  }
  async function seed(actor,id,module,closed=false){
   const payload={module,authenticatedUser:actor,status:closed?'Finalizado':'En edición'};
   return db.query(`insert into ${table}(actor,id,revision,payload,cerrado,pdf,nombre_pdf)
     values($1,$2,1,$3,case when $4 then now() end,
       case when $4 then decode('YQ==','base64') end,case when $4 then 'prueba.pdf' end)`,
    [actor,id,JSON.stringify(payload),closed]);
  }
  await seed(autor,'borrador-apr','APR');
  await seed(autor,'cerrado-apr','APR',true);
  await seed(autor,'cerrado-otros','OTROS',true);
  await seed(ajeno,'borrador-ajeno','APR');
  const ids=async user=>(await as(user,`select id from ${table} order by id`)).rows.map(r=>r.id);
  assert.deepEqual(await ids(autor),['borrador-apr','cerrado-apr','cerrado-otros']);
  assert.deepEqual(await ids(revisor),['cerrado-apr']);
  assert.deepEqual(await ids(ajeno),['borrador-ajeno']);
  assert.deepEqual(await ids(null),[]);
  await assert.rejects(as(null,`select id from ${table}`,[],'anon'),{code:'42501'});
  const update=`update ${table} set revision=revision+1 where id=$1 returning id`;
  assert.equal((await as(revisor,update,['borrador-apr'])).rows.length,0);
  assert.equal((await as(ajeno,update,['borrador-apr'])).rows.length,0);
  assert.equal((await as(autor,update,['cerrado-apr'])).rows.length,0);
  assert.equal((await as(autor,update,['borrador-apr'])).rows.length,1);
  await assert.rejects(as(autor,`update ${table} set payload=jsonb_set(payload,'{module}','"OTROS"')
    where id='borrador-apr'`),{code:'42501'});
  const insert=`insert into ${table}(actor,id,revision,payload) values($1,'falso',1,$2)`;
  await assert.rejects(as(ajeno,insert,[autor,JSON.stringify({module:'APR',authenticatedUser:autor,status:'En edición'})]),{code:'42501'});
  await assert.rejects(as(revisor,insert,[revisor,JSON.stringify({module:'APR',authenticatedUser:revisor,status:'En edición'})]),{code:'42501'});
  await assert.rejects(as(autor,`delete from ${table}`),{code:'42501'});
  await assert.rejects(as(autor,'select * from hys318_lab.accesos_informes'),{code:'42501'});
  await db.query('update public.perfiles set activo=false where usuario_id=$1',[autor]);
  assert.deepEqual(await ids(autor),[]);
 }finally{await db.close();}
});
