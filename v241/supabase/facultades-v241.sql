-- PROPUESTA REVISABLE. No aplicada al proyecto remoto.
-- Requiere base-central-v241.sql y apariencia-v241.sql antes de activación.
begin;
do $$begin
 if (select count(*) from public.perfiles where rol='administrador_global')<>1 then
  raise exception 'Debe existir un único Administrador general; no se modifica ninguna cuenta';
 end if;
end$$;
create table public.facultades_v241 (
 usuario_id uuid not null references public.perfiles(usuario_id),
 modulo text not null check(modulo in ('APR','OTROS')),
 areas_ids uuid[] not null default '{}',
 facultades jsonb not null default '{}',
 revision integer not null default 1,
 actualizado_en timestamptz not null default now(),
 actor_id uuid not null references public.perfiles(usuario_id),
 primary key(usuario_id,modulo),check(revision>0)
);
create table public.auditoria_facultades_v241 (
 id bigint generated always as identity primary key,
 fecha timestamptz not null default clock_timestamp(),
 actor_id uuid not null,actor_nombre text not null,actor_rol text not null,
 usuario_id uuid not null,modulo text not null,motivo text not null,
 anterior jsonb,nuevo jsonb not null
);
alter table public.facultades_v241 enable row level security;
alter table public.auditoria_facultades_v241 enable row level security;
revoke all on public.facultades_v241,public.auditoria_facultades_v241 from public,anon,authenticated;
grant select on public.facultades_v241,public.auditoria_facultades_v241 to authenticated;
create function hys241_private.general_unico() returns boolean language sql stable security definer set search_path='' as $$
 select (select count(*) from public.perfiles where rol='administrador_global')=1
 and exists(select 1 from public.perfiles where usuario_id=auth.uid() and activo and rol='administrador_global')
$$;
revoke all on function hys241_private.general_unico() from public,anon;
grant execute on function hys241_private.general_unico() to authenticated;
create policy facultades_read_v241 on public.facultades_v241 for select to authenticated
 using(hys241_private.general_unico() or (usuario_id=auth.uid() and exists(select 1 from public.perfiles p where p.usuario_id=auth.uid() and p.activo)));
create policy facultades_audit_read_v241 on public.auditoria_facultades_v241 for select to authenticated using(hys241_private.general_unico());
create function public.hys241_listar_administradores() returns table(usuario_id uuid,nombre text,activo boolean)
 language plpgsql security definer set search_path='' as $$begin
 if not hys241_private.general_unico() then raise exception 'Solo Administrador general' using errcode='42501';end if;
 return query select p.usuario_id,p.nombre,p.activo from public.perfiles p where p.rol='administrador_area' order by p.nombre,p.usuario_id;
end$$;
revoke all on function public.hys241_listar_administradores() from public,anon;
grant execute on function public.hys241_listar_administradores() to authenticated;
create function public.hys241_asignar_facultades(p_usuario uuid,p_modulo text,p_areas uuid[],p_facultades jsonb,p_revision integer,p_motivo text)
 returns public.facultades_v241 language plpgsql security definer set search_path='' as $$
declare target public.perfiles; actor public.perfiles; old public.facultades_v241; result public.facultades_v241; item record;
begin
 if not hys241_private.general_unico() then raise exception 'Solo Administrador general' using errcode='42501';end if;
 select * into actor from public.perfiles where usuario_id=auth.uid();
 select * into target from public.perfiles where usuario_id=p_usuario for share;
 if not found or target.rol<>'administrador_area' or p_usuario=actor.usuario_id then raise exception 'Cuenta protegida o destino inválido' using errcode='42501';end if;
 if p_modulo is null or p_modulo not in ('APR','OTROS') or p_areas is null or p_facultades is null or jsonb_typeof(p_facultades)<>'object' or nullif(btrim(p_motivo),'') is null or length(p_motivo)>500 or p_revision is null or p_revision<0 then raise exception 'Solicitud inválida';end if;
 for item in select key,value from jsonb_each(p_facultades) loop
  if item.key not in ('view','pdf','review','approve','close','editOthers','areas','users','activation','audit') or jsonb_typeof(item.value)<>'boolean' then raise exception 'Facultad no permitida';end if;
 end loop;
 if cardinality(p_areas)<> (select count(distinct a) from unnest(p_areas) a) or exists(select 1 from unnest(p_areas) a where not exists(select 1 from public.areas_trabajo_v241 t where t.id=a and t.modulo=p_modulo)) then raise exception 'Áreas fuera del módulo o duplicadas';end if;
 if cardinality(p_areas)=0 and exists(select 1 from jsonb_each(p_facultades) e where e.value='true'::jsonb) then raise exception 'Las facultades requieren áreas explícitas';end if;
 -- Serializa altas y actualizaciones del mismo administrador/módulo.
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text||':'||p_modulo,241));
 select * into old from public.facultades_v241 where usuario_id=p_usuario and modulo=p_modulo for update;
 if coalesce(old.revision,0)<>p_revision then raise exception 'Los permisos cambiaron; vuelve a consultar' using errcode='40001';end if;
 insert into public.facultades_v241(usuario_id,modulo,areas_ids,facultades,actor_id)
 values(p_usuario,p_modulo,p_areas,p_facultades,actor.usuario_id)
 on conflict(usuario_id,modulo) do update set areas_ids=excluded.areas_ids,facultades=excluded.facultades,actor_id=excluded.actor_id,revision=facultades_v241.revision+1,actualizado_en=clock_timestamp() returning * into result;
 insert into public.auditoria_facultades_v241(actor_id,actor_nombre,actor_rol,usuario_id,modulo,motivo,anterior,nuevo)
 values(actor.usuario_id,actor.nombre,actor.rol,p_usuario,p_modulo,btrim(p_motivo),case when old.usuario_id is null then null else to_jsonb(old) end,to_jsonb(result));
 return result;
end$$;
revoke all on function public.hys241_asignar_facultades(uuid,text,uuid[],jsonb,integer,text) from public,anon;
grant execute on function public.hys241_asignar_facultades(uuid,text,uuid[],jsonb,integer,text) to authenticated;
create function hys241_private.facultad(m text,k text,a uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select hys241_private.general_unico() or exists(
 select 1 from public.facultades_v241 f join public.perfiles p on p.usuario_id=f.usuario_id
 where f.usuario_id=auth.uid() and p.activo and p.rol='administrador_area' and f.modulo=m and f.facultades->k='true'::jsonb
 and cardinality(f.areas_ids)>0 and (a is null or a=any(f.areas_ids)))
$$;
revoke all on function hys241_private.facultad(text,text,uuid) from public,anon;
grant execute on function hys241_private.facultad(text,text,uuid) to authenticated;
commit;
