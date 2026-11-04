-- Prueba transaccional: no modifica perfiles/permisos ni deja informes o auditorías QA.
begin;
create temporary table qa239_resultados(prueba text,resultado text) on commit drop;
grant select,insert on qa239_resultados to authenticated;
-- Cada bloque se ejecuta con un perfil existente, sin cambiar su rol ni permisos.

reset role;
select set_config('request.jwt.claim.sub',coalesce((select p.usuario_id::text from public.perfiles p where p.activo and p.rol='administrador_global' and (p.rol='administrador_global' or exists(select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id where u.usuario_id=p.usuario_id and u.modulo='APR' and u.puede_ver and a.activa)) order by p.usuario_id limit 1),'00000000-0000-4000-8000-000000000000'),true);
set local role authenticated;
do $qa$
declare id text:='v239-qa-transaccion-'||gen_random_uuid()::text; t uuid:=gen_random_uuid(); r public.informes_v239; r2 public.informes_v239; payload jsonb; aid uuid; n integer; actor public.perfiles;
begin
 select * into actor from public.perfiles where usuario_id=auth.uid();
 if actor.usuario_id is null then insert into qa239_resultados values('administrador_global APR','Sin perfil existente para este ámbito; no se crea ni modifica ninguno');return;end if;
 payload:=jsonb_build_object('version','v239','reportId',id,'owner','Prueba transaccional','status','En edición','data',jsonb_build_object('activities','[]'::jsonb,'inspections','[]'::jsonb,'findings','[]'::jsonb));
 if not hys239_private.allowed('APR','write') then
  begin perform public.hys239_guardar_informe(id,'APR',payload,null,0,t);raise exception 'Se admitió escritura de consulta';exception when insufficient_privilege then null;end;
  insert into qa239_resultados values('administrador_global APR','OK consulta sin escritura');return;
 end if;
 r:=public.hys239_guardar_informe(id,'APR',payload,null,0,t);
 if r.revision<>1 or r.payload->>'reportId'<>id or r.ultimo_actor_id<>auth.uid() then raise exception 'Identidad incorrecta';end if;
 if actor.rol<>'administrador_global' and r.payload->>'owner'<>actor.nombre then raise exception 'Responsable incorrecto';end if;
 r2:=public.hys239_guardar_informe(id,'APR',payload,null,0,t);
 if r2.revision<>1 then raise exception 'Token no idempotente';end if;
 payload:=jsonb_set(r.payload,'{status}','"Finalizado"'::jsonb);
 r2:=public.hys239_guardar_informe(id,'APR',payload,null,1,gen_random_uuid());
 if r2.revision<>2 or r2.payload->>'status'<>'Finalizado' then raise exception 'Finalización incorrecta';end if;
 begin perform public.hys239_guardar_informe(id,'APR',payload,null,0,gen_random_uuid());raise exception 'No se detectó conflicto';exception when serialization_failure then null;end;
 if hys239_private.allowed('APR','manage') then
  insert into public.areas_trabajo_v239(modulo,nombre) values('APR','QA transaccional '||gen_random_uuid()) returning areas_trabajo_v239.id into aid;
  update public.areas_trabajo_v239 set nombre=nombre||' editada' where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=false where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=true where areas_trabajo_v239.id=aid;
  select count(*) into n from public.auditoria_areas_v239 where area_id=aid and usuario_id=auth.uid();
  if n<>4 then raise exception 'Auditoría incompleta';end if;
 end if;
 if actor.rol<>'administrador_global' then
  begin insert into public.listas_v239(modulo,campo,valor) values('APR','project','QA no autorizado');raise exception 'Se admitió lista no autorizada';exception when insufficient_privilege then null;end;
 end if;
 insert into qa239_resultados values('administrador_global APR','OK guardado, recuperación por consulta, finalización, idempotencia, conflicto y permisos');
end $qa$;

