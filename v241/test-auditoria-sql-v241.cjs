/* Reproducciones diagnósticas: afirman fallos actuales, no aceptación funcional. Solo PostgreSQL local sintético. */
const fs=require('fs'),vm=require('vm');
const baseline=fs.readFileSync(__dirname+'/test-integracion-v241.cjs','utf8');
const setup=baseline.slice(0,baseline.indexOf("await test('Contexto"));
const cases=String.raw`
for(const mod of ['APR','OTROS'])await test('CONFIRMADO: solo lectura puede enviar a revisión en '+mod,async()=>{
 await actor('u');const id='v241-'+randomUUID();await save(id,pack(id),0,'',mod);
 await db.exec('reset role');await db.query('update permisos_usuario set puede_editar=false where usuario_id=$1 and modulo=$2',[ids.u,mod]);await actor('u');
 const ctx=(await db.query('select hys241_contexto() x')).rows[0].x;assert.equal(ctx.permissions.find(p=>p.modulo===mod).puede_editar,false);
 const state=(await db.query('select * from hys241_revisar($1,$2,0,$3)',[id,'enviar','Prueba de lectura'])).rows[0];assert.equal(state.estado,'Enviado');
 await db.exec('reset role');await db.query('update permisos_usuario set puede_editar=true where usuario_id=$1 and modulo=$2',[ids.u,mod]);
});
await test('CONFIRMADO: nombre v241 difiere del responsable impuesto al guardar',async()=>{
 await actor('g');await db.query('select hys241_guardar_usuario($1,$2,0,$3)',[ids.u,JSON.stringify({nombre:'Nombre nuevo v241',rol:'usuario',activo:true,ambitos:{APR:{ver:true,editar:true,areas:[va4]}}}),'Renombrar']);await actor('u');
 const ctx=(await db.query('select hys241_contexto() x')).rows[0].x;assert.equal(ctx.profile.nombre,'Nombre nuevo v241');const id='v241-'+randomUUID();const saved=await save(id,{...pack(id),owner:ctx.profile.nombre});assert.equal(saved.payload.owner,'u');assert.notEqual(saved.payload.owner,ctx.profile.nombre);
});
await test('CONFIRMADO: primer envío con PDF del nombre nuevo es rechazado',async()=>{
 await actor('u');const id='v241-'+randomUUID(),p={...pack(id),owner:'Nombre nuevo v241'};const pdf={metadata:{reportId:id,reportData:p},pdf:'UERG'};
 await assert.rejects(db.query('select * from hys241_guardar_con_motivo($1,$2,$3,$4,0,$5,$6)',[id,'APR',JSON.stringify(p),JSON.stringify(pdf),randomUUID(),'']),/PDF no corresponde/);
});
await test('CONFIRMADO: solicitud pendiente bloquea corregir los datos de invitación',async()=>{
 await actor('g');const data={nombre:'Invitado sintético',rol:'usuario',activo:true,motivo:'Prueba',ambitos:{APR:{ver:true,editar:true,areas:[va4]}}};await db.query('select hys241_preparar_invitacion($1,$2,$3)',['prueba@example.invalid',JSON.stringify(data),randomUUID()]);
 await assert.rejects(db.query('select hys241_preparar_invitacion($1,$2,$3)',['prueba@example.invalid',JSON.stringify({...data,nombre:'Nombre corregido'}),randomUUID()]),/pendiente con otros datos/);
});
await db.close();console.log(n+' reproducciones diagnósticas confirmadas. Ningún dato remoto modificado.');})().catch(e=>{console.error(e);process.exitCode=1});
`;
vm.runInNewContext(setup+cases,{require,__dirname,console,process});
