-- Reportes HYS v282 - propuesta de backend de administración de catálogos.
-- NO EJECUTADO; solo instalar tras respaldo, revisión y aprobación explícita.
-- No habilita el guardado central de informes ni altera Auth, perfiles, facultades.
-- Conserva las tablas v242 existentes y crea regímenes laborales por separado.
begin;

create table if not exists public.regimenes_laborales_v281(
 id uuid primary key default gen_random_uuid(),
 codigo text not null unique check(codigo ~ '^[1-9][0-9]{0,2}X[1-9][0-9]{0,2}$'),
 activo boolean not null default true,
 revision integer not null default 1 check(revision>0),
 actualizado_en timestamptz not null default clock_timestamp()
);
alter table public.regimenes_laborales_v281 enable row level security;
revoke all on table public.regimenes_laborales_v281 from public,anon,authenticated;
grant select on public.regimenes_laborales_v281 to authenticated;
drop policy if exists regimenes_laborales_v281_read on public.regimenes_laborales_v281;
create policy regimenes_laborales_v281_read on public.regimenes_laborales_v281
 for select to authenticated
 using(hys242_private.activo() and (activo or hys242_private.general_unico()));
insert into public.regimenes_laborales_v281(codigo)
 values('5X2'),('4X3'),('10X5'),('7X7') on conflict(codigo) do nothing;

-- Una única puerta de entrada para listas, áreas de trabajo y regímenes laborales.
-- Nunca aceptar nombres de tabla/columna arbitrarios proporcionados por el cliente.
create or replace function public.hys282_catalogo_capacidades()
returns jsonb language sql stable security invoker set search_path=''
as $v282$
 select jsonb_build_object('version',282,'gestion',true)
 where auth.uid() is not null
$v282$;
revoke all on function public.hys282_catalogo_capacidades() from public,anon;
grant execute on function public.hys282_catalogo_capacidades() to authenticated;

