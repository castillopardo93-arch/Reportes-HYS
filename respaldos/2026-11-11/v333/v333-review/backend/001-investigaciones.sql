-- Migración aditiva para evaluación en desarrollo aislado.
begin;
create schema hys313_private;
revoke all on schema hys313_private from public, anon, authenticated;

create table hys313_private.expedientes (
 id uuid primary key,
 autor uuid not null references public.perfiles(usuario_id),
 modulo text not null check (modulo in ('APR','OTROS')),
 area uuid not null references public.areas_trabajo_v242(id),
 creado timestamptz not null default clock_timestamp()
);

create index hys313_expedientes_area on hys313_private.expedientes(modulo,area,creado desc,id);

create table hys313_private.documentos (
 expediente uuid not null references hys313_private.expedientes(id),
 tipo text not null check (tipo in ('flash','final')),
 version integer not null check (version > 0),
 estado text not null check (estado in ('borrador','en_revision','devuelto','aprobado','cerrado')),
 datos jsonb not null,
 revisor uuid references public.perfiles(usuario_id),
 flash_version integer,
 primary key (expediente,tipo)
);

create table hys313_private.historial (
 id bigint generated always as identity primary key,
 expediente uuid not null,
 tipo text not null,
 version integer not null,
 actor uuid not null references public.perfiles(usuario_id),
 fecha timestamptz not null default clock_timestamp(),
 accion text not null,
 motivo text,
 anterior jsonb,
 nuevo jsonb not null,
 unique (expediente,tipo,version),
 foreign key (expediente,tipo) references hys313_private.documentos(expediente,tipo)
);

alter table hys313_private.expedientes enable row level security;
alter table hys313_private.documentos enable row level security;
alter table hys313_private.historial enable row level security;
revoke all on all tables in schema hys313_private from public, anon, authenticated;

create function hys313_private.ambito(m text,a uuid,escritura boolean)
returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.areas_trabajo_v242 where id=a and modulo=m and activa)
 and coalesce(hys242_private.modulo(m,escritura),false)
 and coalesce(hys242_private.en_ids(m,array[a]),false)
 and (hys242_private.general_unico()
   or exists(select 1 from public.cuentas_v242 where usuario_id=auth.uid())
   or exists(select 1 from public.facultades_v242 f where f.usuario_id=auth.uid()
             and f.modulo=m and a=any(f.areas_ids))
   or exists(select 1 from public.permisos_usuario p join public.areas s on s.id=p.area_id
              join public.areas_trabajo_v242 t on t.id=a and t.nombre=s.nombre
             where p.usuario_id=auth.uid() and p.modulo=m and s.activa and p.puede_ver
               and (not escritura or p.puede_editar)))
$$;

create function hys313_private.revisor(u uuid,m text,a uuid)
returns boolean language sql stable set search_path='' as $$
 select exists(
   select 1 from public.perfiles p
   left join public.cuentas_v242 c on c.usuario_id=p.usuario_id
   join public.facultades_v242 f on f.usuario_id=p.usuario_id
   where p.usuario_id=u and p.activo and coalesce(c.activo,true)
    and coalesce(c.rol,p.rol)='administrador_area'
    and f.modulo=m and a=any(f.areas_ids) and f.facultades->'review'='true'::jsonb
    and (c.usuario_id is null or c.ambitos->m->'ver'='true'::jsonb)
 )
$$;

