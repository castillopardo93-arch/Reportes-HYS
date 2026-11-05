-- Paquete v242: NO ejecutar sin aprobación y respaldo restaurable verificado.
begin;

-- base-central-v242.sql
-- v242: almacenamiento aislado autorizado para pruebas generales.
-- v242: objetos nuevos e independientes. No altera perfiles, permisos_usuario ni areas.

create schema hys242_private;
revoke all on schema hys242_private from public,anon,authenticated;
grant usage on schema hys242_private to authenticated;
create function hys242_private.allowed(m text, purpose text default 'read') returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles p where p.usuario_id=auth.uid() and p.activo
 and (p.rol='administrador_global' or (purpose<>'global' and exists(
 select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id
 where u.usuario_id=p.usuario_id and u.modulo=m and a.activa and u.puede_ver
 and (purpose='read' or (purpose='write' and u.puede_editar) or (purpose='audit' and p.rol in ('administrador_area','supervisor')) or (purpose='manage' and u.puede_editar and p.rol in ('administrador_area','supervisor')))))))
$$;
revoke all on function hys242_private.allowed(text,text) from public,anon;
grant execute on function hys242_private.allowed(text,text) to authenticated;
create table public.areas_trabajo_v242(
 id uuid primary key default gen_random_uuid(), modulo text not null check(modulo in ('APR','OTROS')),
 nombre text not null check(length(btrim(nombre)) between 1 and 150), activa boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now());
create unique index areas_trabajo_v242_unique on public.areas_trabajo_v242(modulo,lower(regexp_replace(btrim(nombre),'\s+',' ','g')));
create table public.auditoria_areas_v242(
 id bigint generated always as identity primary key, fecha timestamptz not null default now(),
 usuario_id uuid, usuario_nombre text not null, rol text not null, modulo text not null,
 area_id uuid not null references public.areas_trabajo_v242(id), accion text not null check(accion in ('creacion','modificacion','desactivacion','reactivacion')),
 anterior jsonb, nuevo jsonb not null);