create or replace function public.hys282_catalogo_mutar(
 p_tipo text,p_modulo text,p_selector text,p_id uuid,
 p_valor text,p_activo boolean,p_revision text,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $v282$
declare
 a public.perfiles;
 va public.areas_trabajo_v242;na public.areas_trabajo_v242;
 vl public.listas_v242;nl public.listas_v242;
 vr public.regimenes_laborales_v281;nr public.regimenes_laborales_v281;
 v text;v_motivo text;v_admin boolean;v_old jsonb;v_new jsonb;v_id uuid;
 v_check timestamp with time zone;
begin
 select * into a from public.perfiles where usuario_id=auth.uid();
 if a.usuario_id is null or not a.activo or not hys242_private.activo() then
   raise exception 'No hay una sesión activa con permisos de gestión' using errcode='42501';
 end if;
 v_admin:=hys242_private.general_unico();
 if p_tipo not in ('area','lista','regimen') or p_tipo is null
  or p_activo is null then
   raise exception 'Tipo de catálogo no permitido';
 end if;
 if p_tipo='area' then
   if p_modulo not in ('APR','OTROS') or not
     (v_admin or hys242_private.allowed(p_modulo,'manage')) then
     raise exception 'No tienes facultad para administrar esta área' using errcode='42501';
   end if;
 elsif not v_admin then
   raise exception 'Solo el Administrador general puede cambiar opciones de formularios'
    using errcode='42501';
 end if;
 if p_tipo='lista' and
   (p_modulo not in ('APR','OTROS') or p_selector not in
     ('shift','project','Resultado','Prioridad','Estado','owner','otherCategory','otherStatus')) then
   raise exception 'Selector no permitido';
 end if;
 if p_tipo='regimen' and (p_modulo is not null or p_selector is not null) then
   raise exception 'El turno habitual es independiente de APR y OTROS';
 end if;
 v:=btrim(coalesce(p_valor,''));
 if p_tipo='regimen' then
  v:=upper(regexp_replace(v,'[[:space:]]+','','g'));
  if v !~ '^[1-9][0-9]{0,2}X[1-9][0-9]{0,2}$' then
    raise exception 'Formato inválido; utiliza 5x2, 4x3, 10x5 u otro régimen válido';
  end if;
 elsif char_length(v)<1 or char_length(v)>150 then
   raise exception 'Nombre requerido, hasta 150 caracteres';
 end if;
 v_motivo:=btrim(coalesce(p_motivo,''));
 if char_length(v_motivo)<10 or char_length(v_motivo)>400 then
   raise exception 'El motivo debe contener de 10 a 400 caracteres';
 end if;
 -- Exclusión serializable de duplicados, incluyendo opciones inactivas.
 perform pg_advisory_xact_lock(hashtextextended('hys282_catalogo:'||p_tipo||':'||coalesce(p_modulo,'global')||':'||coalesce(p_selector,''),0));
 if p_tipo='area' then
  if exists(select 1 from public.areas_trabajo_v242 x where x.modulo=p_modulo
    and lower(btrim(x.nombre))=lower(v) and (p_id is null or x.id<>p_id)) then
    raise exception 'Área duplicada: puedes reactivar la opción existente';
  end if;
  if p_id is null then
    if p_revision is not null then raise exception 'Revisión inesperada en alta';end if;
    insert into public.areas_trabajo_v242(modulo,nombre,activa,actualizado_en)
     values(p_modulo,v,p_activo,clock_timestamp()) returning * into na;
  else
    select * into va from public.areas_trabajo_v242 where id=p_id for update;
    if not found or va.modulo<>p_modulo then raise exception 'Área inexistente en este módulo';end if;
    if p_revision is null or va.actualizado_en is distinct from p_revision::timestamptz then
      raise exception 'El área cambió. Actualiza antes de guardar' using errcode='40001';
    end if;
    if not p_activo and va.activa and not exists(
      select 1 from public.areas_trabajo_v242 x
      where x.modulo=p_modulo and x.id<>p_id and x.activa
    ) then raise exception 'Debe mantenerse al menos un área activa en el módulo';end if;
    update public.areas_trabajo_v242
      set nombre=v,activa=p_activo,actualizado_en=clock_timestamp()
      where id=p_id returning * into na;
  end if;
  -- La auditoría histórica área_audit_v242 existente se ejecuta automáticamente.
  v_id:=na.id;
  v_old:=case when va.id is null then null else
   jsonb_build_object('nombre',va.nombre,'activa',va.activa) end;
  v_new:=jsonb_build_object('nombre',na.nombre,'activa',na.activa);
 elsif p_tipo='lista' then
  if exists(select 1 from public.listas_v242 x where x.modulo=p_modulo
   and x.campo=p_selector and lower(btrim(x.valor))=lower(v)
   and (p_id is null or x.id<>p_id)) then
    raise exception 'La opción ya existe en esta lista; puedes reactivarla';
  end if;
  if p_id is null then
    if p_revision is not null then raise exception 'Revisión inesperada en alta';end if;
    insert into public.listas_v242(modulo,campo,valor,activa,actualizado_en)
     values(p_modulo,p_selector,v,p_activo,clock_timestamp()) returning * into nl;
  else
    select * into vl from public.listas_v242 where id=p_id for update;
    if not found or vl.modulo<>p_modulo or vl.campo<>p_selector then
     raise exception 'Opción no encontrada en el selector';
    end if;
    if p_revision is null or vl.actualizado_en is distinct from p_revision::timestamptz then
     raise exception 'La opción cambió. Actualiza antes de guardar' using errcode='40001';
    end if;
    if not p_activo and vl.activa and not exists(
     select 1 from public.listas_v242 x where x.modulo=p_modulo
      and x.campo=p_selector and x.id<>p_id and x.activa
    ) then raise exception 'Debe mantenerse una opción activa en el selector';end if;
    update public.listas_v242
     set valor=v,activa=p_activo,actualizado_en=clock_timestamp()
     where id=p_id returning * into nl;
  end if;
  v_id:=nl.id;
  v_old:=case when vl.id is null then null else
   jsonb_build_object('valor',vl.valor,'activa',vl.activa) end;
  v_new:=jsonb_build_object('valor',nl.valor,'activa',nl.activa);
 else
  if exists(select 1 from public.regimenes_laborales_v281 x
    where x.codigo=v and (p_id is null or x.id<>p_id)) then
    raise exception 'Este régimen ya existe; puedes reactivarlo';
  end if;
  if p_id is null then
    if p_revision is not null then raise exception 'Revisión inesperada en alta';end if;
    insert into public.regimenes_laborales_v281(codigo,activo,revision,actualizado_en)
     values(v,p_activo,1,clock_timestamp()) returning * into nr;
  else
    select * into vr from public.regimenes_laborales_v281 where id=p_id for update;
    if not found then raise exception 'Régimen inexistente';end if;
    if p_revision is null or vr.revision is distinct from p_revision::integer then
     raise exception 'El régimen cambió. Actualiza antes de guardar' using errcode='40001';
    end if;
    if not p_activo and vr.activo and not exists(
     select 1 from public.regimenes_laborales_v281 x
      where x.id<>p_id and x.activo
    ) then raise exception 'Debe mantenerse un régimen laboral activo';end if;
    update public.regimenes_laborales_v281
     set codigo=v,activo=p_activo,revision=revision+1,
       actualizado_en=clock_timestamp()
     where id=p_id returning * into nr;
  end if;
  v_id:=nr.id;
  v_old:=case when vr.id is null then null else
   jsonb_build_object('codigo',vr.codigo,'activo',vr.activo,'revision',vr.revision) end;
  v_new:=jsonb_build_object('codigo',nr.codigo,'activo',nr.activo,'revision',nr.revision);
 end if;
 insert into public.eventos_v242(
  actor_id,actor_nombre,accion,modulo,entidad,motivo,anterior,nuevo
 ) values(
  a.usuario_id,a.nombre,'CATALOGO_V282',
  case when p_tipo='regimen' then null else p_modulo end,
  v_id::text,
  p_tipo||' / '||coalesce(p_selector,'')||' / '||v_motivo,
  v_old,v_new
 );
 return jsonb_build_object('id',v_id,'tipo',p_tipo,'modulo',p_modulo,
  'selector',p_selector,'valor',v,'activo',p_activo);
end;
$v282$;

revoke all on function public.hys282_catalogo_mutar(text,text,text,uuid,text,boolean,text,text)
 from public,anon;
grant execute on function public.hys282_catalogo_mutar(text,text,text,uuid,text,boolean,text,text)
 to authenticated;
commit;
