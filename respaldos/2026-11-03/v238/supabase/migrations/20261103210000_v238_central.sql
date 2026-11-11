-- v238: objetos nuevos e independientes. No altera perfiles, permisos_usuario ni areas.
begin;
create schema hys238_private;
revoke all on schema hys238_private from public,anon,authenticated;
grant usage on schema hys238_private to authenticated;
create function hys238_private.allowed(m text, purpose text default 'read') returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles p where p.usuario_id=auth.uid() and p.activo
 and (p.rol='administrador_global' or (purpose<>'global' and exists(
 select 1 from public.permisos_usuario u join public.areas a on a.id=u.area_id
 where u.usuario_id=p.usuario_id and u.modulo=m and a.activa and u.puede_ver
 and (purpose='read' or (purpose='write' and u.puede_editar) or (purpose='manage' and p.rol in ('administrador_area','supervisor')))))))
$$;
revoke all on function hys238_private.allowed(text,text) from public,anon;
grant execute on function hys238_private.allowed(text,text) to authenticated;
create table public.areas_trabajo_v238(
 id uuid primary key default gen_random_uuid(), modulo text not null check(modulo in ('APR','OTROS')),
 nombre text not null check(length(btrim(nombre)) between 1 and 150), activa boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now());
create unique index areas_trabajo_v238_unique on public.areas_trabajo_v238(modulo,lower(regexp_replace(btrim(nombre),'\s+',' ','g')));
create table public.auditoria_areas_v238(
 id bigint generated always as identity primary key, fecha timestamptz not null default now(),
 usuario_id uuid, usuario_nombre text not null, rol text not null, modulo text not null,
 area_id uuid not null references public.areas_trabajo_v238(id), accion text not null check(accion in ('creacion','modificacion','desactivacion','reactivacion')),
 anterior jsonb, nuevo jsonb not null);
