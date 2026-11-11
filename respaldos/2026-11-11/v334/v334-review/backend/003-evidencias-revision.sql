begin;
alter table hys313_private.evidencias add column campo text not null default 'fotografias'
 check (campo in ('fotografias','documentos','matriz_archivo','capacitaciones_archivo'));
alter table hys313_private.evidencias drop constraint evidencias_mime_check;
alter table hys313_private.evidencias add constraint evidencias_mime_check
 check (mime in ('image/jpeg','image/png','application/pdf'));

create or replace function hys313_private.revisor(u uuid,m text,a uuid)
returns boolean language sql stable set search_path='' as $$
 select exists(
   select 1 from public.perfiles p
   left join public.cuentas_v242 c on c.usuario_id=p.usuario_id
   join public.facultades_v242 f on f.usuario_id=p.usuario_id
   where p.usuario_id=u and p.activo and coalesce(c.activo,true)
    and coalesce(c.rol,p.rol)='administrador_area'
    and f.modulo=m and a=any(f.areas_ids) and f.facultades->'review'='true'::jsonb
    and (c.usuario_id is null or (c.ambitos->m->'ver'='true'::jsonb and c.ambitos->m->'areas'?a::text))
 )
$$;


create function public.hys317_evidencia(
 p_expediente uuid,p_tipo text,p_accion text,p_id uuid default null,
 p_nombre text default null,p_mime text default null,p_base64 text default null,p_motivo text default null,p_campo text default 'fotografias'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare e hys313_private.expedientes; d hys313_private.documentos;
 archivo hys313_private.evidencias; bytes bytea; u uuid:=auth.uid();
begin
 if p_accion is null or p_accion not in ('subir','leer','listar','eliminar') then
  raise exception 'Acción inválida' using errcode='22023';
 end if;
 if p_accion in ('subir','eliminar') then
  select * into e from hys313_private.expedientes where id=p_expediente for update;
 end if;
 -- Reutiliza autorización de lectura del expediente para cualquier operación.
 perform public.hys313_investigacion_leer(p_expediente,p_tipo,2147483647);
 if p_accion='listar' then
  return coalesce((select jsonb_agg(to_jsonb(a)-'contenido' order by a.creado,a.id)
   from hys313_private.evidencias a where a.expediente=p_expediente and a.tipo=p_tipo),'[]'::jsonb);
 end if;
 if p_accion in ('subir','eliminar') then
  select * into d from hys313_private.documentos where expediente=p_expediente and tipo=p_tipo;
  if e.autor is distinct from u or not hys313_private.ambito(e.modulo,e.area,true) then
   raise exception 'Edición de evidencias no autorizada' using errcode='42501';
  end if;
  if d.estado not in ('borrador','devuelto') then
   raise exception 'Documento en solo lectura' using errcode='22023';
  end if;
 end if;
 if p_accion='subir' then
  if p_campo is null or p_campo not in ('fotografias','documentos','matriz_archivo','capacitaciones_archivo')
   or (p_tipo='flash' and p_campo<>'fotografias') then
   raise exception 'Campo de evidencia inválido' using errcode='22023';
  end if;
  if p_campo='fotografias' and p_mime='application/pdf' then
   raise exception 'Selecciona una imagen para Fotografías' using errcode='22023';
  end if;
  if p_id is null or p_nombre is null or length(btrim(p_nombre)) not between 1 and 180
   or p_nombre ~ '[[:cntrl:]/]' or strpos(p_nombre,chr(92))>0
   or p_mime is null or p_mime not in ('image/jpeg','image/png','application/pdf')
   or p_base64 is null or length(p_base64)>6990508 then
   raise exception 'Archivo inválido o superior a 5 MiB' using errcode='22023';
  end if;
  bytes:=decode(p_base64,'base64');
  if octet_length(bytes) not between 16 and 5242880 or
   (p_mime='image/png' and substring(bytes from 1 for 8)<>decode('89504e470d0a1a0a','hex')) or
   (p_mime='image/jpeg' and substring(bytes from 1 for 3)<>decode('ffd8ff','hex')) or
   (p_mime='application/pdf' and (substring(bytes from 1 for 5)<>decode('255044462d','hex')
    or position(decode('2525454f46','hex') in substring(bytes from greatest(octet_length(bytes)-1024,1)))=0)) then
   raise exception 'Firma de archivo incompatible' using errcode='22023';
  end if;
  select * into archivo from hys313_private.evidencias where id=p_id;
  if found then
   if archivo.expediente=p_expediente and archivo.tipo=p_tipo and archivo.campo=p_campo
    and archivo.creado_por=u and archivo.nombre=btrim(p_nombre) and archivo.mime=p_mime
    and archivo.contenido=bytes and archivo.eliminado is null then
    return to_jsonb(archivo)-'contenido';
   end if;
   raise exception 'La identidad de la evidencia ya está en uso' using errcode='22023';
  end if;
  if (select count(*) from hys313_private.evidencias where expediente=p_expediente and tipo=p_tipo and eliminado is null)>=20 then
   raise exception 'Límite de 20 evidencias por documento' using errcode='22023';
  end if;
  insert into hys313_private.evidencias(id,expediente,tipo,nombre,mime,contenido,creado_por,campo)
   values(p_id,p_expediente,p_tipo,btrim(p_nombre),p_mime,bytes,u,p_campo) returning * into archivo;
 elsif p_accion='eliminar' then
  if length(btrim(coalesce(p_motivo,''))) not between 1 and 2000 then
   raise exception 'Motivo obligatorio' using errcode='22023';
  end if;
  update hys313_private.evidencias set contenido=null,eliminado_por=u,
   eliminado=clock_timestamp(),motivo=btrim(p_motivo)
   where id=p_id and expediente=p_expediente and tipo=p_tipo and eliminado is null returning * into archivo;
 else
  select * into archivo from hys313_private.evidencias
   where id=p_id and expediente=p_expediente and tipo=p_tipo and eliminado is null;
 end if;
 if archivo.id is null then raise exception 'Evidencia no disponible' using errcode='42501'; end if;
 if p_accion='leer' then
  return (to_jsonb(archivo)-'contenido')||jsonb_build_object('base64',encode(archivo.contenido,'base64'));
 end if;
 return to_jsonb(archivo)-'contenido';
end
$$;
revoke all on function public.hys317_evidencia(uuid,text,text,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.hys317_evidencia(uuid,text,text,uuid,text,text,text,text,text) to authenticated;
commit;
