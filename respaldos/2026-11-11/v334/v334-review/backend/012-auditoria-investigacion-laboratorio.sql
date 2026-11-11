begin;
create function public.hys333_investigacion_listar(p_modulo text,p_area uuid,p_pagina integer default 0)
returns table (expediente uuid,tipo text,version integer,estado text,creado timestamptz,codigo text,permite_asociado boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not hys313_private.ambito(p_modulo,p_area,false) then
  raise exception 'Área no autorizada' using errcode='42501';
 end if;
 if p_pagina is null or p_pagina not between 0 and 10000 then
  raise exception 'Página inválida' using errcode='22023';
 end if;
 return query select e.id,d.tipo,d.version,d.estado,e.creado,
  'INV-'||lpad(e.numero::text,greatest(4,length(e.numero::text)),'0'),
  coalesce(e.autor=auth.uid() and hys313_private.ambito(e.modulo,e.area,true)
    and not exists(select 1 from hys313_private.documentos otro
                   where otro.expediente=e.id and otro.tipo<>d.tipo),false)
 from hys313_private.expedientes e join hys313_private.documentos d on d.expediente=e.id
 where e.modulo=p_modulo and e.area=p_area and
  (e.autor=auth.uid() or hys242_private.general_unico()
   or (d.revisor=auth.uid() and hys313_private.revisor(auth.uid(),e.modulo,e.area))
   or hys242_private.facultad(e.modulo,case d.tipo when 'flash' then 'closeFlashReport' else 'closeFinalReport' end,e.area))
 order by e.creado desc,e.id,d.tipo limit 20 offset p_pagina*20;
end
$$;
revoke all on function public.hys333_investigacion_listar(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.hys333_investigacion_listar(text,uuid,integer) to authenticated;

create or replace function public.hys313_investigacion_leer(p_id uuid,p_tipo text,p_desde integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e hys313_private.expedientes; d hys313_private.documentos; f jsonb; n jsonb; revisa boolean; reconciliado boolean;
begin
 select * into e from hys313_private.expedientes where id=p_id;
 select * into d from hys313_private.documentos where expediente=p_id and tipo=p_tipo;
 if d.version is null or not hys313_private.ambito(e.modulo,e.area,false)
   or not coalesce((e.autor=auth.uid() or hys242_private.general_unico()
    or (d.revisor=auth.uid() and hys313_private.revisor(auth.uid(),e.modulo,e.area))
    or hys242_private.facultad(e.modulo,case p_tipo when 'flash' then 'closeFlashReport' else 'closeFinalReport' end,e.area)),false) then
  raise exception 'Documento no disponible' using errcode='42501';
 end if;
 revisa:=coalesce(d.revisor=auth.uid() and hys313_private.revisor(auth.uid(),e.modulo,e.area),false);
 reconciliado:=p_tipo='flash' or exists(
  select 1 from hys313_private.documentos origen where origen.expediente=p_id
   and origen.tipo='flash' and origen.estado in ('aprobado','cerrado')
   and origen.flash_version is not distinct from d.flash_version
 );
 select datos into f from hys313_private.documentos where expediente=p_id and tipo='flash';
 select datos into n from hys313_private.documentos where expediente=p_id and tipo='final';
 return jsonb_build_object('documento',to_jsonb(d),
  'codigo','INV-'||lpad(e.numero::text,greatest(4,length(e.numero::text)),'0'),
  'identificacion',jsonb_build_object(
    'fecha',coalesce(nullif(f->>'fecha_ocurrencia',''),nullif(n->>'fecha_incidente','')),
    'nombres',coalesce(nullif(btrim(f->>'involucrado'),''),nullif(btrim(n->>'involucrados'),''))),
  'acciones',jsonb_build_object(
   'editar',coalesce(e.autor=auth.uid() and hys313_private.ambito(e.modulo,e.area,true)
     and d.estado in ('borrador','devuelto'),false),
   'requiere_reconciliar',p_tipo='final' and not reconciliado,
   'devolver',revisa and d.estado='en_revision',
   'aprobar',revisa and d.estado='en_revision' and reconciliado
     and coalesce(hys242_private.facultad(e.modulo,'approve',e.area),false),
   'cerrar',d.estado='aprobado' and reconciliado and coalesce(
     hys242_private.facultad(e.modulo,case p_tipo when 'flash' then 'closeFlashReport' else 'closeFinalReport' end,e.area),false)),
  'historial',coalesce((
  select jsonb_agg(to_jsonb(h) order by h.version) from
   (select * from hys313_private.historial where expediente=p_id and tipo=p_tipo
     and version>coalesce(p_desde,0) order by version limit 20) h
 ),'[]'::jsonb));
end
$$;

commit;