create function hys313_private.validar(t text,d jsonb,enviar boolean)
returns void language plpgsql set search_path='' as $$
declare k text; v text; fecha text; requisitos jsonb;
begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>262144 then
  raise exception 'Contenido inválido o superior a 256 KiB' using errcode='22023';
 end if;
 for k,v in select key,value from jsonb_each_text(d) loop
  if jsonb_typeof(d->k) is distinct from 'string' then
   raise exception 'Campo inválido: %',k using errcode='22023';
  end if;
  if left(k,7)='action_' and (t<>'final' or
   k !~ '^action_([1-9]|[1-3][0-9]|40)_(codigo|descripcion|responsable|fecha)$') then
   raise exception 'Fila de plan inválida: %',k using errcode='22023';
  end if;
  if k in ('fecha_ocurrencia','fecha_incidente') or k ~ '^action_[0-9]+_fecha$' then
   fecha:=nullif(btrim(v),'');
   if fecha is not null and (fecha !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char(fecha::date,'YYYY-MM-DD')<>fecha) then
    raise exception 'Fecha inválida: %',k using errcode='22023';
   end if;
  end if;
 end loop;
 if not enviar then return; end if;
 -- Contrato provisional de v313, sujeto a validación de H&S.
 requisitos:=case when t='flash' then
  '{"tipo_incidente":1,"probabilidad":1,"fecha_ocurrencia":1,"hora":1,"area_proyecto":1,"ubicacion":5,"involucrado":3,"cargo":2,"primeros_auxilios":1,"ambulancia":1,"hospital":1,"existen_testigos":1,"hechos":15,"causas_aparentes":10,"acciones_inmediatas":10,"reportado_por":3,"preparado_por":3}'::jsonb
 else '{"involucrados":3,"fecha_incidente":1,"tipo_incidente":1,"lugar_incidente":2,"descripcion":20,"equipo_investigador":5}'::jsonb end;
 for k,v in select key,value from jsonb_each_text(requisitos) loop
  if length(btrim(coalesce(d->>k,'')))<v::integer then
   raise exception 'Campo obligatorio o incompleto: %',k using errcode='22023';
  end if;
 end loop;
 if t='flash' and d->>'hora' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
  raise exception 'Hora inválida' using errcode='22023';
 end if;
 if t='final' and (
    not exists(select 1 from jsonb_each_text(d) where key in
     ('condiciones_subestandar','acciones_subestandar','factores_trabajo','factores_personales','requerimientos_sistema')
     and length(btrim(value))>0)
    or not exists(select 1 from jsonb_each_text(d) where key ~ '^action_[0-9]+_descripcion$' and length(btrim(value))>=10)
 ) then raise exception 'Completa el análisis de causas y el plan de acción' using errcode='22023';
 end if;
end
$$;

