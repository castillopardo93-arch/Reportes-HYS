begin;
create or replace function hys241_private.allowed(m text,purpose text default 'read') returns boolean language sql stable security definer set search_path='' as $$
 select hys241_private.activo() and case
 when purpose='global' then hys241_private.general_unico()
 when purpose='read' then hys241_private.modulo(m) or hys241_private.facultad(m,'view') or hys241_private.facultad(m,'areas') or hys241_private.facultad(m,'audit') or hys241_private.facultad(m,'users') or hys241_private.facultad(m,'activation')
 when purpose='write' then hys241_private.modulo(m,true) or hys241_private.facultad(m,'editOthers')
 when purpose='manage' then hys241_private.general_unico() or (hys241_private.supervisor_existente(m,true)) or hys241_private.facultad(m,'areas') or hys241_private.facultad(m,'editOthers')
 when purpose='audit' then hys241_private.general_unico() or (hys241_private.supervisor_existente(m)) or hys241_private.facultad(m,'audit')
 else false end
$$;
drop policy areas_insert_v241 on public.areas_trabajo_v241;
drop policy areas_update_v241 on public.areas_trabajo_v241;
drop policy audit_read_v241 on public.auditoria_areas_v241;
create policy areas_insert_v241 on public.areas_trabajo_v241 for insert to authenticated with check(hys241_private.general_unico() or hys241_private.facultad(modulo,'areas') or (hys241_private.supervisor_existente(modulo,true)));
create policy areas_update_v241 on public.areas_trabajo_v241 for update to authenticated using(hys241_private.general_unico() or hys241_private.facultad(modulo,'areas',id) or (hys241_private.supervisor_existente(modulo,true,id))) with check(hys241_private.general_unico() or hys241_private.facultad(modulo,'areas',id) or (hys241_private.supervisor_existente(modulo,true,id)));
create policy audit_read_v241 on public.auditoria_areas_v241 for select to authenticated using(hys241_private.general_unico() or hys241_private.facultad(modulo,'audit',area_id) or (hys241_private.supervisor_existente(modulo,false,area_id)));
create function hys241_private.area_creada() returns trigger language plpgsql security definer set search_path='' as $$declare before public.facultades_v241;after public.facultades_v241;p public.perfiles;c public.cuentas_v241;updated public.cuentas_v241;begin
 if hys241_private.rol()='administrador_area' and not hys241_private.general_unico() then
  select * into p from public.perfiles where usuario_id=auth.uid();p.rol:=hys241_private.rol();
  select * into before from public.facultades_v241 where usuario_id=auth.uid() and modulo=new.modulo for update;
  if before.facultades->'areas'<>'true'::jsonb then raise exception 'Sin permiso para crear áreas' using errcode='42501';end if;
  update public.facultades_v241 set areas_ids=array_append(areas_ids,new.id),revision=revision+1,actualizado_en=clock_timestamp() where usuario_id=auth.uid() and modulo=new.modulo returning * into after;
  insert into public.auditoria_facultades_v241(actor_id,actor_nombre,actor_rol,usuario_id,modulo,motivo,anterior,nuevo) values(p.usuario_id,p.nombre,p.rol,p.usuario_id,new.modulo,'Área nueva creada bajo facultad delegada',to_jsonb(before),to_jsonb(after));
 elsif hys241_private.supervisor_existente(new.modulo,true) and exists(select 1 from public.cuentas_v241 where usuario_id=auth.uid()) then
  select * into c from public.cuentas_v241 where usuario_id=auth.uid() for update;
  update public.cuentas_v241 set ambitos=jsonb_set(ambitos,array[new.modulo,'areas'],coalesce(ambitos->new.modulo->'areas','[]')||jsonb_build_array(new.id),true),revision=revision+1 where usuario_id=auth.uid() returning * into updated;
  insert into public.eventos_v241(actor_id,actor_nombre,accion,modulo,entidad,motivo,anterior,nuevo) values(auth.uid(),c.nombre,'Área nueva incorporada al ámbito',new.modulo,new.id::text,'Creación autorizada de área',to_jsonb(c),to_jsonb(updated));
 end if;return new;end$$;
create trigger area_creada_v241 after insert on public.areas_trabajo_v241 for each row execute function hys241_private.area_creada();
-- APIs devuelven todas las áreas de un informe antes de aprobar cualquier acción.
create function public.hys241_permisos_efectivos() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('contexto',public.hys241_contexto(),'facultades',coalesce((select jsonb_agg(to_jsonb(f)) from public.facultades_v241 f where f.usuario_id=auth.uid()),'[]'))
$$;
revoke all on function hys241_private.area_creada() from public,anon,authenticated;
grant execute on function hys241_private.supervisor_existente(text,boolean,uuid),hys241_private.modulo(text,boolean),hys241_private.rol() to authenticated;
revoke all on function public.hys241_permisos_efectivos() from public,anon;
grant execute on function public.hys241_permisos_efectivos() to authenticated;
commit;
