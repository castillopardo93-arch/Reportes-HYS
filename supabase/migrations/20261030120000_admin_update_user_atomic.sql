-- Reportes HYS v233
-- Actualiza perfil y permisos en una sola transacción PostgreSQL.
-- Si cualquier operación falla, PostgreSQL revierte todos los cambios.

create or replace function public.admin_update_user_atomic(
  p_usuario_id uuid,
  p_nombre text,
  p_rol text,
  p_activo boolean,
  p_requested_modules text[],
  p_manageable_modules text[],
  p_puede_editar boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_rows integer;
begin
  if p_usuario_id is null
     or nullif(btrim(p_nombre), '') is null
     or p_rol is null
     or p_rol not in ('usuario', 'supervisor', 'administrador_area')
     or p_activo is null
     or p_puede_editar is null then
    raise exception 'Parámetros de actualización inválidos';
  end if;

  if p_manageable_modules is null
     or cardinality(p_manageable_modules) = 0
     or exists (
       select 1
       from unnest(p_manageable_modules) as item(module_name)
       where module_name not in ('APR', 'OTROS')
     ) then
    raise exception 'Áreas administrables inválidas';
  end if;

  if p_requested_modules is null
     or cardinality(p_requested_modules) = 0
     or exists (
       select 1
       from unnest(p_requested_modules) as item(module_name)
       where module_name not in ('APR', 'OTROS')
          or not (module_name = any(p_manageable_modules))
     ) then
    raise exception 'Los módulos solicitados no están dentro del ámbito permitido';
  end if;

  update public.perfiles
     set nombre = btrim(p_nombre),
         rol = p_rol,
         activo = p_activo
   where usuario_id = p_usuario_id;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'No se encontró exactamente un perfil para actualizar';
  end if;

  delete from public.permisos_usuario
   where usuario_id = p_usuario_id
     and modulo = any(p_manageable_modules);

  insert into public.permisos_usuario
    (usuario_id, area_id, modulo, puede_ver, puede_editar)
  select
    p_usuario_id,
    case module_name
      when 'APR' then '397ca24b-5700-4491-8b37-429e51b8c682'::uuid
      when 'OTROS' then '38ff7823-7f5c-4e39-abed-6b0f9e8e01e1'::uuid
    end,
    module_name,
    true,
    p_puede_editar
  from unnest(p_requested_modules) as m;
end;
$$;

revoke all on function public.admin_update_user_atomic(uuid, text, text, boolean, text[], text[], boolean) from public;
revoke all on function public.admin_update_user_atomic(uuid, text, text, boolean, text[], text[], boolean) from anon;
revoke all on function public.admin_update_user_atomic(uuid, text, text, boolean, text[], text[], boolean) from authenticated;
grant execute on function public.admin_update_user_atomic(uuid, text, text, boolean, text[], text[], boolean) to service_role;