create function hys238_private.area_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare actor public.perfiles; action text;
begin
 if not hys238_private.allowed(new.modulo,'manage') then raise exception 'Área fuera de tu ámbito autorizado' using errcode='42501'; end if;
 select * into strict actor from public.perfiles where usuario_id=auth.uid() and activo;
 new.nombre:=regexp_replace(btrim(new.nombre),'\s+',' ','g'); new.actualizado_en:=clock_timestamp();
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.modulo<>old.modulo then raise exception 'Identidad y módulo inmutables'; end if;
  if new.nombre=old.nombre and new.activa=old.activa then return old; end if;
  action:=case when new.activa<>old.activa then case when new.activa then 'reactivacion' else 'desactivacion' end else 'modificacion' end;
 else action:='creacion'; end if;
 insert into public.auditoria_areas_v238(usuario_id,usuario_nombre,rol,modulo,area_id,accion,anterior,nuevo)
 values(actor.usuario_id,actor.nombre,actor.rol,new.modulo,new.id,action,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
-- FK diferida permite insertar la auditoría desde BEFORE INSERT de forma atómica.
alter table public.auditoria_areas_v238 drop constraint auditoria_areas_v238_area_id_fkey;
alter table public.auditoria_areas_v238 add constraint auditoria_areas_v238_area_id_fkey foreign key(area_id) references public.areas_trabajo_v238(id) deferrable initially deferred;
create trigger area_audit_v238 before insert or update on public.areas_trabajo_v238 for each row execute function hys238_private.area_audit();
revoke all on function hys238_private.area_audit() from public,anon,authenticated;
create table public.listas_v238(
 id uuid primary key default gen_random_uuid(), modulo text not null check(modulo in ('APR','OTROS')),
 campo text not null check(campo in ('shift','project','Resultado','Prioridad','Estado','otherCategory','otherStatus','owner')),
 valor text not null check(length(btrim(valor)) between 1 and 150), activa boolean not null default true,
 actualizado_en timestamptz not null default now());
create unique index listas_v238_unique on public.listas_v238(modulo,campo,lower(regexp_replace(btrim(valor),'\s+',' ','g')));
create table public.informes_v238(
 id text primary key check(length(id) between 1 and 200), modulo text not null check(modulo in ('APR','OTROS')),
 creador_id uuid not null references public.perfiles(usuario_id), creador_nombre text not null,
 ultimo_actor_id uuid not null references public.perfiles(usuario_id), ultimo_actor_nombre text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'), archivo jsonb,
 revision integer not null default 1 check(revision>0), ultimo_token uuid not null,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now());
create index informes_v238_modulo_actor on public.informes_v238(modulo,creador_id,actualizado_en desc);
create index auditoria_areas_v238_modulo_fecha on public.auditoria_areas_v238(modulo,fecha desc);
create index auditoria_areas_v238_area on public.auditoria_areas_v238(area_id);
create index informes_v238_actor on public.informes_v238(ultimo_actor_id);
alter table public.areas_trabajo_v238 enable row level security;
alter table public.auditoria_areas_v238 enable row level security;
alter table public.listas_v238 enable row level security;
alter table public.informes_v238 enable row level security;
revoke all on public.areas_trabajo_v238,public.auditoria_areas_v238,public.listas_v238,public.informes_v238 from public,anon,authenticated;
grant select on public.areas_trabajo_v238,public.auditoria_areas_v238,public.listas_v238,public.informes_v238 to authenticated;
grant insert(modulo,nombre),update(nombre,activa) on public.areas_trabajo_v238 to authenticated;
grant insert(modulo,campo,valor),update(valor,activa,actualizado_en) on public.listas_v238 to authenticated;
create policy areas_read_v238 on public.areas_trabajo_v238 for select to authenticated using(hys238_private.allowed(modulo,'read') and (activa or hys238_private.allowed(modulo,'manage')));
create policy areas_insert_v238 on public.areas_trabajo_v238 for insert to authenticated with check(hys238_private.allowed(modulo,'manage'));
create policy areas_update_v238 on public.areas_trabajo_v238 for update to authenticated using(hys238_private.allowed(modulo,'manage')) with check(hys238_private.allowed(modulo,'manage'));
create policy audit_read_v238 on public.auditoria_areas_v238 for select to authenticated using(hys238_private.allowed(modulo,'manage'));
create policy lists_read_v238 on public.listas_v238 for select to authenticated using(hys238_private.allowed(modulo,'read') and (activa or hys238_private.allowed(modulo,'global')));
create policy lists_insert_v238 on public.listas_v238 for insert to authenticated with check(hys238_private.allowed(modulo,'global'));
create policy lists_update_v238 on public.listas_v238 for update to authenticated using(hys238_private.allowed(modulo,'global')) with check(hys238_private.allowed(modulo,'global'));
create policy reports_read_v238 on public.informes_v238 for select to authenticated using(hys238_private.allowed(modulo,'read') and (creador_id=(select auth.uid()) or hys238_private.allowed(modulo,'manage')));
create function public.hys238_guardar_informe(p_id text,p_modulo text,p_payload jsonb,p_archivo jsonb,p_revision integer,p_token uuid) returns public.informes_v238
language plpgsql security definer set search_path='' as $$
declare actor public.perfiles; previous public.informes_v238; result public.informes_v238;
begin
 if not hys238_private.allowed(p_modulo,'write') then raise exception 'No tienes permiso para guardar en este módulo' using errcode='42501'; end if;
 select * into strict actor from public.perfiles where usuario_id=auth.uid() and activo;
 if p_token is null or p_payload is null or p_revision is null then raise exception 'Datos incompletos'; end if;
 if actor.rol<>'administrador_global' then p_payload:=jsonb_set(p_payload,'{owner}',to_jsonb(actor.nombre),true); end if;
 -- actor real siempre proviene de Auth/perfiles, nunca del formulario.
 p_payload:=p_payload-'authenticatedUser';
 if p_modulo='OTROS' then p_payload:=jsonb_set(p_payload,'{data,activities}','[]'::jsonb,true); p_payload:=jsonb_set(p_payload,'{data,inspections}','[]'::jsonb,true); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id,238));
 select * into previous from public.informes_v238 where id=p_id for update;
 if found then
  if previous.modulo<>p_modulo or (previous.creador_id<>auth.uid() and not hys238_private.allowed(p_modulo,'manage')) then raise exception 'Informe fuera de tu ámbito' using errcode='42501'; end if;
  if previous.ultimo_token=p_token then return previous; end if;
  if previous.revision<>p_revision then raise exception 'Conflicto: existe una versión más reciente. Conserva tu copia y recarga.' using errcode='40001'; end if;
  update public.informes_v238 set payload=p_payload,archivo=coalesce(p_archivo,previous.archivo),revision=revision+1,ultimo_token=p_token,
   ultimo_actor_id=actor.usuario_id,ultimo_actor_nombre=actor.nombre,actualizado_en=clock_timestamp() where id=p_id returning * into result;
 else
  if p_revision<>0 then raise exception 'Revisión inexistente' using errcode='40001'; end if;
  insert into public.informes_v238(id,modulo,creador_id,creador_nombre,ultimo_actor_id,ultimo_actor_nombre,payload,archivo,ultimo_token)
  values(p_id,p_modulo,actor.usuario_id,actor.nombre,actor.usuario_id,actor.nombre,p_payload,p_archivo,p_token) returning * into result;
 end if;
 return result;
