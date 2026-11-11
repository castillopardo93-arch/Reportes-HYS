begin;
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
commit;