reset role;
select set_config('request.jwt.claim.sub',coalesce((select p.usuario_id::text from public.perfiles p where p.activo and p.rol='administrador_global' and (p.rol='administrador_global' or exists(select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id where u.usuario_id=p.usuario_id and u.modulo='OTROS' and u.puede_ver and a.activa)) order by p.usuario_id limit 1),'00000000-0000-4000-8000-000000000000'),true);
set local role authenticated;
do $qa$
declare id text:='v239-qa-transaccion-'||gen_random_uuid()::text; t uuid:=gen_random_uuid(); r public.informes_v239; r2 public.informes_v239; payload jsonb; aid uuid; n integer; actor public.perfiles;
begin
 select * into actor from public.perfiles where usuario_id=auth.uid();
 if actor.usuario_id is null then insert into qa239_resultados values('administrador_global OTROS','Sin perfil existente para este ámbito; no se crea ni modifica ninguno');return;end if;
 payload:=jsonb_build_object('version','v239','reportId',id,'owner','Prueba transaccional','status','En edición','data',jsonb_build_object('activities','[]'::jsonb,'inspections','[]'::jsonb,'findings','[]'::jsonb));
 if not hys239_private.allowed('OTROS','write') then
  begin perform public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);raise exception 'Se admitió escritura de consulta';exception when insufficient_privilege then null;end;
  insert into qa239_resultados values('administrador_global OTROS','OK consulta sin escritura');return;
 end if;
 r:=public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);
 if r.revision<>1 or r.payload->>'reportId'<>id or r.ultimo_actor_id<>auth.uid() then raise exception 'Identidad incorrecta';end if;
 if actor.rol<>'administrador_global' and r.payload->>'owner'<>actor.nombre then raise exception 'Responsable incorrecto';end if;
 r2:=public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);
 if r2.revision<>1 then raise exception 'Token no idempotente';end if;
 payload:=jsonb_set(r.payload,'{status}','"Finalizado"'::jsonb);
 r2:=public.hys239_guardar_informe(id,'OTROS',payload,null,1,gen_random_uuid());
 if r2.revision<>2 or r2.payload->>'status'<>'Finalizado' then raise exception 'Finalización incorrecta';end if;
 begin perform public.hys239_guardar_informe(id,'OTROS',payload,null,0,gen_random_uuid());raise exception 'No se detectó conflicto';exception when serialization_failure then null;end;
 if hys239_private.allowed('OTROS','manage') then
  insert into public.areas_trabajo_v239(modulo,nombre) values('OTROS','QA transaccional '||gen_random_uuid()) returning areas_trabajo_v239.id into aid;
  update public.areas_trabajo_v239 set nombre=nombre||' editada' where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=false where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=true where areas_trabajo_v239.id=aid;
  select count(*) into n from public.auditoria_areas_v239 where area_id=aid and usuario_id=auth.uid();
  if n<>4 then raise exception 'Auditoría incompleta';end if;
 end if;
 if actor.rol<>'administrador_global' then
  begin insert into public.listas_v239(modulo,campo,valor) values('OTROS','project','QA no autorizado');raise exception 'Se admitió lista no autorizada';exception when insufficient_privilege then null;end;
 end if;
 insert into qa239_resultados values('administrador_global OTROS','OK guardado, recuperación por consulta, finalización, idempotencia, conflicto y permisos');
end $qa$;

