const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const uid = n => '00000000-0000-4000-8000-' + String(n).padStart(12,'0');
const [autor, revisor, cierre, ajeno, area, otra, expediente] = [1,2,3,4,5,6,7].map(uid);
const schema = `
create role anon;
create role authenticated;
create schema auth;
create schema hys242_private;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('test.usuario',true),'')::uuid
$$;
create table public.perfiles(usuario_id uuid primary key,nombre text,rol text,activo boolean);
create table public.cuentas_v242(usuario_id uuid primary key,rol text,activo boolean,ambitos jsonb);
create table public.facultades_v242(usuario_id uuid,modulo text,areas_ids uuid[],facultades jsonb);
create table public.areas(id uuid,nombre text,activa boolean);
create table public.permisos_usuario(usuario_id uuid,area_id uuid,modulo text,puede_ver boolean,puede_editar boolean);
create table public.areas_trabajo_v242(id uuid primary key,modulo text,nombre text,activa boolean);
create function hys242_private.general_unico() returns boolean language sql stable as $$ select false $$;
insert into public.perfiles values
 ('${autor}','Autora ficticia','usuario',true),('${revisor}','José Revisor','administrador_area',true),
 ('${cierre}','Cierre ficticio','administrador_area',true),('${ajeno}','Cuenta externa','usuario',true);
insert into public.areas_trabajo_v242 values ('${area}','APR','Eléctrica',true),('${otra}','APR','Mecánica',true);
insert into public.cuentas_v242
 select usuario_id,rol,true,jsonb_build_object('APR',jsonb_build_object('ver',true,'editar',true,
   'areas',jsonb_build_array(case when usuario_id='${ajeno}' then '${otra}' else '${area}' end))) from public.perfiles;
insert into public.facultades_v242 values
 ('${revisor}','APR',array['${area}'::uuid],'{"review":true,"approve":true}'),
 ('${cierre}','APR',array['${area}'::uuid],'{"closeFlashReport":true,"closeFinalReport":true}');
`;
const helpers=readFileSync(join(__dirname,'fixture-permisos.sql'),'utf8');
async function preparar(db){
 await db.exec(schema+helpers);
 for(const file of ['001-investigaciones.sql','002-evidencias.sql','003-evidencias-revision.sql']){
  await db.exec(readFileSync(join(__dirname,file),'utf8'));
 }
}
module.exports={uid,autor,revisor,cierre,ajeno,area,otra,expediente,preparar};