end $$;
revoke all on function public.hys238_guardar_informe(text,text,jsonb,jsonb,integer,uuid) from public,anon;
grant execute on function public.hys238_guardar_informe(text,text,jsonb,jsonb,integer,uuid) to authenticated;
-- Inicialización de las once áreas conocidas: baseline de despliegue, sin suplantar a ningún usuario.
alter table public.areas_trabajo_v238 disable trigger area_audit_v238;
insert into public.areas_trabajo_v238(modulo,nombre) select m,n from unnest(array['APR','OTROS'])m cross join unnest(array['VA4','V5','VA4/V5','VOLCAN','AUCAYES','MAITENES','VA1','VA2','COLORADO','VL4','VL5'])n;
insert into public.auditoria_areas_v238(usuario_nombre,rol,modulo,area_id,accion,nuevo) select 'Inicialización v238','sistema',modulo,id,'creacion',to_jsonb(a) from public.areas_trabajo_v238 a;
alter table public.areas_trabajo_v238 enable trigger area_audit_v238;
insert into public.listas_v238(modulo,campo,valor)
 select m,c,v from unnest(array['APR','OTROS'])m cross join (values
 ('shift','Día/Propio'),('shift','Noche/Propio'),('shift','Día/Reemplazo'),('shift','Noche/Reemplazo'),
 ('project','PHAM 1'),('project','PHAM 2'),('Resultado','Sin novedades'),('Resultado','Con observaciones'),('Resultado','Requiere seguimiento'),('Resultado','Otro'),
 ('Prioridad','Baja'),('Prioridad','Media'),('Prioridad','Alta'),('Prioridad','Crítica'),('Estado','Pendiente'),('Estado','En proceso'),('Estado','Completado'),
 ('otherCategory','Inspección'),('otherCategory','Actividad operacional'),('otherCategory','Mantenimiento'),('otherCategory','Hallazgo'),('otherCategory','Seguimiento'),('otherCategory','Otro'),
 ('otherStatus','Pendiente'),('otherStatus','En proceso'),('otherStatus','Finalizado'),
 ('owner','Bladimir Diaz'),('owner','Isabel Mora'),('owner','Ivan Mieres'),('owner','Manuel Suazo'),('owner','Marcelo Aguilera'),('owner','Marcelo Guerrero'))x(c,v);
commit;

