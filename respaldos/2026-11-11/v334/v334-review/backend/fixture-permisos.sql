-- Funciones copiadas de v243/supabase/seguridad-operativa-v242.sql para pruebas locales.
create function hys242_private.activo() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles p left join public.cuentas_v242 c using(usuario_id) where p.usuario_id=auth.uid() and p.activo and coalesce(c.activo,true))
$$;
create function hys242_private.rol() returns text language sql stable security definer set search_path='' as $$
 select case when p.rol='administrador_global' then p.rol else coalesce(c.rol,p.rol) end from public.perfiles p left join public.cuentas_v242 c using(usuario_id) where p.usuario_id=auth.uid() and p.activo and coalesce(c.activo,true)
$$;
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
