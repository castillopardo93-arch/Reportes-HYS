const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { PGlite } = require('@electric-sql/pglite');
const {uid,autor,revisor,cierre,ajeno,area,expediente,preparar}=require('./fixture-local.cjs');
const flash = {tipo_incidente:'Incidente ficticio',probabilidad:'Baja',fecha_ocurrencia:'2026-11-10',
 hora:'09:30',area_proyecto:'Eléctrica',ubicacion:'Frente ficticio',involucrado:'Persona ficticia',
 cargo:'Supervisor',primeros_auxilios:'No',ambulancia:'No',hospital:'No',existen_testigos:'No',
 hechos:'Relato ficticio para verificar la persistencia',causas_aparentes:'Causa ficticia',
 acciones_inmediatas:'Acción ficticia',reportado_por:'Equipo ficticio',preparado_por:'Equipo ficticio'};
const final = {involucrados:'Equipo ficticio',fecha_incidente:'2026-11-10',tipo_incidente:'Incidente',
 lugar_incidente:'Eléctrica',descripcion:'Descripción ficticia del expediente',equipo_investigador:'Equipo ficticio',
 condiciones_subestandar:'1.1 — ACUÑADURA DEFICIENTE',action_40_codigo:'A-1, texto libre',
 action_40_descripcion:'Acción preventiva ficticia'};