create function hys242_private.area_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare actor public.perfiles; action text;
begin
 if tg_op='UPDATE' then if new.id<>old.id or new.modulo<>old.modulo then raise exception 'El módulo y la identidad del área no se cambian';end if;new.creado_en:=old.creado_en;end if;
 if not hys242_private.allowed(new.modulo,'manage') then raise exception 'Área fuera de tu ámbito autorizado' using errcode='42501'; end if;
 select * into strict actor from public.perfiles where usuario_id=auth.uid() and activo;
 if to_regclass('public.cuentas_v242') is not null then execute 'select coalesce((select nombre from public.cuentas_v242 where usuario_id=$1),$2)' into actor.nombre using auth.uid(),actor.nombre;end if;
 new.nombre:=regexp_replace(btrim(new.nombre),'\s+',' ','g'); new.actualizado_en:=clock_timestamp();
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.modulo<>old.modulo then raise exception 'Identidad y módulo inmutables'; end if;
  if new.nombre=old.nombre and new.activa=old.activa then return old; end if;
  action:=case when new.activa<>old.activa then case when new.activa then 'reactivacion' else 'desactivacion' end else 'modificacion' end;
 else action:='creacion'; end if;
 insert into public.auditoria_areas_v242(usuario_id,usuario_nombre,rol,modulo,area_id,accion,anterior,nuevo)
 values(actor.usuario_id,actor.nombre,actor.rol,new.modulo,new.id,action,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
-- FK diferida permite insertar la auditoría desde BEFORE INSERT de forma atómica.
alter table public.auditoria_areas_v242 drop constraint auditoria_areas_v242_area_id_fkey;
alter table public.auditoria_areas_v242 add constraint auditoria_areas_v242_area_id_fkey foreign key(area_id) references public.areas_trabajo_v242(id) deferrable initially deferred;
create trigger area_audit_v242 before insert or update on public.areas_trabajo_v242 for each row execute function hys242_private.area_audit();
revoke all on function hys242_private.area_audit() from public,anon,authenticated;
create table public.listas_v242(
 id uuid primary key default gen_random_uuid(), modulo text not null check(modulo in ('APR','OTROS')),
 campo text not null check(campo in ('shift','project','Resultado','Prioridad','Estado','otherCategory','otherStatus','owner')),
 valor text not null check(length(btrim(valor)) between 1 and 150), activa boolean not null default true,
 actualizado_en timestamptz not null default now());
create unique index listas_v242_unique on public.listas_v242(modulo,campo,lower(regexp_replace(btrim(valor),'\s+',' ','g')));
create table public.informes_v242(
 id text primary key check(length(id) between 1 and 200), modulo text not null check(modulo in ('APR','OTROS')),
 creador_id uuid not null references public.perfiles(usuario_id), creador_nombre text not null,
 ultimo_actor_id uuid not null references public.perfiles(usuario_id), ultimo_actor_nombre text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'), archivo jsonb,
 revision integer not null default 1 check(revision>0), ultimo_token uuid not null,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now());
create index informes_v242_modulo_actor on public.informes_v242(modulo,creador_id,actualizado_en desc);
create index auditoria_areas_v242_modulo_fecha on public.auditoria_areas_v242(modulo,fecha desc);
create index auditoria_areas_v242_area on public.auditoria_areas_v242(area_id);
create index informes_v242_actor on public.informes_v242(ultimo_actor_id);
alter table public.areas_trabajo_v242 enable row level security;
alter table public.auditoria_areas_v242 enable row level security;
alter table public.listas_v242 enable row level security;
alter table public.informes_v242 enable row level security;
revoke all on public.areas_trabajo_v242,public.auditoria_areas_v242,public.listas_v242,public.informes_v242 from public,anon,authenticated;
grant select on public.areas_trabajo_v242,public.auditoria_areas_v242,public.listas_v242,public.informes_v242 to authenticated;
grant insert(modulo,nombre),update(nombre,activa) on public.areas_trabajo_v242 to authenticated;
grant insert(modulo,campo,valor),update(valor,activa,actualizado_en) on public.listas_v242 to authenticated;
create policy areas_read_v242 on public.areas_trabajo_v242 for select to authenticated using(hys242_private.allowed(modulo,'read') and (activa or hys242_private.allowed(modulo,'audit')));
create policy areas_insert_v242 on public.areas_trabajo_v242 for insert to authenticated with check(hys242_private.allowed(modulo,'manage'));
create policy areas_update_v242 on public.areas_trabajo_v242 for update to authenticated using(hys242_private.allowed(modulo,'manage')) with check(hys242_private.allowed(modulo,'manage'));
create policy audit_read_v242 on public.auditoria_areas_v242 for select to authenticated using(hys242_private.allowed(modulo,'audit'));
create policy lists_read_v242 on public.listas_v242 for select to authenticated using(hys242_private.allowed(modulo,'read') and (activa or hys242_private.allowed(modulo,'global')));
create policy lists_insert_v242 on public.listas_v242 for insert to authenticated with check(hys242_private.allowed(modulo,'global'));
create policy lists_update_v242 on public.listas_v242 for update to authenticated using(hys242_private.allowed(modulo,'global')) with check(hys242_private.allowed(modulo,'global'));
create policy reports_read_v242 on public.informes_v242 for select to authenticated using(hys242_private.allowed(modulo,'read') and (creador_id=(select auth.uid()) or hys242_private.allowed(modulo,'audit')));
create function public.hys242_guardar_informe(p_id text,p_modulo text,p_payload jsonb,p_archivo jsonb,p_revision integer,p_token uuid) returns public.informes_v242
language plpgsql security definer set search_path='' as $$
declare actor public.perfiles; previous public.informes_v242; result public.informes_v242;
begin
 if not hys242_private.allowed(p_modulo,'write') then raise exception 'No tienes permiso para guardar en este módulo' using errcode='42501'; end if;
 select * into strict actor from public.perfiles where usuario_id=auth.uid() and activo;
 if to_regclass('public.cuentas_v242') is not null then execute 'select coalesce((select nombre from public.cuentas_v242 where usuario_id=$1),$2)' into actor.nombre using actor.usuario_id,actor.nombre;end if;
 if p_token is null or p_payload is null or p_revision is null or p_id not like 'v242-%' or p_modulo not in ('APR','OTROS') then raise exception 'Datos incompletos'; end if;
 if jsonb_typeof(p_payload->'data') is distinct from 'object' or jsonb_typeof(p_payload#>'{data,activities}') is distinct from 'array' or jsonb_typeof(p_payload#>'{data,inspections}') is distinct from 'array' or jsonb_typeof(p_payload#>'{data,findings}') is distinct from 'array' or p_payload->>'status' not in ('En edición','Finalizado') then raise exception 'Informe inválido'; end if;
 p_payload:=jsonb_set(p_payload,'{reportId}',to_jsonb(p_id),true);

 -- actor real siempre proviene de Auth/perfiles, nunca del formulario.
 p_payload:=p_payload-'authenticatedUser';
 if p_modulo='OTROS' then p_payload:=jsonb_set(p_payload,'{data,activities}','[]'::jsonb,true); p_payload:=jsonb_set(p_payload,'{data,inspections}','[]'::jsonb,true); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id,239));
 select * into previous from public.informes_v242 where id=p_id for update;
 if found then
  if previous.modulo<>p_modulo or (previous.creador_id<>auth.uid() and not hys242_private.allowed(p_modulo,'manage')) then raise exception 'Informe fuera de tu ámbito' using errcode='42501'; end if;
  if previous.ultimo_token=p_token then return previous; end if;
  if previous.revision<>p_revision then raise exception 'Conflicto: existe una versión más reciente. Conserva tu copia y recarga.' using errcode='40001'; end if;
  if actor.rol<>'administrador_global' then p_payload:=jsonb_set(p_payload,'{owner}',previous.payload->'owner',true); end if;
  if p_archivo is null and (p_payload-array['history','authenticatedUser','aprNames','areaNames','version'])=(previous.payload-array['history','authenticatedUser','aprNames','areaNames','version']) then p_archivo:=previous.archivo; end if;
  if p_archivo is not null and (p_archivo#>>'{metadata,reportId}' is distinct from p_id or p_archivo#>>'{metadata,reportData,owner}' is distinct from p_payload->>'owner' or ((p_archivo#>'{metadata,reportData}')-array['history','authenticatedUser','aprNames','areaNames','version']) is distinct from (p_payload-array['history','authenticatedUser','aprNames','areaNames','version'])) then raise exception 'El PDF no corresponde al informe'; end if;
  if p_archivo is not null then p_archivo:=jsonb_set(p_archivo,'{metadata,reportData}',p_payload,true); end if;
  if (p_payload-array['history','authenticatedUser','aprNames','areaNames','version']) is not distinct from (previous.payload-array['history','authenticatedUser','aprNames','areaNames','version']) and p_archivo is not distinct from previous.archivo then return previous;end if;
  update public.informes_v242 set payload=p_payload,archivo=p_archivo,revision=revision+1,ultimo_token=p_token,
   ultimo_actor_id=actor.usuario_id,ultimo_actor_nombre=actor.nombre,actualizado_en=clock_timestamp() where id=p_id returning * into result;
 else
  if p_revision<>0 then raise exception 'Revisión inexistente' using errcode='40001'; end if;
  if actor.rol<>'administrador_global' then p_payload:=jsonb_set(p_payload,'{owner}',to_jsonb(actor.nombre),true); end if;
  if p_archivo is not null and (p_archivo#>>'{metadata,reportId}' is distinct from p_id or p_archivo#>>'{metadata,reportData,owner}' is distinct from p_payload->>'owner' or ((p_archivo#>'{metadata,reportData}')-array['history','authenticatedUser','aprNames','areaNames','version']) is distinct from (p_payload-array['history','authenticatedUser','aprNames','areaNames','version'])) then raise exception 'El PDF no corresponde al informe'; end if;
  if p_archivo is not null then p_archivo:=jsonb_set(p_archivo,'{metadata,reportData}',p_payload,true); end if;
  insert into public.informes_v242(id,modulo,creador_id,creador_nombre,ultimo_actor_id,ultimo_actor_nombre,payload,archivo,ultimo_token)
  values(p_id,p_modulo,actor.usuario_id,actor.nombre,actor.usuario_id,actor.nombre,p_payload,p_archivo,p_token) returning * into result;
 end if;
 return result;
end $$;
revoke all on function public.hys242_guardar_informe(text,text,jsonb,jsonb,integer,uuid) from public,anon;
grant execute on function public.hys242_guardar_informe(text,text,jsonb,jsonb,integer,uuid) to authenticated;
-- Inicialización de las once áreas conocidas: baseline de despliegue, sin suplantar a ningún usuario.
alter table public.areas_trabajo_v242 disable trigger area_audit_v242;
do $$ begin
 if to_regclass('public.areas_trabajo_v241') is not null then
  execute 'insert into public.areas_trabajo_v242(modulo,nombre,activa) select modulo,nombre,activa from public.areas_trabajo_v241';
 else insert into public.areas_trabajo_v242(modulo,nombre) select m,n from unnest(array['APR','OTROS'])m cross join unnest(array['VA4','V5','VA4/V5','VOLCAN','AUCAYES','MAITENES','VA1','VA2','COLORADO','VL4','VL5'])n; end if;
end $$;
insert into public.auditoria_areas_v242(usuario_nombre,rol,modulo,area_id,accion,nuevo) select 'Inicialización v242','sistema',modulo,id,'creacion',to_jsonb(a) from public.areas_trabajo_v242 a;
alter table public.areas_trabajo_v242 enable trigger area_audit_v242;
do $$ begin
 if to_regclass('public.listas_v241') is not null then
  execute 'insert into public.listas_v242(modulo,campo,valor,activa) select modulo,campo,valor,activa from public.listas_v241';
 else insert into public.listas_v242(modulo,campo,valor)
 select m,c,v from unnest(array['APR','OTROS'])m cross join (values
 ('shift','Día/Propio'),('shift','Noche/Propio'),('shift','Día/Reemplazo'),('shift','Noche/Reemplazo'),
 ('project','PHAM 1'),('project','PHAM 2'),('Resultado','Sin novedades'),('Resultado','Con observaciones'),('Resultado','Requiere seguimiento'),('Resultado','Otro'),
 ('Prioridad','Baja'),('Prioridad','Media'),('Prioridad','Alta'),('Prioridad','Crítica'),('Estado','Pendiente'),('Estado','En proceso'),('Estado','Completado'),
 ('otherCategory','Inspección'),('otherCategory','Actividad operacional'),('otherCategory','Mantenimiento'),('otherCategory','Hallazgo'),('otherCategory','Seguimiento'),('otherCategory','Otro'),
 ('otherStatus','Pendiente'),('otherStatus','En proceso'),('otherStatus','Finalizado'))x(c,v); end if;
end $$;


-- apariencia-v242.sql
-- Apariencia compartida exclusiva de v242; datos e informes no se alteran.

create table public.apariencia_v242(
 id smallint primary key default 1 check(id=1),config jsonb not null default '{}'::jsonb,
 revision integer not null default 0 check(revision>=0),actualizado_en timestamptz not null default now(),
 actor_id uuid references public.perfiles(usuario_id),actor_nombre text);
create table public.historial_apariencia_v242(
 revision integer primary key,config jsonb not null,fecha timestamptz not null default now(),
 actor_id uuid references public.perfiles(usuario_id),actor_nombre text not null);
create index historial_apariencia_v242_actor on public.historial_apariencia_v242(actor_id);
create index apariencia_v242_actor on public.apariencia_v242(actor_id);
do $$ begin
 if to_regclass('public.apariencia_v241') is not null then
  execute 'insert into public.apariencia_v242(id,config) select 1,config from public.apariencia_v241 where id=1';
 else insert into public.apariencia_v242(id,config) values(1,'{}'); end if;
end $$;
insert into public.historial_apariencia_v242(revision,config,actor_nombre) select 0,config,'Inicialización v242 desde configuración de origen' from public.apariencia_v242 where id=1;
alter table public.apariencia_v242 enable row level security;
alter table public.historial_apariencia_v242 enable row level security;
revoke all on public.apariencia_v242,public.historial_apariencia_v242 from public,anon,authenticated;
grant select on public.apariencia_v242,public.historial_apariencia_v242 to authenticated;
grant update(config) on public.apariencia_v242 to authenticated;
create policy apariencia_read_v242 on public.apariencia_v242 for select to authenticated using((select hys242_private.allowed('APR','read')) or (select hys242_private.allowed('OTROS','read')));
create policy apariencia_update_v242 on public.apariencia_v242 for update to authenticated using((select hys242_private.allowed('APR','global'))) with check((select hys242_private.allowed('APR','global')));
create policy apariencia_history_read_v242 on public.historial_apariencia_v242 for select to authenticated using((select hys242_private.allowed('APR','global')));
create function hys242_private.valid_appearance(c jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; v jsonb;
begin
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>260000 then return false;end if;
 for k,v in select * from jsonb_each(c) loop
  if k not in ('preset','colors','icons','text','fontSize','spacing','radius','logo') then return false;end if;
  if k='preset' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('corporativo','claro','contraste','personalizado')) then return false;end if;
  if k='fontSize' and (jsonb_typeof(v)<>'number' or (v#>>'{}')::numeric not between 12 and 18) then return false;end if;
  if k='radius' and (jsonb_typeof(v)<>'number' or (v#>>'{}')::numeric not in (0,8,12,16,24)) then return false;end if;
  if k='spacing' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('compacto','normal','amplio')) then return false;end if;
  if k='logo' and (jsonb_typeof(v)<>'string' or length(v#>>'{}')>220000 or (v#>>'{}'<>'' and v#>>'{}' !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$')) then return false;end if;
 end loop;
 for k in select unnest(array['colors','icons','text']) loop
  if c?k and jsonb_typeof(c->k)<>'object' then return false;end if;
 end loop;
 for k,v in select * from jsonb_each(coalesce(c->'colors','{}')) loop
  if k not in ('background','surface','header','sidebar','primary','secondary','text','muted','border','activities','inspections','findings','active') or jsonb_typeof(v)<>'string' or v#>>'{}' !~ '^#[0-9a-fA-F]{6}$' then return false;end if;
 end loop;
 for k,v in select * from jsonb_each(coalesce(c->'icons','{}')) loop
  if k not in ('APR','OTROS','brand','inicio','informe','historial','config','activities','inspections','findings') or jsonb_typeof(v)<>'string' or v#>>'{}' not in ('shield','clipboard','helmet','users','alert','briefcase','check','tools','leaf','building','star','settings','palette','home','report','history','search') then return false;end if;
 end loop;
 for k,v in select * from jsonb_each(coalesce(c->'text','{}')) loop
  if k not in ('company','title','APR','OTROS','descriptionAPR','descriptionOTROS') or jsonb_typeof(v)<>'string' or length(v#>>'{}')>180 then return false;end if;
  if k in ('title','APR','OTROS') and length(btrim(v#>>'{}'))<1 then return false;end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function hys242_private.valid_appearance(jsonb) from public,anon;
grant execute on function hys242_private.valid_appearance(jsonb) to authenticated;
alter table public.apariencia_v242 add constraint apariencia_valid_v242 check(hys242_private.valid_appearance(config));
create function hys242_private.appearance_update() returns trigger language plpgsql security definer set search_path='' as $$
declare actor public.perfiles;
begin
 if not hys242_private.allowed('APR','global') then raise exception 'Solo el Administrador Global puede modificar la apariencia' using errcode='42501';end if;
 if not hys242_private.valid_appearance(new.config) then raise exception 'Configuración de apariencia inválida' using errcode='22023';end if;
 select * into strict actor from public.perfiles where usuario_id=auth.uid() and activo and rol='administrador_global';
 new.id:=old.id;new.revision:=old.revision+1;new.actualizado_en:=clock_timestamp();new.actor_id:=actor.usuario_id;new.actor_nombre:=actor.nombre;
 return new;
end $$;
create function hys242_private.appearance_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.historial_apariencia_v242(revision,config,fecha,actor_id,actor_nombre) values(new.revision,new.config,new.actualizado_en,new.actor_id,new.actor_nombre);
 return new;
end $$;
revoke all on function hys242_private.appearance_update(),hys242_private.appearance_history() from public,anon,authenticated;
create trigger apariencia_update_v242 before update on public.apariencia_v242 for each row execute function hys242_private.appearance_update();
create trigger apariencia_history_v242 after update on public.apariencia_v242 for each row execute function hys242_private.appearance_history();


-- facultades-v242.sql
-- PROPUESTA REVISABLE. No aplicada al proyecto remoto.
-- Requiere base-central-v242.sql y apariencia-v242.sql antes de activación.

do $$begin
 if (select count(*) from public.perfiles where rol='administrador_global')<>1 then
  raise exception 'Debe existir un único Administrador general; no se modifica ninguna cuenta';
 end if;
end$$;
create table public.facultades_v242 (
 usuario_id uuid not null references public.perfiles(usuario_id),
 modulo text not null check(modulo in ('APR','OTROS')),
 areas_ids uuid[] not null default '{}',
 facultades jsonb not null default '{}',
 revision integer not null default 1,
 actualizado_en timestamptz not null default now(),
 actor_id uuid not null references public.perfiles(usuario_id),
 primary key(usuario_id,modulo),check(revision>0)
);
create table public.auditoria_facultades_v242 (
 id bigint generated always as identity primary key,
 fecha timestamptz not null default clock_timestamp(),
 actor_id uuid not null,actor_nombre text not null,actor_rol text not null,
 usuario_id uuid not null,modulo text not null,motivo text not null,
 anterior jsonb,nuevo jsonb not null
);
alter table public.facultades_v242 enable row level security;
alter table public.auditoria_facultades_v242 enable row level security;
revoke all on public.facultades_v242,public.auditoria_facultades_v242 from public,anon,authenticated;
grant select on public.facultades_v242,public.auditoria_facultades_v242 to authenticated;
create function hys242_private.general_unico() returns boolean language sql stable security definer set search_path='' as $$
 select (select count(*) from public.perfiles where rol='administrador_global')=1
 and exists(select 1 from public.perfiles where usuario_id=auth.uid() and activo and rol='administrador_global')
$$;
revoke all on function hys242_private.general_unico() from public,anon;
grant execute on function hys242_private.general_unico() to authenticated;
create policy facultades_read_v242 on public.facultades_v242 for select to authenticated
 using(hys242_private.general_unico() or (usuario_id=auth.uid() and exists(select 1 from public.perfiles p where p.usuario_id=auth.uid() and p.activo)));
create policy facultades_audit_read_v242 on public.auditoria_facultades_v242 for select to authenticated using(hys242_private.general_unico());
create function public.hys242_listar_administradores() returns table(usuario_id uuid,nombre text,activo boolean)
 language plpgsql security definer set search_path='' as $$begin
 if not hys242_private.general_unico() then raise exception 'Solo Administrador general' using errcode='42501';end if;
 return query select p.usuario_id,p.nombre,p.activo from public.perfiles p where p.rol='administrador_area' order by p.nombre,p.usuario_id;
end$$;
revoke all on function public.hys242_listar_administradores() from public,anon;
grant execute on function public.hys242_listar_administradores() to authenticated;
create function public.hys242_asignar_facultades(p_usuario uuid,p_modulo text,p_areas uuid[],p_facultades jsonb,p_revision integer,p_motivo text)
 returns public.facultades_v242 language plpgsql security definer set search_path='' as $$
declare target public.perfiles; actor public.perfiles; old public.facultades_v242; result public.facultades_v242; item record;
begin
 if not hys242_private.general_unico() then raise exception 'Solo Administrador general' using errcode='42501';end if;
 select * into actor from public.perfiles where usuario_id=auth.uid();
 select * into target from public.perfiles where usuario_id=p_usuario for share;
 if found and to_regclass('public.cuentas_v242') is not null then execute 'select coalesce((select rol from public.cuentas_v242 where usuario_id=$1),$2)' into target.rol using p_usuario,target.rol;end if;
 if target.usuario_id is null or target.rol<>'administrador_area' or p_usuario=actor.usuario_id then raise exception 'Cuenta protegida o destino inválido' using errcode='42501';end if;
 if p_modulo is null or p_modulo not in ('APR','OTROS') or p_areas is null or p_facultades is null or jsonb_typeof(p_facultades)<>'object' or nullif(btrim(p_motivo),'') is null or length(p_motivo)>500 or p_revision is null or p_revision<0 then raise exception 'Solicitud inválida';end if;
 for item in select key,value from jsonb_each(p_facultades) loop
  if item.key not in ('view','pdf','review','approve','close','editOthers','areas','users','activation','audit') or jsonb_typeof(item.value)<>'boolean' then raise exception 'Facultad no permitida';end if;
 end loop;
 if cardinality(p_areas)<> (select count(distinct a) from unnest(p_areas) a) or exists(select 1 from unnest(p_areas) a where not exists(select 1 from public.areas_trabajo_v242 t where t.id=a and t.modulo=p_modulo)) then raise exception 'Áreas fuera del módulo o duplicadas';end if;
 if (p_facultades->'pdf'='true'::jsonb or p_facultades->'review'='true'::jsonb or p_facultades->'approve'='true'::jsonb or p_facultades->'close'='true'::jsonb or p_facultades->'editOthers'='true'::jsonb) and coalesce(p_facultades->'view','false'::jsonb)<>'true'::jsonb then raise exception 'Descarga, edición y revisión requieren permiso de consulta';end if;
 if cardinality(p_areas)=0 and exists(select 1 from jsonb_each(p_facultades) e where e.value='true'::jsonb) then raise exception 'Las facultades requieren áreas explícitas';end if;
 -- Serializa altas y actualizaciones del mismo administrador/módulo.
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text||':'||p_modulo,242));
 select * into old from public.facultades_v242 where usuario_id=p_usuario and modulo=p_modulo for update;
 if coalesce(old.revision,0)<>p_revision then raise exception 'Los permisos cambiaron; vuelve a consultar' using errcode='40001';end if;
 insert into public.facultades_v242(usuario_id,modulo,areas_ids,facultades,actor_id)
 values(p_usuario,p_modulo,p_areas,p_facultades,actor.usuario_id)
 on conflict(usuario_id,modulo) do update set areas_ids=excluded.areas_ids,facultades=excluded.facultades,actor_id=excluded.actor_id,revision=facultades_v242.revision+1,actualizado_en=clock_timestamp() returning * into result;
 insert into public.auditoria_facultades_v242(actor_id,actor_nombre,actor_rol,usuario_id,modulo,motivo,anterior,nuevo)
 values(actor.usuario_id,actor.nombre,actor.rol,p_usuario,p_modulo,btrim(p_motivo),case when old.usuario_id is null then null else to_jsonb(old) end,to_jsonb(result));
 return result;
end$$;
revoke all on function public.hys242_asignar_facultades(uuid,text,uuid[],jsonb,integer,text) from public,anon;
grant execute on function public.hys242_asignar_facultades(uuid,text,uuid[],jsonb,integer,text) to authenticated;
create function hys242_private.facultad(m text,k text,a uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select hys242_private.general_unico() or exists(
 select 1 from public.facultades_v242 f join public.perfiles p on p.usuario_id=f.usuario_id
 where f.usuario_id=auth.uid() and p.activo and p.rol='administrador_area' and f.modulo=m and f.facultades->k='true'::jsonb
 and cardinality(f.areas_ids)>0 and (a is null or a=any(f.areas_ids)))
$$;
revoke all on function hys242_private.facultad(text,text,uuid) from public,anon;
grant execute on function hys242_private.facultad(text,text,uuid) to authenticated;


-- seguridad-operativa-v242.sql
-- Integración aditiva v242. SOLO instalación revisada; no aplicada en remoto.
-- Orden: base-central, apariencia, facultades, seguridad-operativa.

alter table public.informes_v242 add column areas_ids uuid[];
create table public.cuentas_v242(
 usuario_id uuid primary key references public.perfiles(usuario_id),nombre text not null,
 rol text not null check(rol in ('administrador_area','supervisor','usuario')),activo boolean not null,
 ambitos jsonb not null check(jsonb_typeof(ambitos)='object'),revision int not null default 1 check(revision>0));
create table public.eventos_v242(id bigint generated always as identity primary key,fecha timestamptz not null default clock_timestamp(),actor_id uuid not null,actor_nombre text not null,accion text not null,modulo text,entidad text not null,motivo text not null,anterior jsonb,nuevo jsonb);
create table public.revision_informes_v242(informe_id text primary key references public.informes_v242(id),estado text not null check(estado in ('Borrador','Enviado','Devuelto','Corregido','Aprobado','Cerrado','Reabierto')),version_informe int not null,revision int not null default 1);
create table public.historial_revision_v242(id bigint generated always as identity primary key,informe_id text not null references public.informes_v242(id),fecha timestamptz not null default clock_timestamp(),actor_id uuid not null,accion text not null,motivo text not null,version_informe int not null,payload jsonb not null,archivo jsonb,areas_ids uuid[]);
alter table public.cuentas_v242 enable row level security;
alter table public.eventos_v242 enable row level security;
alter table public.revision_informes_v242 enable row level security;
alter table public.historial_revision_v242 enable row level security;
revoke all on public.cuentas_v242,public.eventos_v242,public.revision_informes_v242,public.historial_revision_v242 from public,anon,authenticated;
grant select on public.cuentas_v242,public.eventos_v242,public.revision_informes_v242,public.historial_revision_v242 to authenticated;
-- Evita depender de la posición física de columnas de perfiles en las demás funciones.
create function hys242_private.activo() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles p left join public.cuentas_v242 c using(usuario_id) where p.usuario_id=auth.uid() and p.activo and coalesce(c.activo,true))
$$;
create function hys242_private.rol() returns text language sql stable security definer set search_path='' as $$
 select case when p.rol='administrador_global' then p.rol else coalesce(c.rol,p.rol) end from public.perfiles p left join public.cuentas_v242 c using(usuario_id) where p.usuario_id=auth.uid() and p.activo and coalesce(c.activo,true)
$$;
-- Reemplazo con acceso JSON sin construir rutas a partir de SQL de cliente.
create or replace function hys242_private.modulo(m text,editar boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select hys242_private.activo() and not (hys242_private.rol()='administrador_area' and exists(select 1 from public.facultades_v242 f where f.usuario_id=auth.uid() and f.modulo=m and cardinality(f.areas_ids)=0)) and (hys242_private.general_unico() or
 case when exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) then
 exists(select 1 from public.cuentas_v242 c where c.usuario_id=auth.uid() and c.ambitos?m and coalesce((c.ambitos->m->>'ver')::boolean,false) and (not editar or coalesce((c.ambitos->m->>'editar')::boolean,false)))
 else exists(select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id where u.usuario_id=auth.uid() and u.modulo=m and a.activa and u.puede_ver and (not editar or u.puede_editar)) end)
$$;
create or replace function hys242_private.facultad(m text,k text,a uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select hys242_private.activo() and (hys242_private.general_unico() or exists(
 select 1 from public.facultades_v242 f where f.usuario_id=auth.uid() and hys242_private.rol()='administrador_area' and f.modulo=m and f.facultades->k='true'::jsonb and cardinality(f.areas_ids)>0 and (a is null or a=any(f.areas_ids))))
$$;
create function hys242_private.areas_informe(m text,p jsonb) returns uuid[] language plpgsql stable security definer set search_path='' as $$
declare names text[];ids uuid[];begin
 select array_agg(distinct nombre) into names from (
 select nullif(btrim(p->>'area'),'') nombre union all
 select nullif(btrim(v->>1),'') from jsonb_array_elements(coalesce(p#>'{data,activities}','[]')) v union all
 select nullif(btrim(v->>0),'') from jsonb_array_elements(coalesce(p#>'{data,inspections}','[]')) v
 ) x where nombre is not null;
 if coalesce(cardinality(names),0)=0 then return null;end if;
 select array_agg(id) into ids from public.areas_trabajo_v242 where modulo=m and nombre=any(names);
 if cardinality(ids) is distinct from cardinality(names) then return null;end if;return ids;
end$$;
create function hys242_private.en_ids(m text,ids uuid[],cap text default null) returns boolean language plpgsql stable security definer set search_path='' as $$
declare id uuid;c public.cuentas_v242;begin
 if not hys242_private.activo() then return false;end if;if hys242_private.general_unico() then return true;end if;
 if coalesce(cardinality(ids),0)=0 then return false;end if;
 if cap is not null then foreach id in array ids loop if not hys242_private.facultad(m,cap,id) then return false;end if;end loop;return true;end if;
 if hys242_private.rol()='administrador_area' and exists(select 1 from public.facultades_v242 where usuario_id=auth.uid() and modulo=m) then return not exists(select 1 from unnest(ids) i where not exists(select 1 from public.facultades_v242 f where f.usuario_id=auth.uid() and f.modulo=m and i=any(f.areas_ids)));end if;
 select * into c from public.cuentas_v242 where usuario_id=auth.uid();
 if found then return hys242_private.modulo(m,false) and not exists(select 1 from unnest(ids) i where not (coalesce(c.ambitos->m->'areas','[]')?i::text));end if;
 return hys242_private.modulo(m,false);
end$$;
create function hys242_private.ambito_informe(m text,p jsonb,cap text default null) returns boolean language sql stable security definer set search_path='' as $$select hys242_private.en_ids(m,hys242_private.areas_informe(m,p),cap)$$;
create function hys242_private.nombres_informe(p jsonb) returns text[] language sql immutable set search_path='' as $$
 select array_agg(distinct name order by name) from(select nullif(btrim(p->>'area'),'') name union all select nullif(btrim(v->>1),'') from jsonb_array_elements(coalesce(p#>'{data,activities}','[]'))v union all select nullif(btrim(v->>0),'') from jsonb_array_elements(coalesce(p#>'{data,inspections}','[]'))v)x where name is not null
$$;
create function hys242_private.ids_propuestos(old public.informes_v242,m text,p jsonb) returns uuid[] language sql stable security definer set search_path='' as $$
 select case when old.modulo=m and old.areas_ids is not null and hys242_private.nombres_informe(old.payload) is not distinct from hys242_private.nombres_informe(p) then old.areas_ids else hys242_private.areas_informe(m,p) end
$$;
create function hys242_private.ambito_fila(i public.informes_v242,cap text default null) returns boolean language sql stable security definer set search_path='' as $$select hys242_private.en_ids(i.modulo,coalesce(i.areas_ids,hys242_private.areas_informe(i.modulo,i.payload)),cap)$$;
create function hys242_private.supervisor_existente(m text,editar boolean default false,a uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select hys242_private.rol()='supervisor' and hys242_private.modulo(m,editar) and exists(select 1 from public.perfiles where usuario_id=auth.uid() and rol='supervisor')
 and (a is null or not exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) or exists(select 1 from public.cuentas_v242 c where c.usuario_id=auth.uid() and c.ambitos->m->'areas'?a::text))
$$;
create function hys242_private.leer_informe(id text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.informes_v242 i where i.id=$1 and hys242_private.activo() and (hys242_private.general_unico() or (i.creador_id=auth.uid() and hys242_private.modulo(i.modulo) and (not exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) and not exists(select 1 from public.facultades_v242 where usuario_id=auth.uid() and modulo=i.modulo) or hys242_private.ambito_fila(i))) or hys242_private.ambito_fila(i,'view') or (hys242_private.supervisor_existente(i.modulo) and (not exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) or hys242_private.ambito_fila(i)))))
$$;
create policy cuentas_lectura_v242 on public.cuentas_v242 for select to authenticated using(usuario_id=auth.uid() or hys242_private.general_unico());
create policy eventos_lectura_v242 on public.eventos_v242 for select to authenticated using(hys242_private.general_unico() or (modulo is not null and hys242_private.facultad(modulo,'audit') and (entidad=any(select a::text from public.facultades_v242 f,unnest(f.areas_ids) a where f.usuario_id=auth.uid() and f.modulo=eventos_v242.modulo))));
create policy revision_lectura_v242 on public.revision_informes_v242 for select to authenticated using(hys242_private.leer_informe(informe_id));
-- Los snapshots incluyen evidencias. Se consultan solo por RPC con permiso de PDF.
create policy historial_lectura_v242 on public.historial_revision_v242 for select to authenticated using(hys242_private.general_unico());
drop policy reports_read_v242 on public.informes_v242;
-- Payload y PDF se separan: tabla completa solo General. Resúmenes/payload por RPC.
create policy reports_read_v242 on public.informes_v242 for select to authenticated using(hys242_private.general_unico());
create function public.hys242_contexto() returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.perfiles; c public.cuentas_v242; modules jsonb;begin
 select * into p from public.perfiles where usuario_id=auth.uid();if not found or not hys242_private.activo() or (p.rol='administrador_global' and not hys242_private.general_unico()) then raise exception 'Perfil inactivo o inexistente' using errcode='42501';end if;
 select * into c from public.cuentas_v242 where usuario_id=auth.uid();
 select coalesce(jsonb_agg(jsonb_build_object('modulo',m,'puede_ver',hys242_private.modulo(m) or hys242_private.facultad(m,'view') or hys242_private.facultad(m,'areas') or hys242_private.facultad(m,'users') or hys242_private.facultad(m,'activation') or hys242_private.facultad(m,'audit'),'puede_editar',hys242_private.modulo(m,true) or hys242_private.facultad(m,'editOthers'),'puede_editar_ajenos',hys242_private.facultad(m,'editOthers') or hys242_private.supervisor_existente(m,true),'puede_descargar_ajenos',hys242_private.facultad(m,'pdf') or hys242_private.supervisor_existente(m),'areas',jsonb_build_object('activa',true))),'[]') into modules from unnest(array['APR','OTROS'])m;
 return jsonb_build_object('profile',jsonb_build_object('usuario_id',p.usuario_id,'nombre',coalesce(c.nombre,p.nombre),'rol',hys242_private.rol(),'activo',true),'permissions',modules,'facultades',case when hys242_private.rol()='administrador_area' then coalesce((select jsonb_agg(to_jsonb(f)) from public.facultades_v242 f where f.usuario_id=p.usuario_id),'[]') else '[]'::jsonb end);
end$$;
create function public.hys242_consultar_informes(p_modulo text,p_pagina int default 0,p_filtros jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$begin
 if p_modulo not in ('APR','OTROS') or p_pagina<0 then raise exception 'Consulta inválida';end if;
 return coalesce((select jsonb_agg(x) from(select i.id,i.modulo,i.creador_id,i.revision,i.actualizado_en,i.payload->>'owner' owner,i.payload->>'date' date,i.payload->>'dateFrom' "dateFrom",i.payload->>'dateTo' "dateTo",i.payload->>'shift' shift,i.payload->>'project' project,i.payload->>'area' area,i.payload->>'status' status,(i.archivo is not null) "hasPdf",rv.estado revision_estado,rv.revision revision_flujo from public.informes_v242 i left join public.revision_informes_v242 rv on rv.informe_id=i.id where i.modulo=p_modulo and (coalesce(p_filtros->>'desde','')='' or coalesce(i.payload->>'date',i.payload->>'dateFrom','')>=p_filtros->>'desde') and (coalesce(p_filtros->>'hasta','')='' or coalesce(i.payload->>'date',i.payload->>'dateTo','')<=p_filtros->>'hasta') and (coalesce(p_filtros->>'proyecto','')='' or i.payload->>'project'=p_filtros->>'proyecto') and (coalesce(p_filtros->>'turno','')='' or i.payload->>'shift'=p_filtros->>'turno') and (coalesce(p_filtros->>'area','')='' or i.payload->>'area'=p_filtros->>'area') and (coalesce(p_filtros->>'responsable','')='' or i.payload->>'owner'=p_filtros->>'responsable') and (coalesce(p_filtros->>'usuario','')='' or i.creador_id::text=p_filtros->>'usuario') and (coalesce(p_filtros->>'estado','')='' or i.payload->>'status'=p_filtros->>'estado') and (coalesce(p_filtros->>'prioridad','')='' or exists(select 1 from jsonb_array_elements(i.payload#>'{data,findings}') x where x->>1=p_filtros->>'prioridad')) and (i.archivo is not null or i.payload->>'status'='Finalizado') and hys242_private.leer_informe(i.id) order by i.actualizado_en desc,i.id offset p_pagina*20 limit 20)x),'[]');
end$$;
create function public.hys242_cargar_informe(p_id text,p_pdf boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$declare i public.informes_v242;begin
 if not hys242_private.leer_informe(p_id) then raise exception 'Informe fuera del ámbito' using errcode='42501';end if;select * into strict i from public.informes_v242 where id=p_id;
 if p_pdf and not (hys242_private.general_unico() or i.creador_id=auth.uid() or hys242_private.ambito_fila(i,'pdf') or (hys242_private.supervisor_existente(i.modulo) and (not exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) or hys242_private.ambito_fila(i)))) then raise exception 'Descarga no autorizada' using errcode='42501';end if;
 return to_jsonb(i)||jsonb_build_object('archivo',case when p_pdf then i.archivo else null end,'revision_estado',(select estado from public.revision_informes_v242 where informe_id=i.id),'revision_flujo',(select revision from public.revision_informes_v242 where informe_id=i.id));
end$$;
-- Defensa de escritura: también se ejecuta si se intenta el RPC heredado directamente.
create function hys242_private.proteger_informe() returns trigger language plpgsql security definer set search_path='' as $$declare s public.revision_informes_v242;reason text:=nullif(current_setting('hys242.motivo',true),'');begin
 if not hys242_private.activo() then raise exception 'Perfil inactivo' using errcode='42501';end if;
 new.areas_ids:=case when tg_op='UPDATE' then hys242_private.ids_propuestos(old,new.modulo,new.payload) else hys242_private.areas_informe(new.modulo,new.payload) end;
 if tg_op='UPDATE' then
  select * into s from public.revision_informes_v242 where informe_id=old.id;
  if s.estado in ('Enviado','Aprobado','Cerrado') and ((new.payload-array['history','version']) is distinct from (old.payload-array['history','version']) or new.archivo is distinct from old.archivo) then raise exception 'Informe en revisión o cerrado: requiere devolución/reapertura';end if;
  if old.creador_id<>auth.uid() and not hys242_private.general_unico() then
   if not (hys242_private.ambito_fila(old,'editOthers') or hys242_private.supervisor_existente(old.modulo,true) and hys242_private.ambito_fila(old)) or not (hys242_private.en_ids(new.modulo,new.areas_ids,'editOthers') or hys242_private.supervisor_existente(new.modulo,true) and hys242_private.en_ids(new.modulo,new.areas_ids)) or reason is null then raise exception 'Edición ajena no autorizada o sin motivo' using errcode='42501';end if;
  end if;
 end if;
 if new.creador_id=auth.uid() and not hys242_private.general_unico() and (not hys242_private.modulo(new.modulo,true) or ((exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) or exists(select 1 from public.facultades_v242 where usuario_id=auth.uid() and modulo=new.modulo)) and not hys242_private.en_ids(new.modulo,new.areas_ids))) then raise exception 'Creación o edición fuera del ámbito' using errcode='42501';end if;
 if tg_op='UPDATE' then insert into public.historial_revision_v242(informe_id,actor_id,accion,motivo,version_informe,payload,archivo,areas_ids) values(old.id,auth.uid(),'edicion',coalesce(reason,'Edición de informe'),old.revision,old.payload,old.archivo,old.areas_ids);insert into public.eventos_v242(actor_id,actor_nombre,accion,modulo,entidad,motivo,anterior,nuevo) select auth.uid(),nombre,'editar informe',new.modulo,new.id,coalesce(reason,case when old.creador_id=auth.uid() then 'Edición propia' else 'Edición del Administrador general' end),to_jsonb(old)-'archivo',to_jsonb(new)-'archivo' from public.perfiles where usuario_id=auth.uid();end if;
 return new;end$$;
create trigger proteger_informe_v242 before insert or update on public.informes_v242 for each row execute function hys242_private.proteger_informe();
create function public.hys242_guardar_con_motivo(p_id text,p_modulo text,p_payload jsonb,p_archivo jsonb,p_revision int,p_token uuid,p_motivo text default '') returns public.informes_v242 language plpgsql security definer set search_path='' as $$declare old public.informes_v242;result public.informes_v242;begin
 if not hys242_private.activo() then raise exception 'Perfil inactivo' using errcode='42501';end if;
 select * into old from public.informes_v242 where id=p_id for update;
 if old.id is not null and old.creador_id<>auth.uid() and not hys242_private.general_unico() then
  if not (hys242_private.ambito_fila(old,'editOthers') or hys242_private.supervisor_existente(old.modulo,true) and hys242_private.ambito_fila(old)) or not (hys242_private.en_ids(p_modulo,hys242_private.ids_propuestos(old,p_modulo,p_payload),'editOthers') or hys242_private.supervisor_existente(p_modulo,true) and hys242_private.en_ids(p_modulo,hys242_private.ids_propuestos(old,p_modulo,p_payload))) or nullif(btrim(p_motivo),'') is null then raise exception 'Edición ajena no autorizada' using errcode='42501';end if;
 end if;
 perform set_config('hys242.motivo',btrim(p_motivo),true);result:=public.hys242_guardar_informe(p_id,p_modulo,p_payload,p_archivo,p_revision,p_token);
 if result.creador_id<>auth.uid() and not hys242_private.general_unico() and not hys242_private.ambito_fila(result,'pdf') then result.archivo:=null;end if;return result;
end$$;
revoke all on function public.hys242_guardar_informe(text,text,jsonb,jsonb,int,uuid) from public,anon,authenticated;
create function public.hys242_revisar(p_id text,p_accion text,p_revision int,p_motivo text) returns public.revision_informes_v242 language plpgsql security definer set search_path='' as $$
declare i public.informes_v242;s public.revision_informes_v242;result public.revision_informes_v242;cap text;next text;begin
 select * into i from public.informes_v242 where id=p_id for update;if not found or not hys242_private.leer_informe(p_id) then raise exception 'Informe no disponible' using errcode='42501';end if;
 if p_accion in ('enviar','corregir') and (not hys242_private.modulo(i.modulo,true) or ((exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) or exists(select 1 from public.facultades_v242 where usuario_id=auth.uid() and modulo=i.modulo)) and not hys242_private.ambito_fila(i))) then raise exception 'Acceso de solo lectura o fuera de ámbito: no puedes enviar ni corregir' using errcode='42501';end if;
 select * into s from public.revision_informes_v242 where informe_id=p_id for update;
 if coalesce(s.revision,0)<>p_revision then raise exception 'Conflicto de revisión' using errcode='40001';end if;
 if s.informe_id is null then
  if p_accion<>'enviar' or i.creador_id<>auth.uid() or i.payload->>'status'<>'Finalizado' then raise exception 'El flujo solo comienza al enviar un informe propio finalizado';end if;next:='Enviado';
 elsif p_accion='enviar' and s.estado in ('Borrador','Corregido','Reabierto') and i.creador_id=auth.uid() then next:='Enviado';
 elsif p_accion='corregir' and s.estado='Devuelto' and i.creador_id=auth.uid() then next:='Corregido';
 elsif p_accion='devolver' and s.estado in ('Enviado','Aprobado') then cap:='review';next:='Devuelto';
 elsif p_accion='aprobar' and s.estado='Enviado' and s.version_informe=i.revision then cap:='approve';next:='Aprobado';
 elsif p_accion='cerrar' and s.estado='Aprobado' and s.version_informe=i.revision then cap:='close';next:='Cerrado';
 elsif p_accion='reabrir' and s.estado='Cerrado' and hys242_private.general_unico() then next:='Reabierto';
 else raise exception 'Transición no permitida';end if;
 if cap is not null and (i.creador_id=auth.uid() or not hys242_private.ambito_fila(i,cap)) then raise exception 'Revisión no autorizada o autoaprobación' using errcode='42501';end if;
 if next in ('Devuelto','Reabierto') and nullif(btrim(p_motivo),'') is null then raise exception 'Motivo obligatorio';end if;
 insert into public.revision_informes_v242 values(p_id,next,i.revision,1) on conflict(informe_id) do update set estado=excluded.estado,version_informe=excluded.version_informe,revision=revision_informes_v242.revision+1 returning * into result;
 insert into public.historial_revision_v242(informe_id,actor_id,accion,motivo,version_informe,payload,archivo,areas_ids) values(p_id,auth.uid(),p_accion,coalesce(p_motivo,''),i.revision,i.payload,i.archivo,i.areas_ids);return result;
end$$;
-- Lista permitida explícita: ninguna función nueva conserva EXECUTE por defecto.
revoke all on function hys242_private.en_ids(text,uuid[],text),hys242_private.nombres_informe(jsonb),hys242_private.ids_propuestos(public.informes_v242,text,jsonb),hys242_private.ambito_fila(public.informes_v242,text),hys242_private.supervisor_existente(text,boolean,uuid),hys242_private.activo(),hys242_private.rol(),hys242_private.modulo(text,boolean),hys242_private.areas_informe(text,jsonb),hys242_private.ambito_informe(text,jsonb,text),hys242_private.leer_informe(text),hys242_private.proteger_informe() from public,anon,authenticated;
grant execute on function hys242_private.activo(),hys242_private.leer_informe(text) to authenticated;
revoke all on function public.hys242_contexto(),public.hys242_consultar_informes(text,int,jsonb),public.hys242_cargar_informe(text,boolean),public.hys242_guardar_con_motivo(text,text,jsonb,jsonb,int,uuid,text),public.hys242_revisar(text,text,int,text) from public,anon;
grant execute on function public.hys242_contexto(),public.hys242_consultar_informes(text,int,jsonb),public.hys242_cargar_informe(text,boolean),public.hys242_guardar_con_motivo(text,text,jsonb,jsonb,int,uuid,text),public.hys242_revisar(text,text,int,text) to authenticated;
create function public.hys242_recuperar_borrador(p_modulo text) returns jsonb language sql stable security definer set search_path='' as $$ select to_jsonb(i) from public.informes_v242 i where i.creador_id=auth.uid() and i.modulo=p_modulo and i.payload->>'status'='En edición' and i.archivo is null and hys242_private.leer_informe(i.id) order by i.actualizado_en desc,i.id limit 1 $$;
revoke all on function public.hys242_recuperar_borrador(text) from public,anon;
grant execute on function public.hys242_recuperar_borrador(text) to authenticated;


-- alcances-operativos-v242.sql

create or replace function hys242_private.allowed(m text,purpose text default 'read') returns boolean language sql stable security definer set search_path='' as $$
 select hys242_private.activo() and case
 when purpose='global' then hys242_private.general_unico()
 when purpose='read' then hys242_private.modulo(m) or hys242_private.facultad(m,'view') or hys242_private.facultad(m,'areas') or hys242_private.facultad(m,'audit') or hys242_private.facultad(m,'users') or hys242_private.facultad(m,'activation')
 when purpose='write' then hys242_private.modulo(m,true) or hys242_private.facultad(m,'editOthers')
 when purpose='manage' then hys242_private.general_unico() or (hys242_private.supervisor_existente(m,true)) or hys242_private.facultad(m,'areas') or hys242_private.facultad(m,'editOthers')
 when purpose='audit' then hys242_private.general_unico() or (hys242_private.supervisor_existente(m)) or hys242_private.facultad(m,'audit')
 else false end
$$;
drop policy areas_insert_v242 on public.areas_trabajo_v242;
drop policy areas_update_v242 on public.areas_trabajo_v242;
drop policy audit_read_v242 on public.auditoria_areas_v242;
create policy areas_insert_v242 on public.areas_trabajo_v242 for insert to authenticated with check(hys242_private.general_unico() or hys242_private.facultad(modulo,'areas') or (hys242_private.supervisor_existente(modulo,true)));
create policy areas_update_v242 on public.areas_trabajo_v242 for update to authenticated using(hys242_private.general_unico() or hys242_private.facultad(modulo,'areas',id) or (hys242_private.supervisor_existente(modulo,true,id))) with check(hys242_private.general_unico() or hys242_private.facultad(modulo,'areas',id) or (hys242_private.supervisor_existente(modulo,true,id)));
create policy audit_read_v242 on public.auditoria_areas_v242 for select to authenticated using(hys242_private.general_unico() or hys242_private.facultad(modulo,'audit',area_id) or (hys242_private.supervisor_existente(modulo,false,area_id)));
create function hys242_private.area_creada() returns trigger language plpgsql security definer set search_path='' as $$declare before public.facultades_v242;after public.facultades_v242;p public.perfiles;c public.cuentas_v242;updated public.cuentas_v242;begin
 if hys242_private.rol()='administrador_area' and not hys242_private.general_unico() then
  select * into p from public.perfiles where usuario_id=auth.uid();p.rol:=hys242_private.rol();
  select * into before from public.facultades_v242 where usuario_id=auth.uid() and modulo=new.modulo for update;
  if before.facultades->'areas'<>'true'::jsonb then raise exception 'Sin permiso para crear áreas' using errcode='42501';end if;
  update public.facultades_v242 set areas_ids=array_append(areas_ids,new.id),revision=revision+1,actualizado_en=clock_timestamp() where usuario_id=auth.uid() and modulo=new.modulo returning * into after;
  insert into public.auditoria_facultades_v242(actor_id,actor_nombre,actor_rol,usuario_id,modulo,motivo,anterior,nuevo) values(p.usuario_id,p.nombre,p.rol,p.usuario_id,new.modulo,'Área nueva creada bajo facultad delegada',to_jsonb(before),to_jsonb(after));
 elsif hys242_private.supervisor_existente(new.modulo,true) and exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) then
  select * into c from public.cuentas_v242 where usuario_id=auth.uid() for update;
  update public.cuentas_v242 set ambitos=jsonb_set(ambitos,array[new.modulo,'areas'],coalesce(ambitos->new.modulo->'areas','[]')||jsonb_build_array(new.id),true),revision=revision+1 where usuario_id=auth.uid() returning * into updated;
  insert into public.eventos_v242(actor_id,actor_nombre,accion,modulo,entidad,motivo,anterior,nuevo) values(auth.uid(),c.nombre,'Área nueva incorporada al ámbito',new.modulo,new.id::text,'Creación autorizada de área',to_jsonb(c),to_jsonb(updated));
 end if;return new;end$$;
create trigger area_creada_v242 after insert on public.areas_trabajo_v242 for each row execute function hys242_private.area_creada();
-- APIs devuelven todas las áreas de un informe antes de aprobar cualquier acción.
create function public.hys242_permisos_efectivos() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('contexto',public.hys242_contexto(),'facultades',coalesce((select jsonb_agg(to_jsonb(f)) from public.facultades_v242 f where f.usuario_id=auth.uid()),'[]'))
$$;
revoke all on function hys242_private.area_creada() from public,anon,authenticated;
grant execute on function hys242_private.supervisor_existente(text,boolean,uuid),hys242_private.modulo(text,boolean),hys242_private.rol() to authenticated;
revoke all on function public.hys242_permisos_efectivos() from public,anon;
grant execute on function public.hys242_permisos_efectivos() to authenticated;


-- usuarios-operativos-v242.sql

create function hys242_private.ambitos_usuario(uid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 select ambitos into result from public.cuentas_v242 where usuario_id=uid;if found then return result;end if;
 select coalesce(jsonb_object_agg(m,jsonb_build_object('ver',true,'editar',editar,'areas',ids)),'{}') into result from (
 select u.modulo m,bool_or(u.puede_editar) editar,(select coalesce(jsonb_agg(a.id),'[]') from public.areas_trabajo_v242 a where a.modulo=u.modulo) ids
 from public.permisos_usuario u join public.areas x on x.id=u.area_id where u.usuario_id=uid and u.puede_ver and x.activa group by u.modulo)t;return result;
end$$;
create function hys242_private.validar_cuenta(uid uuid,data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare p public.perfiles;c public.cuentas_v242;v record;area_value jsonb;old jsonb;activation boolean;role text;begin
 if not hys242_private.activo() then raise exception 'Perfil inactivo' using errcode='42501';end if;
 if uid=auth.uid() then raise exception 'No puedes cambiar tu propia cuenta' using errcode='42501';end if;
 if data->>'rol' not in ('administrador_area','supervisor','usuario') or nullif(btrim(data->>'nombre'),'') is null or length(data->>'nombre')>150 or jsonb_typeof(data->'activo') is distinct from 'boolean' or jsonb_typeof(data->'ambitos') is distinct from 'object' then raise exception 'Datos inválidos';end if;
 if data->'ambitos'='{}'::jsonb then raise exception 'Selecciona al menos un ámbito';end if;
 select * into p from public.perfiles where usuario_id=uid;select * into c from public.cuentas_v242 where usuario_id=uid;
 role:=coalesce(c.rol,p.rol);if p.activo=false and (data->>'activo')::boolean=true then raise exception 'Perfil compartido inactivo: requiere revisión específica; v242 no modifica su estado';end if;
 if p.rol='administrador_global' then raise exception 'Administrador general protegido' using errcode='42501';end if;
 if not hys242_private.general_unico() then
  if hys242_private.rol()<>'administrador_area' or role='administrador_area' or data->>'rol'='administrador_area' then raise exception 'Solo cuentas de menor nivel' using errcode='42501';end if;
  old:=jsonb_build_object('nombre',coalesce(c.nombre,p.nombre),'rol',role,'ambitos',hys242_private.ambitos_usuario(uid));
  activation:=uid is not null and coalesce(c.activo,p.activo) is distinct from (data->>'activo')::boolean;
  if activation and (old->>'nombre' is distinct from data->>'nombre' or old->>'rol' is distinct from data->>'rol' or old->'ambitos' is distinct from data->'ambitos') then raise exception 'Cambia el estado por separado';end if;
  if uid is not null then
   for v in select key,value from jsonb_each(old->'ambitos') loop
    if not hys242_private.facultad(v.key,case when activation then 'activation' else 'users' end) then raise exception 'Cuenta con módulos ajenos' using errcode='42501';end if;
    for area_value in select value from jsonb_array_elements(v.value->'areas') loop if not hys242_private.facultad(v.key,case when activation then 'activation' else 'users' end,(area_value#>>'{}')::uuid) then raise exception 'Cuenta con áreas ajenas' using errcode='42501';end if;end loop;
   end loop;
  end if;
 end if;
 for v in select key,value from jsonb_each(data->'ambitos') loop
  if v.key not in ('APR','OTROS') or jsonb_typeof(v.value->'areas') is distinct from 'array' or jsonb_array_length(v.value->'areas')=0 or jsonb_typeof(v.value->'ver') is distinct from 'boolean' or jsonb_typeof(v.value->'editar') is distinct from 'boolean' or v.value->'ver'<>'true'::jsonb then raise exception 'Ámbito inválido';end if;
  if not hys242_private.general_unico() and not activation and v.value->'editar'='true'::jsonb and not hys242_private.modulo(v.key,true) then raise exception 'No puedes conceder edición superior a la tuya' using errcode='42501';end if;
  if not hys242_private.general_unico() and not hys242_private.facultad(v.key,case when activation then 'activation' else 'users' end) then raise exception 'Asignación fuera de tu módulo' using errcode='42501';end if;
  for area_value in select value from jsonb_array_elements(v.value->'areas') loop
   if not exists(select 1 from public.areas_trabajo_v242 a where a.id=(area_value#>>'{}')::uuid and a.modulo=v.key) or (not hys242_private.general_unico() and not hys242_private.facultad(v.key,case when activation then 'activation' else 'users' end,(area_value#>>'{}')::uuid)) then raise exception 'Área ajena' using errcode='42501';end if;
  end loop;
 end loop;
end$$;
create function public.hys242_guardar_usuario(p_usuario uuid,p_datos jsonb,p_revision int,p_motivo text) returns public.cuentas_v242 language plpgsql security definer set search_path='' as $$declare old public.cuentas_v242;result public.cuentas_v242;p public.perfiles;f public.facultades_v242;updated public.facultades_v242;begin
 perform hys242_private.validar_cuenta(p_usuario,p_datos);if nullif(btrim(p_motivo),'') is null then raise exception 'Motivo obligatorio';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text,242));select * into old from public.cuentas_v242 where usuario_id=p_usuario for update;
 if coalesce(old.revision,0)<>p_revision then raise exception 'Conflicto de cuenta' using errcode='40001';end if;
 insert into public.cuentas_v242(usuario_id,nombre,rol,activo,ambitos) values(p_usuario,btrim(p_datos->>'nombre'),p_datos->>'rol',(p_datos->>'activo')::boolean,p_datos->'ambitos') on conflict(usuario_id) do update set nombre=excluded.nombre,rol=excluded.rol,activo=excluded.activo,ambitos=excluded.ambitos,revision=cuentas_v242.revision+1 returning * into result;
 select * into p from public.perfiles where usuario_id=auth.uid();
 if p_datos->>'rol'<>'administrador_area' then
 for f in select * from public.facultades_v242 where usuario_id=p_usuario and (areas_ids<>'{}' or facultades<>'{}') for update loop
 update public.facultades_v242 set areas_ids='{}',facultades='{}',revision=revision+1,actualizado_en=clock_timestamp(),actor_id=auth.uid() where usuario_id=f.usuario_id and modulo=f.modulo returning * into updated;
 insert into public.auditoria_facultades_v242(actor_id,actor_nombre,actor_rol,usuario_id,modulo,motivo,anterior,nuevo) values(p.usuario_id,p.nombre,p.rol,p_usuario,f.modulo,'Retiro por cambio a rol sin facultades administrativas: '||p_motivo,to_jsonb(f),to_jsonb(updated));
 end loop;end if;
 insert into public.eventos_v242(actor_id,actor_nombre,accion,entidad,motivo,anterior,nuevo) values(p.usuario_id,p.nombre,'gestión de usuario v242',p_usuario::text,p_motivo,to_jsonb(old),to_jsonb(result));return result;
end$$;
create function public.hys242_listar_usuarios() returns jsonb language plpgsql security definer set search_path='' as $$declare p record;item jsonb;result jsonb:='[]';begin
 if not hys242_private.activo() or (not hys242_private.general_unico() and not(hys242_private.facultad('APR','users') or hys242_private.facultad('OTROS','users') or hys242_private.facultad('APR','activation') or hys242_private.facultad('OTROS','activation'))) then raise exception 'Gestión no autorizada' using errcode='42501';end if;
 for p in select u.usuario_id,coalesce(c.nombre,u.nombre) nombre,coalesce(c.rol,u.rol) rol,u.activo and coalesce(c.activo,true) activo,coalesce(c.revision,0) revision from public.perfiles u left join public.cuentas_v242 c using(usuario_id) order by nombre,u.usuario_id loop
  if hys242_private.general_unico() then null;else
   if p.rol not in ('usuario','supervisor') or p.usuario_id=auth.uid() then continue;end if;
   begin perform hys242_private.validar_cuenta(p.usuario_id,jsonb_build_object('nombre',p.nombre,'rol',p.rol,'activo',p.activo,'ambitos',hys242_private.ambitos_usuario(p.usuario_id)));exception when others then begin perform hys242_private.validar_cuenta(p.usuario_id,jsonb_build_object('nombre',p.nombre,'rol',p.rol,'activo',not p.activo,'ambitos',hys242_private.ambitos_usuario(p.usuario_id)));exception when others then continue;end;end;
  end if;
  item:=to_jsonb(p)||jsonb_build_object('ambitos',hys242_private.ambitos_usuario(p.usuario_id));result:=result||jsonb_build_array(item);
 end loop;return result;
end$$;
-- Invitaciones: operación persistente, sin contraseña temporal ni borrado compensatorio.
create table public.invitaciones_v242(id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.perfiles(usuario_id),solicitud uuid not null,email text not null,datos jsonb not null,auth_usuario uuid,estado text not null default 'preparada' check(estado in ('preparada','en_envio','fallida','incierta','auth_creada','completa','cancelada')),revision int not null default 1,detalle text not null default '',creado_en timestamptz not null default now(),actualizado_en timestamptz not null default now(),unique(actor_id,solicitud));
alter table public.invitaciones_v242 enable row level security;revoke all on public.invitaciones_v242 from public,anon,authenticated;grant select on public.invitaciones_v242 to service_role;
create function public.hys242_preparar_invitacion(p_email text,p_datos jsonb,p_solicitud uuid) returns uuid language plpgsql security definer set search_path='' as $$declare id uuid;old public.invitaciones_v242;begin
 perform hys242_private.validar_cuenta(null,p_datos);if nullif(btrim(p_datos->>'motivo'),'') is null then raise exception 'Motivo obligatorio para invitar';end if;if p_email is null or length(p_email)>254 or p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_solicitud is null then raise exception 'Solicitud inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||lower(btrim(p_email)),242));
 select * into old from public.invitaciones_v242 where actor_id=auth.uid() and solicitud=p_solicitud;if found then if old.estado='cancelada' then raise exception 'Solicitud cancelada; inicia una nueva';end if;if old.email<>lower(btrim(p_email)) or old.datos<>p_datos then raise exception 'La solicitud ya tiene otros datos; usa Administrar invitaciones';end if;return old.id;end if;
 select * into old from public.invitaciones_v242 where actor_id=auth.uid() and email=lower(btrim(p_email)) and datos=p_datos and estado<>'cancelada' order by creado_en desc limit 1;if found then return old.id;end if;
 if exists(select 1 from public.invitaciones_v242 where actor_id=auth.uid() and email=lower(btrim(p_email)) and estado not in ('completa','cancelada')) then raise exception 'Existe una invitación pendiente con otros datos; conserva su solicitud para conciliación';end if;
 insert into public.invitaciones_v242(actor_id,solicitud,email,datos) values(auth.uid(),p_solicitud,lower(btrim(p_email)),p_datos) on conflict(actor_id,solicitud) do nothing returning invitaciones_v242.id into id;
 if id is null then select * into old from public.invitaciones_v242 where actor_id=auth.uid() and solicitud=p_solicitud;if old.email<>lower(btrim(p_email)) or old.datos<>p_datos then raise exception 'La solicitud ya tiene otros datos';end if;id:=old.id;end if;return id;
end$$;
create function public.hys242_completar_invitacion(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$declare job public.invitaciones_v242;begin
 if not hys242_private.activo() then raise exception 'Perfil inactivo' using errcode='42501';end if;
 select * into job from public.invitaciones_v242 where id=p_id and actor_id=auth.uid() for update;if not found or job.auth_usuario is null or job.estado not in ('auth_creada','incierta','completa') then raise exception 'Invitación no preparada';end if;
 if job.estado='completa' then return job.auth_usuario;end if;perform hys242_private.validar_cuenta(null,job.datos);
 if exists(select 1 from public.perfiles where usuario_id=job.auth_usuario and rol<>'usuario') or exists(select 1 from public.cuentas_v242 where usuario_id=job.auth_usuario) then raise exception 'Cuenta existente protegida';end if;
 insert into public.perfiles(usuario_id,nombre,rol,activo) values(job.auth_usuario,job.datos->>'nombre','usuario',true) on conflict(usuario_id) do nothing;
 perform public.hys242_guardar_usuario(job.auth_usuario,job.datos,0,job.datos->>'motivo');update public.invitaciones_v242 set estado='completa',revision=revision+1,actualizado_en=clock_timestamp() where id=job.id;return job.auth_usuario;
end$$;
create or replace function public.hys242_listar_administradores() returns table(usuario_id uuid,nombre text,activo boolean) language plpgsql security definer set search_path='' as $$begin
 if not hys242_private.general_unico() then raise exception 'Solo Administrador general' using errcode='42501';end if;return query select p.usuario_id,coalesce(c.nombre,p.nombre),p.activo and coalesce(c.activo,true) from public.perfiles p left join public.cuentas_v242 c using(usuario_id) where coalesce(c.rol,p.rol)='administrador_area' order by coalesce(c.nombre,p.nombre),p.usuario_id;
end$$;
revoke all on function hys242_private.ambitos_usuario(uuid),hys242_private.validar_cuenta(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.hys242_guardar_usuario(uuid,jsonb,int,text),public.hys242_listar_usuarios(),public.hys242_preparar_invitacion(text,jsonb,uuid),public.hys242_completar_invitacion(uuid) from public,anon;
grant execute on function public.hys242_guardar_usuario(uuid,jsonb,int,text),public.hys242_listar_usuarios(),public.hys242_preparar_invitacion(text,jsonb,uuid),public.hys242_completar_invitacion(uuid) to authenticated;


-- consulta-operativa-v242.sql

create function public.hys242_crear_area(p_modulo text,p_nombre text) returns public.areas_trabajo_v242 language plpgsql security definer set search_path='' as $$declare result public.areas_trabajo_v242;begin
 if not hys242_private.activo() or not (hys242_private.general_unico() or hys242_private.facultad(p_modulo,'areas') or hys242_private.supervisor_existente(p_modulo,true)) then raise exception 'Creación de área no autorizada' using errcode='42501';end if;
 insert into public.areas_trabajo_v242(modulo,nombre) values(p_modulo,btrim(p_nombre)) returning * into result;return result;
end$$;
revoke insert on public.areas_trabajo_v242 from authenticated;
revoke all on function public.hys242_crear_area(text,text) from public,anon;
grant execute on function public.hys242_crear_area(text,text) to authenticated;
create function public.hys242_filtros_usuarios(p_modulo text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]') from (select distinct i.creador_id usuario_id,i.creador_nombre nombre from public.informes_v242 i where i.modulo=p_modulo and hys242_private.leer_informe(i.id) order by i.creador_nombre,i.creador_id)x
$$;
create function public.hys242_historial_informe(p_id text) returns jsonb language plpgsql security definer set search_path='' as $$declare i public.informes_v242;begin
 if not hys242_private.leer_informe(p_id) then raise exception 'Informe fuera del ámbito' using errcode='42501';end if;select * into i from public.informes_v242 where id=p_id;
 return coalesce((select jsonb_agg(x) from(select h.id evento_id,h.fecha,h.actor_id,p.nombre actor_nombre,h.accion,h.motivo,h.version_informe,(h.archivo is not null) pdf_disponible from public.historial_revision_v242 h join public.perfiles p on p.usuario_id=h.actor_id where h.informe_id=p_id and (hys242_private.general_unico() or hys242_private.en_ids(i.modulo,h.areas_ids) and (i.creador_id=auth.uid() or hys242_private.supervisor_existente(i.modulo) or hys242_private.en_ids(i.modulo,h.areas_ids,'view'))) order by h.fecha,h.id)x),'[]');end$$;
create function public.hys242_pdf_version(p_evento bigint) returns jsonb language plpgsql security definer set search_path='' as $$declare h public.historial_revision_v242;i public.informes_v242;begin
 select * into h from public.historial_revision_v242 where id=p_evento;if not found or not hys242_private.leer_informe(h.informe_id) then raise exception 'Versión no autorizada' using errcode='42501';end if;select * into i from public.informes_v242 where id=h.informe_id;
 if not (hys242_private.general_unico() or (i.creador_id=auth.uid() and hys242_private.en_ids(i.modulo,h.areas_ids)) or hys242_private.en_ids(i.modulo,h.areas_ids,'pdf') or (hys242_private.supervisor_existente(i.modulo) and hys242_private.en_ids(i.modulo,h.areas_ids))) then raise exception 'Descarga histórica no autorizada' using errcode='42501';end if;
 if h.archivo is null then raise exception 'Esta versión no tiene PDF';end if;return jsonb_build_object('pdf',h.archivo->'pdf','filename',coalesce(h.archivo#>>'{metadata,filename}',h.informe_id||'-version-'||h.version_informe||'.pdf'));
end$$;
revoke all on function public.hys242_pdf_version(bigint) from public,anon;
grant execute on function public.hys242_pdf_version(bigint) to authenticated;
drop policy areas_read_v242 on public.areas_trabajo_v242;
create policy areas_read_v242 on public.areas_trabajo_v242 for select to authenticated using(hys242_private.activo() and (hys242_private.general_unico() or (hys242_private.allowed(modulo,'read') and (activa or hys242_private.facultad(modulo,'areas',id) or hys242_private.facultad(modulo,'audit',id) or hys242_private.supervisor_existente(modulo,false,id)) and (
 case when hys242_private.rol()='administrador_area' and exists(select 1 from public.facultades_v242 f where f.usuario_id=auth.uid() and f.modulo=areas_trabajo_v242.modulo) then exists(select 1 from public.facultades_v242 f where f.usuario_id=auth.uid() and f.modulo=areas_trabajo_v242.modulo and areas_trabajo_v242.id=any(f.areas_ids))
 when exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid()) then exists(select 1 from public.cuentas_v242 c where c.usuario_id=auth.uid() and c.ambitos->areas_trabajo_v242.modulo->'areas'?areas_trabajo_v242.id::text)
 else true end))));
revoke all on function public.hys242_filtros_usuarios(text),public.hys242_historial_informe(text) from public,anon;
grant execute on function public.hys242_filtros_usuarios(text),public.hys242_historial_informe(text) to authenticated;


-- gestion-invitaciones-v242.sql
-- Objetos exclusivos v242. No ejecutar en remoto sin aprobar la etapa de instalación.

create function hys242_private.auditar_invitacion(old public.invitaciones_v242,new public.invitaciones_v242,motivo text) returns void language sql security definer set search_path='' as $$
 insert into public.eventos_v242(actor_id,actor_nombre,accion,entidad,motivo,anterior,nuevo)
 select p.usuario_id,coalesce(c.nombre,p.nombre),'invitación '||new.estado,new.id::text,motivo,to_jsonb(old),to_jsonb(new) from public.perfiles p left join public.cuentas_v242 c using(usuario_id) where p.usuario_id=coalesce(auth.uid(),new.actor_id)
$$;
revoke all on function hys242_private.auditar_invitacion(public.invitaciones_v242,public.invitaciones_v242,text) from public,anon,authenticated;
create function public.hys242_listar_invitaciones() returns jsonb language plpgsql security definer set search_path='' as $$declare j public.invitaciones_v242;result jsonb:='[]';begin
 if not hys242_private.activo() then raise exception 'Sin acceso' using errcode='42501';end if;
 for j in select * from public.invitaciones_v242 where hys242_private.general_unico() or actor_id=auth.uid() order by actualizado_en desc,id limit 100 loop
  if not hys242_private.general_unico() then begin perform hys242_private.validar_cuenta(null,j.datos);exception when others then continue;end;end if;
  result:=result||jsonb_build_array(jsonb_build_object('id',j.id,'email',j.email,'datos',j.datos,'estado',j.estado,'revision',j.revision,'auth_vinculada',j.auth_usuario is not null,'detalle',j.detalle,'actualizado_en',j.actualizado_en));
 end loop;return result;end$$;
create function public.hys242_revisar_invitacion(p_id uuid,p_revision int,p_accion text,p_datos jsonb,p_motivo text) returns public.invitaciones_v242 language plpgsql security definer set search_path='' as $$declare old public.invitaciones_v242;result public.invitaciones_v242;begin
 if not hys242_private.activo() then raise exception 'Sin acceso' using errcode='42501';end if;
 select * into old from public.invitaciones_v242 where id=p_id for update;
 if not found or (not hys242_private.general_unico() and old.actor_id<>auth.uid()) then raise exception 'Solicitud ajena' using errcode='42501';end if;
 perform hys242_private.validar_cuenta(null,old.datos);
 if p_revision is null or old.revision<>p_revision then raise exception 'La solicitud cambió; vuelve a consultar' using errcode='40001';end if;
 if old.estado not in ('preparada','fallida') or old.auth_usuario is not null then raise exception 'Envío iniciado o cuenta vinculada: requiere conciliación; no se modifica ni reenvía automáticamente' using errcode='42501';end if;
 if nullif(btrim(p_motivo),'') is null or length(p_motivo)>500 then raise exception 'Motivo obligatorio';end if;
 if p_accion='corregir' then
  perform hys242_private.validar_cuenta(null,p_datos);if nullif(btrim(p_datos->>'motivo'),'') is null then raise exception 'Motivo de invitación obligatorio';end if;
  update public.invitaciones_v242 set datos=p_datos,estado='preparada',revision=revision+1,detalle='',actualizado_en=clock_timestamp() where id=p_id returning * into result;
 elsif p_accion='cancelar' then update public.invitaciones_v242 set estado='cancelada',revision=revision+1,actualizado_en=clock_timestamp() where id=p_id returning * into result;
 else raise exception 'Acción inválida';end if;
 perform hys242_private.auditar_invitacion(old,result,p_motivo);return result;
end$$;
create function public.hys242_reservar_invitacion(p_id uuid,p_revision int) returns public.invitaciones_v242 language plpgsql security definer set search_path='' as $$declare old public.invitaciones_v242;result public.invitaciones_v242;begin
 select * into old from public.invitaciones_v242 where id=p_id for update;
 if not found or p_revision is null or old.revision<>p_revision or old.estado not in ('preparada','fallida') or old.auth_usuario is not null then raise exception 'Solicitud ya reservada, cancelada o modificada' using errcode='40001';end if;
 update public.invitaciones_v242 set estado='en_envio',revision=revision+1,detalle='',actualizado_en=clock_timestamp() where id=p_id returning * into result;
 perform hys242_private.auditar_invitacion(old,result,'Reserva exclusiva de envío');return result;
end$$;
create function public.hys242_resultado_invitacion(p_id uuid,p_revision int,p_estado text,p_auth_usuario uuid,p_detalle text) returns public.invitaciones_v242 language plpgsql security definer set search_path='' as $$declare old public.invitaciones_v242;result public.invitaciones_v242;begin
 select * into old from public.invitaciones_v242 where id=p_id for update;
 if not found or p_revision is null or p_estado is null or old.revision<>p_revision or old.estado<>'en_envio' or p_estado not in ('fallida','incierta','auth_creada') or (p_estado='auth_creada' and p_auth_usuario is null) or (p_estado='fallida' and p_auth_usuario is not null) then raise exception 'Transición de envío inválida o antigua' using errcode='40001';end if;
 update public.invitaciones_v242 set estado=p_estado,auth_usuario=p_auth_usuario,detalle=left(coalesce(p_detalle,''),300),revision=revision+1,actualizado_en=clock_timestamp() where id=p_id returning * into result;
 perform hys242_private.auditar_invitacion(old,result,'Resultado de envío registrado por servidor');return result;
end$$;
revoke all on function public.hys242_listar_invitaciones(),public.hys242_revisar_invitacion(uuid,int,text,jsonb,text),public.hys242_reservar_invitacion(uuid,int),public.hys242_resultado_invitacion(uuid,int,text,uuid,text) from public,anon,authenticated;
grant execute on function public.hys242_listar_invitaciones(),public.hys242_revisar_invitacion(uuid,int,text,jsonb,text) to authenticated;
grant execute on function public.hys242_reservar_invitacion(uuid,int),public.hys242_resultado_invitacion(uuid,int,text,uuid,text) to service_role;

commit;