create function public.hys313_investigacion_aplicar(
 p_id uuid,p_tipo text,p_accion text,p_version integer,p_modulo text default null,
 p_area uuid default null,p_datos jsonb default null,p_revisor uuid default null,p_motivo text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare e hys313_private.expedientes; d hys313_private.documentos;
 anterior jsonb; f hys313_private.documentos; u uuid:=auth.uid(); facultad text;
begin
 if u is null or not hys242_private.activo() or p_id is null
  or p_tipo is null or p_tipo not in ('flash','final') or p_version is null or p_version<0
  or p_accion is null or p_accion not in ('guardar','enviar','devolver','aprobar','cerrar')
  or length(coalesce(p_motivo,''))>2000 then
  raise exception 'Solicitud inválida o sin sesión' using errcode='42501';
 end if;
 select * into e from hys313_private.expedientes where id=p_id for update;
 if not found then
  if p_version<>0 or p_accion<>'guardar' or p_modulo is null or p_area is null
   or not hys313_private.ambito(p_modulo,p_area,true) then
   raise exception 'Expediente no disponible' using errcode='42501';
  end if;
  insert into hys313_private.expedientes(id,autor,modulo,area)
   values(p_id,u,p_modulo,p_area) returning * into e;
 end if;
 if not hys313_private.ambito(e.modulo,e.area,false) or
   (p_modulo is not null and p_modulo<>e.modulo) or (p_area is not null and p_area<>e.area) then
  raise exception 'Expediente no disponible' using errcode='42501';
 end if;
 select * into d from hys313_private.documentos where expediente=p_id and tipo=p_tipo;
 if d.version is not null then anterior:=to_jsonb(d); end if;
 if p_accion in ('guardar','enviar') then
  if e.autor<>u or not hys313_private.ambito(e.modulo,e.area,true) then
   raise exception 'Edición no autorizada' using errcode='42501';
  end if;
 elsif p_accion in ('devolver','aprobar') then
  if d.revisor is distinct from u or not hys313_private.revisor(u,e.modulo,e.area) then
   raise exception 'Revisión no autorizada' using errcode='42501';
  end if;
 else
  facultad:=case when p_tipo='flash' then 'closeFlashReport' else 'closeFinalReport' end;
  if not coalesce(hys242_private.facultad(e.modulo,facultad,e.area),false) then
   raise exception 'Cierre no autorizado' using errcode='42501';
  end if;
 end if;
 if coalesce(d.version,0)<>p_version then
  raise exception 'Versión desactualizada. Recupera el expediente antes de guardar' using errcode='40001';
 end if;
 select * into f from hys313_private.documentos where expediente=p_id and tipo='flash';
 if p_accion in ('aprobar','cerrar') and p_tipo='final' and
  (f.estado is null or f.estado not in ('aprobado','cerrado') or
   d.flash_version is distinct from f.flash_version) then
  raise exception 'Final requiere reconciliar la revisión de Flash' using errcode='22023';
 end if;
 case p_accion
 when 'guardar' then
  if d.estado is not null and d.estado not in ('borrador','devuelto') then
   raise exception 'Documento en solo lectura' using errcode='22023';
  end if;
  perform hys313_private.validar(p_tipo,p_datos,false);
  d.datos:=p_datos;
  d.estado:=coalesce(d.estado,'borrador');
 when 'enviar' then
  if d.estado is null or d.estado not in ('borrador','devuelto') or
   p_revisor is null or p_revisor=u or not hys313_private.revisor(p_revisor,e.modulo,e.area) then
   raise exception 'Estado o revisor inválido' using errcode='22023';
  end if;
  perform hys313_private.validar(p_tipo,d.datos,true);
  if p_tipo='final' and (f.estado is null or f.estado not in ('en_revision','aprobado','cerrado')) then
   raise exception 'Envía primero el Flash asociado' using errcode='22023';
  end if;
  if p_tipo='final' and d.flash_version is not null
   and d.flash_version is distinct from f.flash_version and nullif(btrim(p_motivo),'') is null then
   raise exception 'Indica cómo se reconciliaron los cambios de Flash' using errcode='22023';
  end if;
  d.flash_version:=case when p_tipo='flash' then p_version+1 else f.flash_version end;
  d.revisor:=p_revisor;
  d.estado:='en_revision';
 when 'devolver' then
  if d.estado is distinct from 'en_revision' or nullif(btrim(p_motivo),'') is null then
   raise exception 'La devolución requiere motivo y revisión activa' using errcode='22023';
  end if;
  d.estado:='devuelto';
 when 'aprobar' then
  if not coalesce(hys242_private.facultad(e.modulo,'approve',e.area),false) then
   raise exception 'Aprobación no autorizada' using errcode='42501';
  end if;
  if d.estado is distinct from 'en_revision' then raise exception 'Revisión inactiva' using errcode='22023'; end if;
  d.estado:='aprobado';
 when 'cerrar' then
  if d.estado is distinct from 'aprobado' or nullif(btrim(p_motivo),'') is null then
   raise exception 'El cierre requiere aprobación y motivo' using errcode='22023';
  end if;
  d.estado:='cerrado';
 end case;
 d.expediente:=p_id;
 d.tipo:=p_tipo;
 d.version:=p_version+1;
 insert into hys313_private.documentos values(d.*)
 on conflict(expediente,tipo) do update set version=excluded.version,estado=excluded.estado,
   datos=excluded.datos,revisor=excluded.revisor,flash_version=excluded.flash_version;
 insert into hys313_private.historial(expediente,tipo,version,actor,accion,motivo,anterior,nuevo)
 values(p_id,p_tipo,d.version,u,p_accion,p_motivo,anterior,to_jsonb(d));
 return to_jsonb(d);
end
$$;

create function public.hys313_investigacion_leer(p_id uuid,p_tipo text,p_desde integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e hys313_private.expedientes; d hys313_private.documentos;
begin
 select * into e from hys313_private.expedientes where id=p_id;
 select * into d from hys313_private.documentos where expediente=p_id and tipo=p_tipo;
 if d.version is null or not hys313_private.ambito(e.modulo,e.area,false)
   or not coalesce((e.autor=auth.uid() or hys242_private.general_unico()
    or (d.revisor=auth.uid() and hys313_private.revisor(auth.uid(),e.modulo,e.area))
    or hys242_private.facultad(e.modulo,case p_tipo when 'flash' then 'closeFlashReport' else 'closeFinalReport' end,e.area)),false) then
  raise exception 'Documento no disponible' using errcode='42501';
 end if;
 return jsonb_build_object('documento',to_jsonb(d),'historial',coalesce((
  select jsonb_agg(to_jsonb(h) order by h.version) from
   (select * from hys313_private.historial where expediente=p_id and tipo=p_tipo
     and version>coalesce(p_desde,0) order by version limit 20) h
 ),'[]'::jsonb));
end
$$;

create function public.hys313_investigacion_listar(p_modulo text,p_area uuid,p_pagina integer default 0)
returns table (expediente uuid,tipo text,version integer,estado text,creado timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not hys313_private.ambito(p_modulo,p_area,false) then
  raise exception 'Área no autorizada' using errcode='42501';
 end if;
 if p_pagina is null or p_pagina not between 0 and 10000 then
  raise exception 'Página inválida' using errcode='22023';
 end if;
 return query select e.id,d.tipo,d.version,d.estado,e.creado
 from hys313_private.expedientes e join hys313_private.documentos d on d.expediente=e.id
 where e.modulo=p_modulo and e.area=p_area and
  (e.autor=auth.uid() or hys242_private.general_unico()
   or (d.revisor=auth.uid() and hys313_private.revisor(auth.uid(),e.modulo,e.area))
   or hys242_private.facultad(e.modulo,case d.tipo when 'flash' then 'closeFlashReport' else 'closeFinalReport' end,e.area))
 order by e.creado desc,e.id,d.tipo limit 20 offset p_pagina*20;
end
$$;
revoke all on function public.hys313_investigacion_listar(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.hys313_investigacion_listar(text,uuid,integer) to authenticated;

create function public.hys313_investigacion_revisores(p_modulo text,p_area uuid,p_nombre text)
returns table (id uuid,nombre text) language plpgsql stable security definer set search_path='' as $$
declare consulta text:=lower(translate(btrim(p_nombre),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'));
begin
 if not hys313_private.ambito(p_modulo,p_area,true) then
  raise exception 'Área no autorizada' using errcode='42501';
 end if;
 if length(consulta) not between 2 and 100 or consulta is null then return; end if;
 return query select p.usuario_id,p.nombre from public.perfiles p
 where p.usuario_id<>auth.uid() and hys313_private.revisor(p.usuario_id,p_modulo,p_area)
 and strpos(lower(translate(p.nombre,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')),consulta)>0
 order by p.nombre,p.usuario_id limit 20;
end
$$;

revoke all on function public.hys313_investigacion_revisores(text,uuid,text) from public,anon,authenticated;
grant execute on function public.hys313_investigacion_revisores(text,uuid,text) to authenticated;

revoke all on function public.hys313_investigacion_aplicar(uuid,text,text,integer,text,uuid,jsonb,uuid,text),
 public.hys313_investigacion_leer(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.hys313_investigacion_aplicar(uuid,text,text,integer,text,uuid,jsonb,uuid,text),
 public.hys313_investigacion_leer(uuid,text,integer) to authenticated;
commit;
