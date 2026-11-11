-- Objetos exclusivos v242. No ejecutar en remoto sin aprobar la etapa de instalación.
begin;
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