reset role;
select set_config('request.jwt.claim.sub',coalesce((select p.usuario_id::text from public.perfiles p where p.activo and p.rol='administrador_area' and (p.rol='administrador_global' or exists(select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id where u.usuario_id=p.usuario_id and u.modulo='APR' and u.puede_ver and a.activa)) order by p.usuario_id limit 1),'00000000-0000-4000-8000-000000000000'),true);
set local role authenticated;
do $qa$
declare id text:='v239-qa-transaccion-'||gen_random_uuid()::text; t uuid:=gen_random_uuid(); r public.informes_v239; r2 public.informes_v239; payload jsonb; aid uuid; n integer; actor public.perfiles;
begin
 select * into actor from public.perfiles where usuario_id=auth.uid();
 if actor.usuario_id is null then insert into qa239_resultados values('administrador_area APR','Sin perfil existente para este ámbito; no se crea ni modifica ninguno');return;end if;
 payload:=jsonb_build_object('version','v239','reportId',id,'owner','Prueba transaccional','status','En edición','data',jsonb_build_object('activities','[]'::jsonb,'inspections','[]'::jsonb,'findings','[]'::jsonb));
 if not hys239_private.allowed('APR','write') then
  begin perform public.hys239_guardar_informe(id,'APR',payload,null,0,t);raise exception 'Se admitió escritura de consulta';exception when insufficient_privilege then null;end;
  insert into qa239_resultados values('administrador_area APR','OK consulta sin escritura');return;
 end if;
 r:=public.hys239_guardar_informe(id,'APR',payload,null,0,t);
 if r.revision<>1 or r.payload->>'reportId'<>id or r.ultimo_actor_id<>auth.uid() then raise exception 'Identidad incorrecta';end if;
 if actor.rol<>'administrador_global' and r.payload->>'owner'<>actor.nombre then raise exception 'Responsable incorrecto';end if;
 r2:=public.hys239_guardar_informe(id,'APR',payload,null,0,t);
 if r2.revision<>1 then raise exception 'Token no idempotente';end if;
 payload:=jsonb_set(r.payload,'{status}','"Finalizado"'::jsonb);
 r2:=public.hys239_guardar_informe(id,'APR',payload,null,1,gen_random_uuid());
 if r2.revision<>2 or r2.payload->>'status'<>'Finalizado' then raise exception 'Finalización incorrecta';end if;
 begin perform public.hys239_guardar_informe(id,'APR',payload,null,0,gen_random_uuid());raise exception 'No se detectó conflicto';exception when serialization_failure then null;end;
 if hys239_private.allowed('APR','manage') then
  insert into public.areas_trabajo_v239(modulo,nombre) values('APR','QA transaccional '||gen_random_uuid()) returning areas_trabajo_v239.id into aid;
  update public.areas_trabajo_v239 set nombre=nombre||' editada' where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=false where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=true where areas_trabajo_v239.id=aid;
  select count(*) into n from public.auditoria_areas_v239 where area_id=aid and usuario_id=auth.uid();
  if n<>4 then raise exception 'Auditoría incompleta';end if;
 end if;
 if actor.rol<>'administrador_global' then
  begin insert into public.listas_v239(modulo,campo,valor) values('APR','project','QA no autorizado');raise exception 'Se admitió lista no autorizada';exception when insufficient_privilege then null;end;
 end if;
 insert into qa239_resultados values('administrador_area APR','OK guardado, recuperación por consulta, finalización, idempotencia, conflicto y permisos');
end $qa$;

reset role;
select set_config('request.jwt.claim.sub',coalesce((select p.usuario_id::text from public.perfiles p where p.activo and p.rol='administrador_area' and (p.rol='administrador_global' or exists(select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id where u.usuario_id=p.usuario_id and u.modulo='OTROS' and u.puede_ver and a.activa)) order by p.usuario_id limit 1),'00000000-0000-4000-8000-000000000000'),true);
set local role authenticated;
do $qa$
declare id text:='v239-qa-transaccion-'||gen_random_uuid()::text; t uuid:=gen_random_uuid(); r public.informes_v239; r2 public.informes_v239; payload jsonb; aid uuid; n integer; actor public.perfiles;
begin
 select * into actor from public.perfiles where usuario_id=auth.uid();
 if actor.usuario_id is null then insert into qa239_resultados values('administrador_area OTROS','Sin perfil existente para este ámbito; no se crea ni modifica ninguno');return;end if;
 payload:=jsonb_build_object('version','v239','reportId',id,'owner','Prueba transaccional','status','En edición','data',jsonb_build_object('activities','[]'::jsonb,'inspections','[]'::jsonb,'findings','[]'::jsonb));
 if not hys239_private.allowed('OTROS','write') then
  begin perform public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);raise exception 'Se admitió escritura de consulta';exception when insufficient_privilege then null;end;
  insert into qa239_resultados values('administrador_area OTROS','OK consulta sin escritura');return;
 end if;
 r:=public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);
 if r.revision<>1 or r.payload->>'reportId'<>id or r.ultimo_actor_id<>auth.uid() then raise exception 'Identidad incorrecta';end if;
 if actor.rol<>'administrador_global' and r.payload->>'owner'<>actor.nombre then raise exception 'Responsable incorrecto';end if;
 r2:=public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);
 if r2.revision<>1 then raise exception 'Token no idempotente';end if;
 payload:=jsonb_set(r.payload,'{status}','"Finalizado"'::jsonb);
 r2:=public.hys239_guardar_informe(id,'OTROS',payload,null,1,gen_random_uuid());
 if r2.revision<>2 or r2.payload->>'status'<>'Finalizado' then raise exception 'Finalización incorrecta';end if;
 begin perform public.hys239_guardar_informe(id,'OTROS',payload,null,0,gen_random_uuid());raise exception 'No se detectó conflicto';exception when serialization_failure then null;end;
 if hys239_private.allowed('OTROS','manage') then
  insert into public.areas_trabajo_v239(modulo,nombre) values('OTROS','QA transaccional '||gen_random_uuid()) returning areas_trabajo_v239.id into aid;
  update public.areas_trabajo_v239 set nombre=nombre||' editada' where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=false where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=true where areas_trabajo_v239.id=aid;
  select count(*) into n from public.auditoria_areas_v239 where area_id=aid and usuario_id=auth.uid();
  if n<>4 then raise exception 'Auditoría incompleta';end if;
 end if;
 if actor.rol<>'administrador_global' then
  begin insert into public.listas_v239(modulo,campo,valor) values('OTROS','project','QA no autorizado');raise exception 'Se admitió lista no autorizada';exception when insufficient_privilege then null;end;
 end if;
 insert into qa239_resultados values('administrador_area OTROS','OK guardado, recuperación por consulta, finalización, idempotencia, conflicto y permisos');
