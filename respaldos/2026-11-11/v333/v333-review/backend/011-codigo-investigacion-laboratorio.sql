-- Correlativo compartido por los documentos de cada expediente local.
begin;
alter table hys313_private.expedientes add column numero bigint generated always as identity;
alter table hys313_private.expedientes add constraint hys332_expediente_numero unique(numero);

create or replace function public.hys313_investigacion_leer(p_id uuid,p_tipo text,p_desde integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e hys313_private.expedientes; d hys313_private.documentos; f jsonb; n jsonb;
begin
 select * into e from hys313_private.expedientes where id=p_id;
 select * into d from hys313_private.documentos where expediente=p_id and tipo=p_tipo;
 if d.version is null or not hys313_private.ambito(e.modulo,e.area,false)
   or not coalesce((e.autor=auth.uid() or hys242_private.general_unico()
    or (d.revisor=auth.uid() and hys313_private.revisor(auth.uid(),e.modulo,e.area))
    or hys242_private.facultad(e.modulo,case p_tipo when 'flash' then 'closeFlashReport' else 'closeFinalReport' end,e.area)),false) then
  raise exception 'Documento no disponible' using errcode='42501';
 end if;
 select datos into f from hys313_private.documentos where expediente=p_id and tipo='flash';
 select datos into n from hys313_private.documentos where expediente=p_id and tipo='final';
 return jsonb_build_object('documento',to_jsonb(d),
  'codigo','INV-'||lpad(e.numero::text,greatest(4,length(e.numero::text)),'0'),
  'identificacion',jsonb_build_object(
    'fecha',coalesce(nullif(f->>'fecha_ocurrencia',''),nullif(n->>'fecha_incidente','')),
    'nombres',coalesce(nullif(btrim(f->>'involucrado'),''),nullif(btrim(n->>'involucrados'),''))),
  'historial',coalesce((
  select jsonb_agg(to_jsonb(h) order by h.version) from
   (select * from hys313_private.historial where expediente=p_id and tipo=p_tipo
     and version>coalesce(p_desde,0) order by version limit 20) h
 ),'[]'::jsonb));
end
$$;

commit;