test('Persistencia, permisos y revisiones de investigación en PostgreSQL', async t => {
 const dir = mkdtempSync(join(tmpdir(),'hys313-postgres-'));
 let db = new PGlite(dir);
 try {
  await preparar(db);
  const sesion = async usuario => {
   await db.exec('reset role');
   await db.query("select set_config('test.usuario',$1,false)",[usuario]);
   await db.exec('set role authenticated');
  };
  const aplicar = async (tipo,accion,version,datos=null,asignado=null,motivo=null) =>
   (await db.query('select public.hys313_investigacion_aplicar($1,$2,$3,$4,$5,$6,$7,$8,$9) d',
    [expediente,tipo,accion,version,'APR',area,datos,asignado,motivo])).rows[0].d;
  const leer = async tipo => (await db.query('select public.hys313_investigacion_leer($1,$2) d',[expediente,tipo])).rows[0].d;
  const error = (promise, code) => assert.rejects(promise, e=>e.code===code);
  await t.test('Final incompleto abre su expediente y persiste al cerrar el motor', async () => {
   await sesion(autor);
   assert.equal((await aplicar('final','guardar',0,{})).estado,'borrador');
   await db.close();
   db = new PGlite(dir);
   await sesion(autor);
   assert.deepEqual((await leer('final')).documento.datos,{});
   const lista=await db.query('select * from public.hys313_investigacion_listar($1,$2)',['APR',area]);
   assert.equal(lista.rows[0].expediente,expediente);
   await error(aplicar('final','enviar',1,null,revisor),'22023');
  });
  await t.test('Aislamiento por área, búsqueda por tildes y acceso directo denegado', async () => {
   await sesion(ajeno);
   await error(leer('final'),'42501');
   await error(aplicar('final','guardar',1,final),'42501');
   await error(db.query('select * from hys313_private.historial'),'42501');
   await sesion(autor);
   const r=await db.query('select * from public.hys313_investigacion_revisores($1,$2,$3)',['APR',area,'jose']);
   assert.deepEqual(r.rows,[{id:revisor,nombre:'José Revisor'}]);
   await db.exec('set role anon');
   await error(leer('final'),'42501');
  });
  await t.test('Evidencias privadas, archivo inválido y eliminación trazable', async () => {
   const foto=uid(8);
   const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1sAAAAASUVORK5CYII=';
   const evidencia = async (tipo,accion,base64=null,motivo=null) =>
    (await db.query('select public.hys313_evidencia($1,$2,$3,$4,$5,$6,$7,$8) d',
     [expediente,tipo,accion,foto,'foto.png','image/png',base64,motivo])).rows[0].d;
   await sesion(autor);
   await error(evidencia('final','subir','dGV4dG8='),'22023');
   const subida=await evidencia('final','subir',png);
   assert.equal(subida.nombre,'foto.png');
   assert.ok(!Object.hasOwn(subida,'contenido'));
   assert.equal((await evidencia('final','leer')).base64.replace(/\s/g,''),png);
   await sesion(ajeno);
   await error(evidencia('final','leer'),'42501');
   await sesion(autor);
   await error(evidencia('final','eliminar'),'22023');
   const eliminada=await evidencia('final','eliminar',null,'Foto de prueba sustituida');
   assert.equal(eliminada.eliminado_por,autor);
   await error(evidencia('final','leer'),'42501');
  });
  await t.test('Validación, bloqueo de versión antigua y rechazo de aprobación de Final obsoleto', async () => {
   await sesion(autor);
   await error(aplicar('final','guardar',1,{action_41_codigo:'fuera de límite'}),'22023');
   await error(aplicar('flash','guardar',0,{fecha_ocurrencia:'2026-02-30'}),'22008');
   await aplicar('flash','guardar',0,flash);
   await error(aplicar('flash','guardar',0,flash),'40001');
   await aplicar('flash','enviar',1,null,revisor);
   await aplicar('final','guardar',1,final);
   await aplicar('final','enviar',2,null,revisor);
   await sesion(revisor);
   await aplicar('flash','devolver',2,null,null,'Ajustar antecedentes');
   await sesion(autor);
   await aplicar('flash','guardar',3,{...flash,ubicacion:'Frente corregido'});
   await aplicar('flash','enviar',4,null,revisor);
   await sesion(revisor);
   await aplicar('flash','aprobar',5);
   await error(aplicar('final','aprobar',3),'22023');
   await aplicar('final','devolver',3,null,null,'Reconciliar con Flash');
   await sesion(autor);
   await aplicar('final','guardar',4,{...final,lugar_incidente:'Frente corregido'});
   await error(aplicar('final','enviar',5,null,revisor),'22023');
   await aplicar('final','enviar',5,null,revisor,'Antecedentes corregidos con Flash vigente');
  });
  await t.test('Aprobación y cierre separados, revocación efectiva y auditoría', async () => {
   await sesion(revisor);
   await aplicar('final','aprobar',6);
   await error(aplicar('final','cerrar',7,null,null,'Cierre de prueba'),'42501');
   await db.exec('reset role');
   await db.query("update public.facultades_v242 set facultades=facultades-'closeFinalReport' where usuario_id=$1",[cierre]);
   await sesion(cierre);
   await error(aplicar('final','cerrar',7,null,null,'Cierre de prueba'),'42501');
   await db.exec('reset role');
   await db.query("update public.facultades_v242 set facultades=facultades||'{\"closeFinalReport\":true}' where usuario_id=$1",[cierre]);
   await sesion(cierre);
   assert.equal((await aplicar('final','cerrar',7,null,null,'Cierre de prueba')).estado,'cerrado');
   await error(aplicar('final','cerrar',8,null,null,'Cierre duplicado'),'22023');
   const resultado=await leer('final');
   assert.equal(resultado.historial.length,8);
   assert.equal(resultado.historial.at(-1).actor,cierre);
   assert.equal(resultado.historial.at(-1).anterior.estado,'aprobado');
   assert.equal(resultado.documento.datos.action_40_codigo,'A-1, texto libre');
  });
  await t.test('Directorio elimina revisores al revocar el área autorizada',async()=>{
   await db.exec('reset role');
   await db.query("update public.cuentas_v242 set ambitos=jsonb_set(ambitos,'{APR,areas}','[]') where usuario_id=$1",[revisor]);
   await sesion(autor);
   const rows=await db.query('select * from public.hys313_investigacion_revisores($1,$2,$3)',['APR',area,'jose']);
   assert.equal(rows.rows.length,0);
  });
  await t.test('Reversión retira solo objetos nuevos', async () => {
   await db.exec('reset role');
   await db.exec(readFileSync(join(__dirname,'003-reversion.sql'),'utf8'));
   await db.exec(readFileSync(join(__dirname,'002-reversion.sql'),'utf8'));
   await db.exec(readFileSync(join(__dirname,'001-reversion.sql'),'utf8'));
   const r=await db.query("select to_regnamespace('hys313_private') nuevo, to_regclass('public.perfiles') previo");
   assert.equal(r.rows[0].nuevo,null);
   assert.equal(r.rows[0].previo,'perfiles');
  });
 } finally {
  await db.close();
  rmSync(dir,{recursive:true,force:true});
 }
});