end $qa$;

reset role;
select set_config('request.jwt.claim.sub',coalesce((select p.usuario_id::text from public.perfiles p where p.activo and p.rol='usuario' and (p.rol='administrador_global' or exists(select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id where u.usuario_id=p.usuario_id and u.modulo='APR' and u.puede_ver and a.activa)) order by p.usuario_id limit 1),'00000000-0000-4000-8000-000000000000'),true);
set local role authenticated;
do $qa$
declare id text:='v239-qa-transaccion-'||gen_random_uuid()::text; t uuid:=gen_random_uuid(); r public.informes_v239; r2 public.informes_v239; payload jsonb; aid uuid; n integer; actor public.perfiles;
begin
 select * into actor from public.perfiles where usuario_id=auth.uid();
 if actor.usuario_id is null then insert into qa239_resultados values('usuario APR','Sin perfil existente para este ámbito; no se crea ni modifica ninguno');return;end if;
 payload:=jsonb_build_object('version','v239','reportId',id,'owner','Prueba transaccional','status','En edición','data',jsonb_build_object('activities','[]'::jsonb,'inspections','[]'::jsonb,'findings','[]'::jsonb));
 if not hys239_private.allowed('APR','write') then
  begin perform public.hys239_guardar_informe(id,'APR',payload,null,0,t);raise exception 'Se admitió escritura de consulta';exception when insufficient_privilege then null;end;
  insert into qa239_resultados values('usuario APR','OK consulta sin escritura');return;
 end if;
 r:=public.hys239_guardar_informe(id,'APR',payload,null,0,t);
 if r.revision<>1 or r.payload->>'reportId'<>id or r.ultimo_actor_id<>auth.uid() then raise exception 'Identidad incorrecta';end if;
 if actor.rol<>'administrador_global' and r.payload->>'owner'<>actor.nombre then raise exception 'Responsable incorrecto';end if;
 r2:=public.hys239_guardar_informe(id,'APR',payload,null,0,t);
 if r2.revision<>1 then raise exception 'Token no idempotente';end if;
 payload:=jsonb_set(r.payload,'{status}','"Finalizado"'::jsonb);
 r2:=public.hys239_guardar_informe(id,'APR',payload,null,1,gen_random_uuid());
 if r2.revision<>2 or r2.payload->>'status'<>'Finalizado' then raise exception 'Finalización incorrecta';end if;
 begin perform public.hys239_guardar_informe(id,'APR',payload,null,0,gen_random_uuid());raise exception 'No se detectó conflicto';exception when serialization_failure then null;end;
 if hys239_private.allowed('APR','manage') then
  insert into public.areas_trabajo_v239(modulo,nombre) values('APR','QA transaccional '||gen_random_uuid()) returning areas_trabajo_v239.id into aid;
  update public.areas_trabajo_v239 set nombre=nombre||' editada' where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=false where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=true where areas_trabajo_v239.id=aid;
  select count(*) into n from public.auditoria_areas_v239 where area_id=aid and usuario_id=auth.uid();
  if n<>4 then raise exception 'Auditoría incompleta';end if;
 end if;
 if actor.rol<>'administrador_global' then
  begin insert into public.listas_v239(modulo,campo,valor) values('APR','project','QA no autorizado');raise exception 'Se admitió lista no autorizada';exception when insufficient_privilege then null;end;
 end if;
 insert into qa239_resultados values('usuario APR','OK guardado, recuperación por consulta, finalización, idempotencia, conflicto y permisos');
