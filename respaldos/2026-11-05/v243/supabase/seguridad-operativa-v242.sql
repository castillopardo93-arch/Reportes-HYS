-- Integración aditiva v242. SOLO instalación revisada; no aplicada en remoto.
-- Orden: base-central, apariencia, facultades, seguridad-operativa.
begin;
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
commit;
