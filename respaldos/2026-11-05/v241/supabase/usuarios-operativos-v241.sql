begin;
create function hys241_private.ambitos_usuario(uid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 select ambitos into result from public.cuentas_v241 where usuario_id=uid;if found then return result;end if;
 select coalesce(jsonb_object_agg(m,jsonb_build_object('ver',true,'editar',editar,'areas',ids)),'{}') into result from (
 select u.modulo m,bool_or(u.puede_editar) editar,(select coalesce(jsonb_agg(a.id),'[]') from public.areas_trabajo_v241 a where a.modulo=u.modulo) ids
 from public.permisos_usuario u join public.areas x on x.id=u.area_id where u.usuario_id=uid and u.puede_ver and x.activa group by u.modulo)t;return result;
end$$;
create function hys241_private.validar_cuenta(uid uuid,data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare p public.perfiles;c public.cuentas_v241;v record;area_value jsonb;old jsonb;activation boolean;role text;begin
 if not hys241_private.activo() then raise exception 'Perfil inactivo' using errcode='42501';end if;
 if uid=auth.uid() then raise exception 'No puedes cambiar tu propia cuenta' using errcode='42501';end if;
 if data->>'rol' not in ('administrador_area','supervisor','usuario') or nullif(btrim(data->>'nombre'),'') is null or length(data->>'nombre')>150 or jsonb_typeof(data->'activo') is distinct from 'boolean' or jsonb_typeof(data->'ambitos') is distinct from 'object' then raise exception 'Datos inválidos';end if;
 if data->'ambitos'='{}'::jsonb then raise exception 'Selecciona al menos un ámbito';end if;
 select * into p from public.perfiles where usuario_id=uid;select * into c from public.cuentas_v241 where usuario_id=uid;
 role:=coalesce(c.rol,p.rol);if p.activo=false and (data->>'activo')::boolean=true then raise exception 'Perfil compartido inactivo: requiere revisión específica; v241 no modifica su estado';end if;
 if p.rol='administrador_global' then raise exception 'Administrador general protegido' using errcode='42501';end if;
 if not hys241_private.general_unico() then
  if hys241_private.rol()<>'administrador_area' or role='administrador_area' or data->>'rol'='administrador_area' then raise exception 'Solo cuentas de menor nivel' using errcode='42501';end if;
  old:=jsonb_build_object('nombre',coalesce(c.nombre,p.nombre),'rol',role,'ambitos',hys241_private.ambitos_usuario(uid));
  activation:=uid is not null and coalesce(c.activo,p.activo) is distinct from (data->>'activo')::boolean;
  if activation and (old->>'nombre' is distinct from data->>'nombre' or old->>'rol' is distinct from data->>'rol' or old->'ambitos' is distinct from data->'ambitos') then raise exception 'Cambia el estado por separado';end if;
  if uid is not null then
   for v in select key,value from jsonb_each(old->'ambitos') loop
    if not hys241_private.facultad(v.key,case when activation then 'activation' else 'users' end) then raise exception 'Cuenta con módulos ajenos' using errcode='42501';end if;
    for area_value in select value from jsonb_array_elements(v.value->'areas') loop if not hys241_private.facultad(v.key,case when activation then 'activation' else 'users' end,(area_value#>>'{}')::uuid) then raise exception 'Cuenta con áreas ajenas' using errcode='42501';end if;end loop;
   end loop;
  end if;
 end if;
 for v in select key,value from jsonb_each(data->'ambitos') loop
  if v.key not in ('APR','OTROS') or jsonb_typeof(v.value->'areas') is distinct from 'array' or jsonb_array_length(v.value->'areas')=0 or jsonb_typeof(v.value->'ver') is distinct from 'boolean' or jsonb_typeof(v.value->'editar') is distinct from 'boolean' or v.value->'ver'<>'true'::jsonb then raise exception 'Ámbito inválido';end if;
  if not hys241_private.general_unico() and not activation and v.value->'editar'='true'::jsonb and not hys241_private.modulo(v.key,true) then raise exception 'No puedes conceder edición superior a la tuya' using errcode='42501';end if;
  if not hys241_private.general_unico() and not hys241_private.facultad(v.key,case when activation then 'activation' else 'users' end) then raise exception 'Asignación fuera de tu módulo' using errcode='42501';end if;
  for area_value in select value from jsonb_array_elements(v.value->'areas') loop
   if not exists(select 1 from public.areas_trabajo_v241 a where a.id=(area_value#>>'{}')::uuid and a.modulo=v.key) or (not hys241_private.general_unico() and not hys241_private.facultad(v.key,case when activation then 'activation' else 'users' end,(area_value#>>'{}')::uuid)) then raise exception 'Área ajena' using errcode='42501';end if;
  end loop;
 end loop;
end$$;
create function public.hys241_guardar_usuario(p_usuario uuid,p_datos jsonb,p_revision int,p_motivo text) returns public.cuentas_v241 language plpgsql security definer set search_path='' as $$declare old public.cuentas_v241;result public.cuentas_v241;p public.perfiles;f public.facultades_v241;updated public.facultades_v241;begin
 perform hys241_private.validar_cuenta(p_usuario,p_datos);if nullif(btrim(p_motivo),'') is null then raise exception 'Motivo obligatorio';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text,241));select * into old from public.cuentas_v241 where usuario_id=p_usuario for update;
 if coalesce(old.revision,0)<>p_revision then raise exception 'Conflicto de cuenta' using errcode='40001';end if;
 insert into public.cuentas_v241(usuario_id,nombre,rol,activo,ambitos) values(p_usuario,btrim(p_datos->>'nombre'),p_datos->>'rol',(p_datos->>'activo')::boolean,p_datos->'ambitos') on conflict(usuario_id) do update set nombre=excluded.nombre,rol=excluded.rol,activo=excluded.activo,ambitos=excluded.ambitos,revision=cuentas_v241.revision+1 returning * into result;
 select * into p from public.perfiles where usuario_id=auth.uid();
 if p_datos->>'rol'<>'administrador_area' then
 for f in select * from public.facultades_v241 where usuario_id=p_usuario and (areas_ids<>'{}' or facultades<>'{}') for update loop
 update public.facultades_v241 set areas_ids='{}',facultades='{}',revision=revision+1,actualizado_en=clock_timestamp(),actor_id=auth.uid() where usuario_id=f.usuario_id and modulo=f.modulo returning * into updated;
 insert into public.auditoria_facultades_v241(actor_id,actor_nombre,actor_rol,usuario_id,modulo,motivo,anterior,nuevo) values(p.usuario_id,p.nombre,p.rol,p_usuario,f.modulo,'Retiro por cambio a rol sin facultades administrativas: '||p_motivo,to_jsonb(f),to_jsonb(updated));
 end loop;end if;
 insert into public.eventos_v241(actor_id,actor_nombre,accion,entidad,motivo,anterior,nuevo) values(p.usuario_id,p.nombre,'gestión de usuario v241',p_usuario::text,p_motivo,to_jsonb(old),to_jsonb(result));return result;
end$$;
create function public.hys241_listar_usuarios() returns jsonb language plpgsql security definer set search_path='' as $$declare p record;item jsonb;result jsonb:='[]';begin
 if not hys241_private.activo() or (not hys241_private.general_unico() and not(hys241_private.facultad('APR','users') or hys241_private.facultad('OTROS','users') or hys241_private.facultad('APR','activation') or hys241_private.facultad('OTROS','activation'))) then raise exception 'Gestión no autorizada' using errcode='42501';end if;
 for p in select u.usuario_id,coalesce(c.nombre,u.nombre) nombre,coalesce(c.rol,u.rol) rol,u.activo and coalesce(c.activo,true) activo,coalesce(c.revision,0) revision from public.perfiles u left join public.cuentas_v241 c using(usuario_id) order by nombre,u.usuario_id loop
  if hys241_private.general_unico() then null;else
   if p.rol not in ('usuario','supervisor') or p.usuario_id=auth.uid() then continue;end if;
   begin perform hys241_private.validar_cuenta(p.usuario_id,jsonb_build_object('nombre',p.nombre,'rol',p.rol,'activo',p.activo,'ambitos',hys241_private.ambitos_usuario(p.usuario_id)));exception when others then begin perform hys241_private.validar_cuenta(p.usuario_id,jsonb_build_object('nombre',p.nombre,'rol',p.rol,'activo',not p.activo,'ambitos',hys241_private.ambitos_usuario(p.usuario_id)));exception when others then continue;end;end;
  end if;
  item:=to_jsonb(p)||jsonb_build_object('ambitos',hys241_private.ambitos_usuario(p.usuario_id));result:=result||jsonb_build_array(item);
 end loop;return result;
end$$;
-- Invitaciones: operación persistente, sin contraseña temporal ni borrado compensatorio.
create table public.invitaciones_v241(id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.perfiles(usuario_id),solicitud uuid not null,email text not null,datos jsonb not null,auth_usuario uuid,estado text not null default 'pendiente',creado_en timestamptz not null default now(),unique(actor_id,solicitud));
alter table public.invitaciones_v241 enable row level security;revoke all on public.invitaciones_v241 from public,anon,authenticated;grant select,update on public.invitaciones_v241 to service_role;
create function public.hys241_preparar_invitacion(p_email text,p_datos jsonb,p_solicitud uuid) returns uuid language plpgsql security definer set search_path='' as $$declare id uuid;old public.invitaciones_v241;begin
 perform hys241_private.validar_cuenta(null,p_datos);if nullif(btrim(p_datos->>'motivo'),'') is null then raise exception 'Motivo obligatorio para invitar';end if;if p_email is null or length(p_email)>254 or p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_solicitud is null then raise exception 'Solicitud inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||lower(btrim(p_email)),241));
 select * into old from public.invitaciones_v241 where actor_id=auth.uid() and solicitud=p_solicitud;if found then if old.email<>lower(btrim(p_email)) or old.datos<>p_datos then raise exception 'La solicitud ya tiene otros datos';end if;return old.id;end if;
 select * into old from public.invitaciones_v241 where actor_id=auth.uid() and email=lower(btrim(p_email)) and datos=p_datos order by creado_en desc limit 1;if found then return old.id;end if;
 if exists(select 1 from public.invitaciones_v241 where actor_id=auth.uid() and email=lower(btrim(p_email)) and estado<>'completa') then raise exception 'Existe una invitación pendiente con otros datos; conserva su solicitud para conciliación';end if;
 insert into public.invitaciones_v241(actor_id,solicitud,email,datos) values(auth.uid(),p_solicitud,lower(btrim(p_email)),p_datos) on conflict(actor_id,solicitud) do nothing returning invitaciones_v241.id into id;
 if id is null then select * into old from public.invitaciones_v241 where actor_id=auth.uid() and solicitud=p_solicitud;if old.email<>lower(btrim(p_email)) or old.datos<>p_datos then raise exception 'La solicitud ya tiene otros datos';end if;id:=old.id;end if;return id;
end$$;
create function public.hys241_completar_invitacion(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$declare job public.invitaciones_v241;begin
 if not hys241_private.activo() then raise exception 'Perfil inactivo' using errcode='42501';end if;
 select * into job from public.invitaciones_v241 where id=p_id and actor_id=auth.uid() for update;if not found or job.auth_usuario is null then raise exception 'Invitación no preparada';end if;
 if job.estado='completa' then return job.auth_usuario;end if;perform hys241_private.validar_cuenta(null,job.datos);
 if exists(select 1 from public.perfiles where usuario_id=job.auth_usuario and rol<>'usuario') or exists(select 1 from public.cuentas_v241 where usuario_id=job.auth_usuario) then raise exception 'Cuenta existente protegida';end if;
 insert into public.perfiles(usuario_id,nombre,rol,activo) values(job.auth_usuario,job.datos->>'nombre','usuario',true) on conflict(usuario_id) do nothing;
 perform public.hys241_guardar_usuario(job.auth_usuario,job.datos,0,job.datos->>'motivo');update public.invitaciones_v241 set estado='completa' where id=job.id;return job.auth_usuario;
end$$;
create or replace function public.hys241_listar_administradores() returns table(usuario_id uuid,nombre text,activo boolean) language plpgsql security definer set search_path='' as $$begin
 if not hys241_private.general_unico() then raise exception 'Solo Administrador general' using errcode='42501';end if;return query select p.usuario_id,coalesce(c.nombre,p.nombre),p.activo and coalesce(c.activo,true) from public.perfiles p left join public.cuentas_v241 c using(usuario_id) where coalesce(c.rol,p.rol)='administrador_area' order by coalesce(c.nombre,p.nombre),p.usuario_id;
end$$;
revoke all on function hys241_private.ambitos_usuario(uuid),hys241_private.validar_cuenta(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.hys241_guardar_usuario(uuid,jsonb,int,text),public.hys241_listar_usuarios(),public.hys241_preparar_invitacion(text,jsonb,uuid),public.hys241_completar_invitacion(uuid) from public,anon;
grant execute on function public.hys241_guardar_usuario(uuid,jsonb,int,text),public.hys241_listar_usuarios(),public.hys241_preparar_invitacion(text,jsonb,uuid),public.hys241_completar_invitacion(uuid) to authenticated;
commit;