end $qa$;

reset role;
select set_config('request.jwt.claim.sub',coalesce((select p.usuario_id::text from public.perfiles p where p.activo and p.rol='usuario' and (p.rol='administrador_global' or exists(select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id where u.usuario_id=p.usuario_id and u.modulo='OTROS' and u.puede_ver and a.activa)) order by p.usuario_id limit 1),'00000000-0000-4000-8000-000000000000'),true);
set local role authenticated;
do $qa$
declare id text:='v239-qa-transaccion-'||gen_random_uuid()::text; t uuid:=gen_random_uuid(); r public.informes_v239; r2 public.informes_v239; payload jsonb; aid uuid; n integer; actor public.perfiles;
begin
 select * into actor from public.perfiles where usuario_id=auth.uid();
 if actor.usuario_id is null then insert into qa239_resultados values('usuario OTROS','Sin perfil existente para este ámbito; no se crea ni modifica ninguno');return;end if;
 payload:=jsonb_build_object('version','v239','reportId',id,'owner','Prueba transaccional','status','En edición','data',jsonb_build_object('activities','[]'::jsonb,'inspections','[]'::jsonb,'findings','[]'::jsonb));
 if not hys239_private.allowed('OTROS','write') then
  begin perform public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);raise exception 'Se admitió escritura de consulta';exception when insufficient_privilege then null;end;
  insert into qa239_resultados values('usuario OTROS','OK consulta sin escritura');return;
 end if;
 r:=public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);
 if r.revision<>1 or r.payload->>'reportId'<>id or r.ultimo_actor_id<>auth.uid() then raise exception 'Identidad incorrecta';end if;
 if actor.rol<>'administrador_global' and r.payload->>'owner'<>actor.nombre then raise exception 'Responsable incorrecto';end if;
 r2:=public.hys239_guardar_informe(id,'OTROS',payload,null,0,t);
 if r2.revision<>1 then raise exception 'Token no idempotente';end if;
 payload:=jsonb_set(r.payload,'{status}','"Finalizado"'::jsonb);
 r2:=public.hys239_guardar_informe(id,'OTROS',payload,null,1,gen_random_uuid());
 if r2.revision<>2 or r2.payload->>'status'<>'Finalizado' then raise exception 'Finalización incorrecta';end if;
 begin perform public.hys239_guardar_informe(id,'OTROS',payload,null,0,gen_random_uuid());raise exception 'No se detectó conflicto';exception when serialization_failure then null;end;
 if hys239_private.allowed('OTROS','manage') then
  insert into public.areas_trabajo_v239(modulo,nombre) values('OTROS','QA transaccional '||gen_random_uuid()) returning areas_trabajo_v239.id into aid;
  update public.areas_trabajo_v239 set nombre=nombre||' editada' where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=false where areas_trabajo_v239.id=aid;
  update public.areas_trabajo_v239 set activa=true where areas_trabajo_v239.id=aid;
  select count(*) into n from public.auditoria_areas_v239 where area_id=aid and usuario_id=auth.uid();
  if n<>4 then raise exception 'Auditoría incompleta';end if;
 end if;
 if actor.rol<>'administrador_global' then
  begin insert into public.listas_v239(modulo,campo,valor) values('OTROS','project','QA no autorizado');raise exception 'Se admitió lista no autorizada';exception when insufficient_privilege then null;end;
 end if;
 insert into qa239_resultados values('usuario OTROS','OK guardado, recuperación por consulta, finalización, idempotencia, conflicto y permisos');
end $qa$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
set local role authenticated;
do $qa$ begin
 if exists(select 1 from public.informes_v239) then raise exception 'Un perfil inexistente accedió a informes';end if;
 insert into qa239_resultados values('Perfil inexistente','OK acceso denegado');
end $qa$;
reset role;
select * from qa239_resultados order by prueba;
rollback;
