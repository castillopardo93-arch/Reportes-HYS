begin;
create table hys313_private.evidencias (
 id uuid primary key,
 expediente uuid not null,
 tipo text not null,
 nombre text not null check (length(nombre) between 1 and 180),
 mime text not null check (mime in ('image/jpeg','image/png')),
 contenido bytea,
 creado_por uuid not null references public.perfiles(usuario_id),
 creado timestamptz not null default clock_timestamp(),
 eliminado_por uuid references public.perfiles(usuario_id),
 eliminado timestamptz,
 motivo text,
 foreign key (expediente,tipo) references hys313_private.documentos(expediente,tipo)
);
create index hys313_evidencias_documento on hys313_private.evidencias(expediente,tipo);
alter table hys313_private.evidencias enable row level security;
revoke all on hys313_private.evidencias from public,anon,authenticated;

create function public.hys313_evidencia(
 p_expediente uuid,p_tipo text,p_accion text,p_id uuid default null,
 p_nombre text default null,p_mime text default null,p_base64 text default null,p_motivo text default null
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
  if p_id is null or p_nombre is null or length(btrim(p_nombre)) not between 1 and 180
   or p_nombre ~ '[[:cntrl:]/]' or strpos(p_nombre,chr(92))>0
   or p_mime is null or p_mime not in ('image/jpeg','image/png')
   or p_base64 is null or length(p_base64)>6990508 then
   raise exception 'Archivo inválido o superior a 5 MiB' using errcode='22023';
  end if;
  bytes:=decode(p_base64,'base64');
  if octet_length(bytes) not between 16 and 5242880 or
   (p_mime='image/png' and substring(bytes from 1 for 8)<>decode('89504e470d0a1a0a','hex')) or
   (p_mime='image/jpeg' and substring(bytes from 1 for 3)<>decode('ffd8ff','hex')) then
   raise exception 'Firma de archivo incompatible' using errcode='22023';
  end if;
  if (select count(*) from hys313_private.evidencias where expediente=p_expediente and tipo=p_tipo)>=20 then
   raise exception 'Límite de 20 evidencias por documento' using errcode='22023';
  end if;
  insert into hys313_private.evidencias(id,expediente,tipo,nombre,mime,contenido,creado_por)
   values(p_id,p_expediente,p_tipo,btrim(p_nombre),p_mime,bytes,u) returning * into archivo;
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
revoke all on function public.hys313_evidencia(uuid,text,text,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.hys313_evidencia(uuid,text,text,uuid,text,text,text,text) to authenticated;
commit;
