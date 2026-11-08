-- Reportes HYS · v279 · PROPUESTA ACTUALIZADA v281, NO EJECUTADA.
-- Requiere revisión, aprobación explícita y respaldo antes de tocar Supabase.
-- Solo datos laborales y catálogos; NO modifica Auth, roles, permisos ni informes.
begin;

create table if not exists public.fichas_laborales_v279 (
 usuario_id uuid primary key references public.perfiles(usuario_id) on delete restrict,
 trabajador jsonb not null default '{}'::jsonb check(jsonb_typeof(trabajador)='object'),
 revision integer not null default 1 check(revision>0),
 actualizado_en timestamptz not null default clock_timestamp(),
 actor_id uuid references public.perfiles(usuario_id) on delete restrict
);
alter table public.fichas_laborales_v279 enable row level security;
revoke all on table public.fichas_laborales_v279 from public, anon, authenticated;
grant select on public.fichas_laborales_v279 to authenticated;
drop policy if exists fichas_laborales_v279_select on public.fichas_laborales_v279;
create policy fichas_laborales_v279_select on public.fichas_laborales_v279
 for select to authenticated
 using (
   usuario_id=(select auth.uid())
   or exists(
     select 1 from public.perfiles actor
     where actor.usuario_id=(select auth.uid())
       and actor.activo and actor.rol='administrador_global'
   )
 );

create unique index if not exists hys279_documentos_unicos
on public.fichas_laborales_v279 ((trabajador->>'pais_documento'),(trabajador->>'rut'))
where coalesce(trabajador->>'rut','')<>'';

-- Reportes HYS v281 · SCRIPT COMPLETO DE INTEGRACIÓN PROPUESTO
-- Sustituye la propuesta v279: NO EJECUTADO, NO DESPLEGAR SIN AUTORIZACIÓN.
-- Los regímenes laborales del personal son independientes de listas_v242.shift.
-- La administración reutiliza solo el FORMATO visual de Áreas y opciones.

create table if not exists public.regimenes_laborales_v281(
 id uuid primary key default gen_random_uuid(),
 codigo text not null unique
   check(codigo ~ '^[1-9][0-9]{0,2}X[1-9][0-9]{0,2}
returns jsonb language sql stable security invoker set search_path=''
as $$
 select jsonb_build_object(
   'fichas',true,
   'turnos',true,
   'version',279,
   'authenticated',auth.uid() is not null
 )
$$;
revoke all on function public.hys279_capacidades() from public,anon;
grant execute on function public.hys279_capacidades() to authenticated;

create or replace function public.hys279_obtener_ficha(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor public.perfiles; v_target public.perfiles; v_ficha public.fichas_laborales_v279;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or not v_actor.activo
    or v_actor.rol<>'administrador_global'
    or not hys242_private.general_unico() then
   raise exception 'Solo el Administrador general puede consultar estas fichas' using errcode='42501';
 end if;
 select * into v_target from public.perfiles where usuario_id=p_usuario;
 if v_target.usuario_id is null then raise exception 'Usuario no encontrado' using errcode='P0002';end if;
 select * into v_ficha from public.fichas_laborales_v279 where usuario_id=p_usuario;
 return jsonb_build_object(
   'usuario_id',p_usuario,
   'revision',coalesce(v_ficha.revision,0),
   'trabajador',coalesce(v_ficha.trabajador,'{}'::jsonb)
 );
end;
$$;
revoke all on function public.hys279_obtener_ficha(uuid) from public,anon;
grant execute on function public.hys279_obtener_ficha(uuid) to authenticated;

create or replace function public.hys279_guardar_ficha(
 p_usuario uuid,p_datos jsonb,p_revision integer,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor public.perfiles;
 v_target public.perfiles;
 v_old public.fichas_laborales_v279;
 v_new public.fichas_laborales_v279;
 v_rut text;v_pais text;v_tipo text;v_corp text;v_personal text;v_cel text;
 v_preferencia text;v_codigo text;v_turno text;v_supervisor uuid;v_clean jsonb;
 v_raw text;v_body text;v_check text;v_expected text;v_sum int:=0;v_mul int:=2;v_k int;v_mod int;
 v_key text;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or v_actor.rol<>'administrador_global' or not v_actor.activo
   or not hys242_private.general_unico() then
  raise exception 'Operación exclusiva del Administrador general activo' using errcode='42501';
 end if;
 select * into v_target from public.perfiles where usuario_id=p_usuario;
 if v_target.usuario_id is null then raise exception 'Cuenta inexistente';end if;
 if p_revision is null or p_revision<0 or p_datos is null or jsonb_typeof(p_datos)<>'object'
    or length(btrim(coalesce(p_motivo,'')))<10 or length(p_motivo)>400 then
  raise exception 'Datos o motivo inválidos';
 end if;
 for v_key in select jsonb_object_keys(p_datos) loop
  if v_key <> all(array[
   'nombre','rut','pais_documento','tipo_documento','cargo','gerencia',
   'supervisor_id','celular','correo_personal','correo_corporativo','empresa',
   'proyecto','fecha_ingreso','estado_laboral','codigo_trabajador',
   'turno','preferencia_contacto'
  ]) then raise exception 'Campo no autorizado en la ficha: %',v_key;end if;
 end loop;
 if length(btrim(coalesce(p_datos->>'nombre','')))<5
   or length(p_datos->>'nombre')>150
   or length(btrim(coalesce(p_datos->>'cargo','')))<1
   or length(btrim(coalesce(p_datos->>'gerencia','')))<1
   or length(btrim(coalesce(p_datos->>'empresa','')))<1
   or length(btrim(coalesce(p_datos->>'proyecto','')))<1 then
  raise exception 'Información laboral incompleta';
 end if;
 v_pais:=btrim(coalesce(p_datos->>'pais_documento',''));
 v_tipo:=btrim(coalesce(p_datos->>'tipo_documento',''));
 v_rut:=upper(btrim(coalesce(p_datos->>'rut','')));
 if length(v_pais)<2 or length(v_pais)>80
   or v_tipo <> all(array['rut','ci','dni','pasaporte','otro']) then
  raise exception 'País o tipo de identificación inválido';
 end if;
 if v_tipo='rut' then
  if v_pais<>'Chile' then raise exception 'RUT aplica solamente a Chile';end if;
  v_raw:=regexp_replace(v_rut,'[.[:space:]-]','','g');
  if v_raw !~ '^[0-9]{7,8}[0-9K]$' then raise exception 'Formato de RUT inválido';end if;
  v_body:=left(v_raw,length(v_raw)-1);
  for v_k in reverse length(v_body)..1 loop
   v_sum:=v_sum+substring(v_body from v_k for 1)::integer*v_mul;
   v_mul:=case when v_mul=7 then 2 else v_mul+1 end;
  end loop;
  v_mod:=11-(v_sum%11);
  v_expected:=case when v_mod=11 then '0' when v_mod=10 then 'K' else v_mod::text end;
  v_check:=right(v_raw,1);
  if v_expected<>v_check then raise exception 'Dígito verificador del RUT inválido';end if;
  v_rut:=v_body||'-'||v_check;
 elsif length(v_rut)<3 or length(v_rut)>40
    or v_rut !~ '^[A-Z0-9][A-Z0-9 ./-]*$' then
  raise exception 'Número de identificación inválido';
 end if;
 v_corp:=lower(btrim(coalesce(p_datos->>'correo_corporativo','')));
 v_personal:=lower(btrim(coalesce(p_datos->>'correo_personal','')));
 if v_corp='' and v_personal='' then raise exception 'Indica al menos un correo corporativo o personal';end if;
 if (v_corp<>'' and v_corp !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or (v_personal<>'' and v_personal !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or length(v_corp)>254 or length(v_personal)>254 then
  raise exception 'Correo electrónico inválido';
 end if;
 v_cel:=btrim(coalesce(p_datos->>'celular',''));
 if v_cel<>'' and (length(v_cel)>25 or v_cel !~ '^\+?[0-9][0-9 ()+-]{5,24}$') then
  raise exception 'Número de celular inválido';
 end if;
 v_preferencia:=coalesce(p_datos->>'preferencia_contacto','todas');
 if v_preferencia <> all(array['corporativo','personal','celular','todas'])
    or (v_preferencia='corporativo' and v_corp='')
    or (v_preferencia='personal' and v_personal='')
    or (v_preferencia='celular' and v_cel='') then
  raise exception 'Preferencia de contacto no compatible con los medios registrados';
 end if;
 if coalesce(p_datos->>'estado_laboral','') <> all(array['activo','suspendido','desvinculado']) then
   raise exception 'Estado laboral inválido';
 end if;
 if nullif(btrim(coalesce(p_datos->>'fecha_ingreso','')),'') is not null then
  if p_datos->>'fecha_ingreso' !~ '^\d{4}-\d{2}-\d{2}$'
     or to_char(to_date(p_datos->>'fecha_ingreso','YYYY-MM-DD'),'YYYY-MM-DD')<>p_datos->>'fecha_ingreso' then
   raise exception 'Fecha de ingreso inválida';
  end if;
 end if;
 v_turno:=btrim(coalesce(p_datos->>'turno',''));
 if v_turno<>'' and not exists(
  select 1 from public.regimenes_laborales_v281
  where codigo=upper(v_turno) and activo
 ) then raise exception 'Régimen laboral no habilitado';end if;
 if nullif(p_datos->>'supervisor_id','') is null then
  if p_usuario<>v_actor.usuario_id then raise exception 'Supervisor responsable obligatorio';end if;
  v_supervisor:=null;
 else
  v_supervisor:=(p_datos->>'supervisor_id')::uuid;
  if v_supervisor=p_usuario or not exists(
   select 1 from public.perfiles where usuario_id=v_supervisor and activo
  ) then raise exception 'Supervisor no válido';end if;
 end if;
 v_codigo:=btrim(coalesce(p_datos->>'codigo_trabajador',''));
 if v_codigo='' then v_codigo:=v_rut;end if;
 if length(v_codigo)>160 then raise exception 'Código interno demasiado largo';end if;
 -- Lock serializado para verificar duplicidad por documento y correo, incluso entre columnas.
 perform pg_advisory_xact_lock(hashtextextended('hys279_fichas_unique',0));
 if exists(
  select 1 from public.fichas_laborales_v279 f where f.usuario_id<>p_usuario
   and (
    (f.trabajador->>'pais_documento'=v_pais and f.trabajador->>'rut'=v_rut)
    or (v_corp<>'' and v_corp in (f.trabajador->>'correo_corporativo',f.trabajador->>'correo_personal'))
    or (v_personal<>'' and v_personal in (f.trabajador->>'correo_corporativo',f.trabajador->>'correo_personal'))
   )
 ) then raise exception 'El documento o correo ya pertenece a otra ficha';end if;
 v_clean:=jsonb_build_object(
  'nombre',btrim(p_datos->>'nombre'),
  'rut',v_rut,'pais_documento',v_pais,'tipo_documento',v_tipo,
  'cargo',btrim(p_datos->>'cargo'),'gerencia',btrim(p_datos->>'gerencia'),
  'empresa',btrim(p_datos->>'empresa'),'proyecto',btrim(p_datos->>'proyecto'),
  'supervisor_id',coalesce(v_supervisor::text,''),
  'celular',v_cel,'correo_corporativo',v_corp,'correo_personal',v_personal,
  'fecha_ingreso',coalesce(p_datos->>'fecha_ingreso',''),
  'estado_laboral',p_datos->>'estado_laboral',
  'codigo_trabajador',v_codigo,'turno',v_turno,
  'preferencia_contacto',v_preferencia
 );
 select * into v_old from public.fichas_laborales_v279
  where usuario_id=p_usuario for update;
 if coalesce(v_old.revision,0)<>p_revision then
  raise exception 'La ficha fue modificada. Recarga antes de guardar.' using errcode='40001';
 end if;
 if v_old.usuario_id is null then
  insert into public.fichas_laborales_v279(usuario_id,trabajador,revision,actualizado_en,actor_id)
  values(p_usuario,v_clean,1,clock_timestamp(),v_actor.usuario_id) returning * into v_new;
 else
  update public.fichas_laborales_v279 set trabajador=v_clean,
   revision=revision+1,actualizado_en=clock_timestamp(),actor_id=v_actor.usuario_id
  where usuario_id=p_usuario returning * into v_new;
 end if;
 -- El Administrador general puede corregir su nombre oficial sin alterar rol ni facultades.
 if p_usuario=v_actor.usuario_id and v_target.rol='administrador_global' then
  update public.perfiles set nombre=btrim(p_datos->>'nombre') where usuario_id=p_usuario;
 end if;
 insert into public.eventos_v242(actor_id,actor_nombre,accion,entidad,motivo,anterior,nuevo)
 values(v_actor.usuario_id,v_actor.nombre,'FICHA_LABORAL_V279',p_usuario::text,btrim(p_motivo),
   jsonb_build_object('revision',coalesce(v_old.revision,0),'documento_registrado',coalesce(v_old.trabajador->>'rut','')<>'','contactos_registrados',(coalesce(v_old.trabajador->>'correo_corporativo','')<>'') or (coalesce(v_old.trabajador->>'correo_personal','')<>'')),
   jsonb_build_object('revision',v_new.revision,'documento_registrado',true,'contactos_registrados',true)
 );
 return jsonb_build_object('usuario_id',p_usuario,'revision',v_new.revision,'trabajador',v_new.trabajador);
end;
$$;
revoke all on function public.hys279_guardar_ficha(uuid,jsonb,integer,text) from public,anon;
grant execute on function public.hys279_guardar_ficha(uuid,jsonb,integer,text) to authenticated;

create or replace function public.hys279_guardar_opcion(
 p_modulo text,p_campo text,p_id uuid,p_valor text,p_activa boolean,
 p_esperado timestamptz,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor public.perfiles;v_old public.listas_v242;v_new public.listas_v242;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or not v_actor.activo or v_actor.rol<>'administrador_global'
   or not hys242_private.general_unico() then
  raise exception 'Solo el Administrador general puede administrar listas' using errcode='42501';
 end if;
 if p_modulo <> all(array['APR','OTROS'])
   or p_campo <> all(array['shift','project','Resultado','Prioridad','Estado','otherCategory','otherStatus','owner'])
   or p_activa is null or length(btrim(coalesce(p_valor,'')))<1 or length(btrim(p_valor))>150
   or length(btrim(coalesce(p_motivo,'')))<10 or length(p_motivo)>400 then
  raise exception 'Datos de lista inválidos';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('hys279_option:'||p_modulo||':'||p_campo,0));
 if exists(
  select 1 from public.listas_v242
   where modulo=p_modulo and campo=p_campo and lower(btrim(valor))=lower(btrim(p_valor))
     and (p_id is null or id<>p_id)
 ) then raise exception 'La opción ya existe, incluso si está inactiva';end if;
 if p_id is null then
  if p_esperado is not null then raise exception 'Parámetro de revisión inválido';end if;
  insert into public.listas_v242(modulo,campo,valor,activa,actualizado_en)
   values(p_modulo,p_campo,btrim(p_valor),p_activa,clock_timestamp())
   returning * into v_new;
 else
  select * into v_old from public.listas_v242 where id=p_id for update;
  if v_old.id is null or v_old.modulo<>p_modulo or v_old.campo<>p_campo then
    raise exception 'La opción no existe en este selector';
  end if;
  if p_esperado is null or v_old.actualizado_en is distinct from p_esperado then
    raise exception 'La opción fue modificada por otra persona. Actualiza el catálogo.' using errcode='40001';
  end if;
  update public.listas_v242 set valor=btrim(p_valor),activa=p_activa,actualizado_en=clock_timestamp()
    where id=p_id returning * into v_new;
 end if;
 insert into public.eventos_v242(actor_id,actor_nombre,accion,modulo,entidad,motivo,anterior,nuevo)
 values(v_actor.usuario_id,v_actor.nombre,'LISTA_V279',p_modulo,v_new.id::text,btrim(p_motivo),
  case when v_old.id is null then null else jsonb_build_object('campo',v_old.campo,'valor',v_old.valor,'activa',v_old.activa) end,
  jsonb_build_object('campo',v_new.campo,'valor',v_new.valor,'activa',v_new.activa));
 return jsonb_build_object('id',v_new.id,'modulo',v_new.modulo,'campo',v_new.campo,
  'valor',v_new.valor,'activa',v_new.activa,'actualizado_en',v_new.actualizado_en);
end;
$$;
revoke all on function public.hys279_guardar_opcion(text,text,uuid,text,boolean,timestamptz,text)
  from public,anon;
grant execute on function public.hys279_guardar_opcion(text,text,uuid,text,boolean,timestamptz,text)
  to authenticated;

commit;
),
 activo boolean not null default true,
 revision integer not null default 1 check(revision>0),
 actualizado_en timestamptz not null default clock_timestamp()
);
alter table public.regimenes_laborales_v281 enable row level security;
revoke all on public.regimenes_laborales_v281 from public,anon,authenticated;
grant select on public.regimenes_laborales_v281 to authenticated;
drop policy if exists regimenes_laborales_v281_read on public.regimenes_laborales_v281;
create policy regimenes_laborales_v281_read on public.regimenes_laborales_v281
 for select to authenticated using(
  hys242_private.activo() and
   (activo or hys242_private.general_unico())
 );
-- Regímenes iniciales. Esta inserción se ejecutaría solo al aprobar la instalación.
insert into public.regimenes_laborales_v281(codigo)
values ('5X2'),('4X3'),('10X5'),('7X7')
on conflict(codigo) do nothing;

create or replace function public.hys281_capacidades()
returns jsonb language sql stable security invoker set search_path=''
as $
 select jsonb_build_object(
  'regimenes',true,'version',281,'authenticated',auth.uid() is not null
 )
$;
revoke all on function public.hys281_capacidades() from public,anon;
grant execute on function public.hys281_capacidades() to authenticated;

create or replace function public.hys281_guardar_regimen(
 p_id uuid,p_codigo text,p_activo boolean,p_revision integer,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $
declare
 actor public.perfiles;
 before_rec public.regimenes_laborales_v281;
 after_rec public.regimenes_laborales_v281;
 value text;
begin
 select * into actor from public.perfiles where usuario_id=auth.uid();
 if actor.usuario_id is null or actor.rol<>'administrador_global'
  or not actor.activo or not hys242_private.general_unico() then
  raise exception 'Solo el Administrador general administra regímenes laborales'
   using errcode='42501';
 end if;
 value:=upper(regexp_replace(coalesce(p_codigo,''),'\s+','','g'));
 if value !~ '^[1-9][0-9]{0,2}X[1-9][0-9]{0,2}
returns jsonb language sql stable security invoker set search_path=''
as $$
 select jsonb_build_object(
   'fichas',true,
   'turnos',true,
   'version',279,
   'authenticated',auth.uid() is not null
 )
$$;
revoke all on function public.hys279_capacidades() from public,anon;
grant execute on function public.hys279_capacidades() to authenticated;

create or replace function public.hys279_obtener_ficha(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor public.perfiles; v_target public.perfiles; v_ficha public.fichas_laborales_v279;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or not v_actor.activo
    or v_actor.rol<>'administrador_global'
    or not hys242_private.general_unico() then
   raise exception 'Solo el Administrador general puede consultar estas fichas' using errcode='42501';
 end if;
 select * into v_target from public.perfiles where usuario_id=p_usuario;
 if v_target.usuario_id is null then raise exception 'Usuario no encontrado' using errcode='P0002';end if;
 select * into v_ficha from public.fichas_laborales_v279 where usuario_id=p_usuario;
 return jsonb_build_object(
   'usuario_id',p_usuario,
   'revision',coalesce(v_ficha.revision,0),
   'trabajador',coalesce(v_ficha.trabajador,'{}'::jsonb)
 );
end;
$$;
revoke all on function public.hys279_obtener_ficha(uuid) from public,anon;
grant execute on function public.hys279_obtener_ficha(uuid) to authenticated;

create or replace function public.hys279_guardar_ficha(
 p_usuario uuid,p_datos jsonb,p_revision integer,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor public.perfiles;
 v_target public.perfiles;
 v_old public.fichas_laborales_v279;
 v_new public.fichas_laborales_v279;
 v_rut text;v_pais text;v_tipo text;v_corp text;v_personal text;v_cel text;
 v_preferencia text;v_codigo text;v_turno text;v_supervisor uuid;v_clean jsonb;
 v_raw text;v_body text;v_check text;v_expected text;v_sum int:=0;v_mul int:=2;v_k int;v_mod int;
 v_key text;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or v_actor.rol<>'administrador_global' or not v_actor.activo
   or not hys242_private.general_unico() then
  raise exception 'Operación exclusiva del Administrador general activo' using errcode='42501';
 end if;
 select * into v_target from public.perfiles where usuario_id=p_usuario;
 if v_target.usuario_id is null then raise exception 'Cuenta inexistente';end if;
 if p_revision is null or p_revision<0 or p_datos is null or jsonb_typeof(p_datos)<>'object'
    or length(btrim(coalesce(p_motivo,'')))<10 or length(p_motivo)>400 then
  raise exception 'Datos o motivo inválidos';
 end if;
 for v_key in select jsonb_object_keys(p_datos) loop
  if v_key <> all(array[
   'nombre','rut','pais_documento','tipo_documento','cargo','gerencia',
   'supervisor_id','celular','correo_personal','correo_corporativo','empresa',
   'proyecto','fecha_ingreso','estado_laboral','codigo_trabajador',
   'turno','preferencia_contacto'
  ]) then raise exception 'Campo no autorizado en la ficha: %',v_key;end if;
 end loop;
 if length(btrim(coalesce(p_datos->>'nombre','')))<5
   or length(p_datos->>'nombre')>150
   or length(btrim(coalesce(p_datos->>'cargo','')))<1
   or length(btrim(coalesce(p_datos->>'gerencia','')))<1
   or length(btrim(coalesce(p_datos->>'empresa','')))<1
   or length(btrim(coalesce(p_datos->>'proyecto','')))<1 then
  raise exception 'Información laboral incompleta';
 end if;
 v_pais:=btrim(coalesce(p_datos->>'pais_documento',''));
 v_tipo:=btrim(coalesce(p_datos->>'tipo_documento',''));
 v_rut:=upper(btrim(coalesce(p_datos->>'rut','')));
 if length(v_pais)<2 or length(v_pais)>80
   or v_tipo <> all(array['rut','ci','dni','pasaporte','otro']) then
  raise exception 'País o tipo de identificación inválido';
 end if;
 if v_tipo='rut' then
  if v_pais<>'Chile' then raise exception 'RUT aplica solamente a Chile';end if;
  v_raw:=regexp_replace(v_rut,'[.[:space:]-]','','g');
  if v_raw !~ '^[0-9]{7,8}[0-9K]$' then raise exception 'Formato de RUT inválido';end if;
  v_body:=left(v_raw,length(v_raw)-1);
  for v_k in reverse length(v_body)..1 loop
   v_sum:=v_sum+substring(v_body from v_k for 1)::integer*v_mul;
   v_mul:=case when v_mul=7 then 2 else v_mul+1 end;
  end loop;
  v_mod:=11-(v_sum%11);
  v_expected:=case when v_mod=11 then '0' when v_mod=10 then 'K' else v_mod::text end;
  v_check:=right(v_raw,1);
  if v_expected<>v_check then raise exception 'Dígito verificador del RUT inválido';end if;
  v_rut:=v_body||'-'||v_check;
 elsif length(v_rut)<3 or length(v_rut)>40
    or v_rut !~ '^[A-Z0-9][A-Z0-9 ./-]*$' then
  raise exception 'Número de identificación inválido';
 end if;
 v_corp:=lower(btrim(coalesce(p_datos->>'correo_corporativo','')));
 v_personal:=lower(btrim(coalesce(p_datos->>'correo_personal','')));
 if v_corp='' and v_personal='' then raise exception 'Indica al menos un correo corporativo o personal';end if;
 if (v_corp<>'' and v_corp !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or (v_personal<>'' and v_personal !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or length(v_corp)>254 or length(v_personal)>254 then
  raise exception 'Correo electrónico inválido';
 end if;
 v_cel:=btrim(coalesce(p_datos->>'celular',''));
 if v_cel<>'' and (length(v_cel)>25 or v_cel !~ '^\+?[0-9][0-9 ()+-]{5,24}$') then
  raise exception 'Número de celular inválido';
 end if;
 v_preferencia:=coalesce(p_datos->>'preferencia_contacto','todas');
 if v_preferencia <> all(array['corporativo','personal','celular','todas'])
    or (v_preferencia='corporativo' and v_corp='')
    or (v_preferencia='personal' and v_personal='')
    or (v_preferencia='celular' and v_cel='') then
  raise exception 'Preferencia de contacto no compatible con los medios registrados';
 end if;
 if coalesce(p_datos->>'estado_laboral','') <> all(array['activo','suspendido','desvinculado']) then
   raise exception 'Estado laboral inválido';
 end if;
 if nullif(btrim(coalesce(p_datos->>'fecha_ingreso','')),'') is not null then
  if p_datos->>'fecha_ingreso' !~ '^\d{4}-\d{2}-\d{2}$'
     or to_char(to_date(p_datos->>'fecha_ingreso','YYYY-MM-DD'),'YYYY-MM-DD')<>p_datos->>'fecha_ingreso' then
   raise exception 'Fecha de ingreso inválida';
  end if;
 end if;
 v_turno:=btrim(coalesce(p_datos->>'turno',''));
 if v_turno<>'' and not exists(
  select 1 from public.listas_v242
  where campo='shift' and valor=v_turno and activa
 ) then raise exception 'Turno no habilitado en el catálogo';end if;
 if nullif(p_datos->>'supervisor_id','') is null then
  if p_usuario<>v_actor.usuario_id then raise exception 'Supervisor responsable obligatorio';end if;
  v_supervisor:=null;
 else
  v_supervisor:=(p_datos->>'supervisor_id')::uuid;
  if v_supervisor=p_usuario or not exists(
   select 1 from public.perfiles where usuario_id=v_supervisor and activo
  ) then raise exception 'Supervisor no válido';end if;
 end if;
 v_codigo:=btrim(coalesce(p_datos->>'codigo_trabajador',''));
 if v_codigo='' then v_codigo:=v_rut;end if;
 if length(v_codigo)>160 then raise exception 'Código interno demasiado largo';end if;
 -- Lock serializado para verificar duplicidad por documento y correo, incluso entre columnas.
 perform pg_advisory_xact_lock(hashtextextended('hys279_fichas_unique',0));
 if exists(
  select 1 from public.fichas_laborales_v279 f where f.usuario_id<>p_usuario
   and (
    (f.trabajador->>'pais_documento'=v_pais and f.trabajador->>'rut'=v_rut)
    or (v_corp<>'' and v_corp in (f.trabajador->>'correo_corporativo',f.trabajador->>'correo_personal'))
    or (v_personal<>'' and v_personal in (f.trabajador->>'correo_corporativo',f.trabajador->>'correo_personal'))
   )
 ) then raise exception 'El documento o correo ya pertenece a otra ficha';end if;
 v_clean:=jsonb_build_object(
  'nombre',btrim(p_datos->>'nombre'),
  'rut',v_rut,'pais_documento',v_pais,'tipo_documento',v_tipo,
  'cargo',btrim(p_datos->>'cargo'),'gerencia',btrim(p_datos->>'gerencia'),
  'empresa',btrim(p_datos->>'empresa'),'proyecto',btrim(p_datos->>'proyecto'),
  'supervisor_id',coalesce(v_supervisor::text,''),
  'celular',v_cel,'correo_corporativo',v_corp,'correo_personal',v_personal,
  'fecha_ingreso',coalesce(p_datos->>'fecha_ingreso',''),
  'estado_laboral',p_datos->>'estado_laboral',
  'codigo_trabajador',v_codigo,'turno',v_turno,
  'preferencia_contacto',v_preferencia
 );
 select * into v_old from public.fichas_laborales_v279
  where usuario_id=p_usuario for update;
 if coalesce(v_old.revision,0)<>p_revision then
  raise exception 'La ficha fue modificada. Recarga antes de guardar.' using errcode='40001';
 end if;
 if v_old.usuario_id is null then
  insert into public.fichas_laborales_v279(usuario_id,trabajador,revision,actualizado_en,actor_id)
  values(p_usuario,v_clean,1,clock_timestamp(),v_actor.usuario_id) returning * into v_new;
 else
  update public.fichas_laborales_v279 set trabajador=v_clean,
   revision=revision+1,actualizado_en=clock_timestamp(),actor_id=v_actor.usuario_id
  where usuario_id=p_usuario returning * into v_new;
 end if;
 -- El Administrador general puede corregir su nombre oficial sin alterar rol ni facultades.
 if p_usuario=v_actor.usuario_id and v_target.rol='administrador_global' then
  update public.perfiles set nombre=btrim(p_datos->>'nombre') where usuario_id=p_usuario;
 end if;
 insert into public.eventos_v242(actor_id,actor_nombre,accion,entidad,motivo,anterior,nuevo)
 values(v_actor.usuario_id,v_actor.nombre,'FICHA_LABORAL_V279',p_usuario::text,btrim(p_motivo),
   jsonb_build_object('revision',coalesce(v_old.revision,0),'documento_registrado',coalesce(v_old.trabajador->>'rut','')<>'','contactos_registrados',(coalesce(v_old.trabajador->>'correo_corporativo','')<>'') or (coalesce(v_old.trabajador->>'correo_personal','')<>'')),
   jsonb_build_object('revision',v_new.revision,'documento_registrado',true,'contactos_registrados',true)
 );
 return jsonb_build_object('usuario_id',p_usuario,'revision',v_new.revision,'trabajador',v_new.trabajador);
end;
$$;
revoke all on function public.hys279_guardar_ficha(uuid,jsonb,integer,text) from public,anon;
grant execute on function public.hys279_guardar_ficha(uuid,jsonb,integer,text) to authenticated;

create or replace function public.hys279_guardar_opcion(
 p_modulo text,p_campo text,p_id uuid,p_valor text,p_activa boolean,
 p_esperado timestamptz,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor public.perfiles;v_old public.listas_v242;v_new public.listas_v242;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or not v_actor.activo or v_actor.rol<>'administrador_global'
   or not hys242_private.general_unico() then
  raise exception 'Solo el Administrador general puede administrar listas' using errcode='42501';
 end if;
 if p_modulo <> all(array['APR','OTROS'])
   or p_campo <> all(array['shift','project','Resultado','Prioridad','Estado','otherCategory','otherStatus','owner'])
   or p_activa is null or length(btrim(coalesce(p_valor,'')))<1 or length(btrim(p_valor))>150
   or length(btrim(coalesce(p_motivo,'')))<10 or length(p_motivo)>400 then
  raise exception 'Datos de lista inválidos';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('hys279_option:'||p_modulo||':'||p_campo,0));
 if exists(
  select 1 from public.listas_v242
   where modulo=p_modulo and campo=p_campo and lower(btrim(valor))=lower(btrim(p_valor))
     and (p_id is null or id<>p_id)
 ) then raise exception 'La opción ya existe, incluso si está inactiva';end if;
 if p_id is null then
  if p_esperado is not null then raise exception 'Parámetro de revisión inválido';end if;
  insert into public.listas_v242(modulo,campo,valor,activa,actualizado_en)
   values(p_modulo,p_campo,btrim(p_valor),p_activa,clock_timestamp())
   returning * into v_new;
 else
  select * into v_old from public.listas_v242 where id=p_id for update;
  if v_old.id is null or v_old.modulo<>p_modulo or v_old.campo<>p_campo then
    raise exception 'La opción no existe en este selector';
  end if;
  if p_esperado is null or v_old.actualizado_en is distinct from p_esperado then
    raise exception 'La opción fue modificada por otra persona. Actualiza el catálogo.' using errcode='40001';
  end if;
  update public.listas_v242 set valor=btrim(p_valor),activa=p_activa,actualizado_en=clock_timestamp()
    where id=p_id returning * into v_new;
 end if;
 insert into public.eventos_v242(actor_id,actor_nombre,accion,modulo,entidad,motivo,anterior,nuevo)
 values(v_actor.usuario_id,v_actor.nombre,'LISTA_V279',p_modulo,v_new.id::text,btrim(p_motivo),
  case when v_old.id is null then null else jsonb_build_object('campo',v_old.campo,'valor',v_old.valor,'activa',v_old.activa) end,
  jsonb_build_object('campo',v_new.campo,'valor',v_new.valor,'activa',v_new.activa));
 return jsonb_build_object('id',v_new.id,'modulo',v_new.modulo,'campo',v_new.campo,
  'valor',v_new.valor,'activa',v_new.activa,'actualizado_en',v_new.actualizado_en);
end;
$$;
revoke all on function public.hys279_guardar_opcion(text,text,uuid,text,boolean,timestamptz,text)
  from public,anon;
grant execute on function public.hys279_guardar_opcion(text,text,uuid,text,boolean,timestamptz,text)
  to authenticated;

commit;

  or p_activo is null
  or length(btrim(coalesce(p_motivo,'')))<10
  or length(p_motivo)>400 then
  raise exception 'Código o motivo de régimen laboral inválido';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('hys281_regimenes',0));
 if exists(
  select 1 from public.regimenes_laborales_v281
  where codigo=value and (p_id is null or id<>p_id)
 ) then raise exception 'El régimen laboral ya existe; puedes reactivarlo';end if;
 if p_id is null then
  if p_revision is not null then raise exception 'Revisión inválida para nueva opción';end if;
  insert into public.regimenes_laborales_v281(codigo,activo,revision,actualizado_en)
   values(value,p_activo,1,clock_timestamp()) returning * into after_rec;
 else
  select * into before_rec from public.regimenes_laborales_v281 where id=p_id for update;
  if before_rec.id is null then raise exception 'No se encontró el régimen laboral';end if;
  if p_revision is distinct from before_rec.revision then
   raise exception 'El régimen fue modificado. Actualiza antes de guardar.'
    using errcode='40001';
  end if;
  update public.regimenes_laborales_v281
  set codigo=value,activo=p_activo,revision=revision+1,actualizado_en=clock_timestamp()
  where id=p_id returning * into after_rec;
 end if;
 insert into public.eventos_v242(
  actor_id,actor_nombre,accion,entidad,motivo,anterior,nuevo
 ) values(
  actor.usuario_id,actor.nombre,'REGIMEN_LABORAL_V281',after_rec.id::text,
  btrim(p_motivo),
  case when before_rec.id is null then null else
   jsonb_build_object('codigo',before_rec.codigo,'activo',before_rec.activo,'revision',before_rec.revision) end,
  jsonb_build_object('codigo',after_rec.codigo,'activo',after_rec.activo,'revision',after_rec.revision)
 );
 return jsonb_build_object('id',after_rec.id,'codigo',after_rec.codigo,
  'activo',after_rec.activo,'revision',after_rec.revision,
  'actualizado_en',after_rec.actualizado_en);
end;
$;
revoke all on function public.hys281_guardar_regimen(uuid,text,boolean,integer,text)
 from public,anon;
grant execute on function public.hys281_guardar_regimen(uuid,text,boolean,integer,text)
 to authenticated;

create or replace function public.hys279_capacidades()
returns jsonb language sql stable security invoker set search_path=''
as $$
 select jsonb_build_object(
   'fichas',true,
   'turnos',true,
   'version',279,
   'authenticated',auth.uid() is not null
 )
$$;
revoke all on function public.hys279_capacidades() from public,anon;
grant execute on function public.hys279_capacidades() to authenticated;

create or replace function public.hys279_obtener_ficha(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor public.perfiles; v_target public.perfiles; v_ficha public.fichas_laborales_v279;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or not v_actor.activo
    or v_actor.rol<>'administrador_global'
    or not hys242_private.general_unico() then
   raise exception 'Solo el Administrador general puede consultar estas fichas' using errcode='42501';
 end if;
 select * into v_target from public.perfiles where usuario_id=p_usuario;
 if v_target.usuario_id is null then raise exception 'Usuario no encontrado' using errcode='P0002';end if;
 select * into v_ficha from public.fichas_laborales_v279 where usuario_id=p_usuario;
 return jsonb_build_object(
   'usuario_id',p_usuario,
   'revision',coalesce(v_ficha.revision,0),
   'trabajador',coalesce(v_ficha.trabajador,'{}'::jsonb)
 );
end;
$$;
revoke all on function public.hys279_obtener_ficha(uuid) from public,anon;
grant execute on function public.hys279_obtener_ficha(uuid) to authenticated;

create or replace function public.hys279_guardar_ficha(
 p_usuario uuid,p_datos jsonb,p_revision integer,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor public.perfiles;
 v_target public.perfiles;
 v_old public.fichas_laborales_v279;
 v_new public.fichas_laborales_v279;
 v_rut text;v_pais text;v_tipo text;v_corp text;v_personal text;v_cel text;
 v_preferencia text;v_codigo text;v_turno text;v_supervisor uuid;v_clean jsonb;
 v_raw text;v_body text;v_check text;v_expected text;v_sum int:=0;v_mul int:=2;v_k int;v_mod int;
 v_key text;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or v_actor.rol<>'administrador_global' or not v_actor.activo
   or not hys242_private.general_unico() then
  raise exception 'Operación exclusiva del Administrador general activo' using errcode='42501';
 end if;
 select * into v_target from public.perfiles where usuario_id=p_usuario;
 if v_target.usuario_id is null then raise exception 'Cuenta inexistente';end if;
 if p_revision is null or p_revision<0 or p_datos is null or jsonb_typeof(p_datos)<>'object'
    or length(btrim(coalesce(p_motivo,'')))<10 or length(p_motivo)>400 then
  raise exception 'Datos o motivo inválidos';
 end if;
 for v_key in select jsonb_object_keys(p_datos) loop
  if v_key <> all(array[
   'nombre','rut','pais_documento','tipo_documento','cargo','gerencia',
   'supervisor_id','celular','correo_personal','correo_corporativo','empresa',
   'proyecto','fecha_ingreso','estado_laboral','codigo_trabajador',
   'turno','preferencia_contacto'
  ]) then raise exception 'Campo no autorizado en la ficha: %',v_key;end if;
 end loop;
 if length(btrim(coalesce(p_datos->>'nombre','')))<5
   or length(p_datos->>'nombre')>150
   or length(btrim(coalesce(p_datos->>'cargo','')))<1
   or length(btrim(coalesce(p_datos->>'gerencia','')))<1
   or length(btrim(coalesce(p_datos->>'empresa','')))<1
   or length(btrim(coalesce(p_datos->>'proyecto','')))<1 then
  raise exception 'Información laboral incompleta';
 end if;
 v_pais:=btrim(coalesce(p_datos->>'pais_documento',''));
 v_tipo:=btrim(coalesce(p_datos->>'tipo_documento',''));
 v_rut:=upper(btrim(coalesce(p_datos->>'rut','')));
 if length(v_pais)<2 or length(v_pais)>80
   or v_tipo <> all(array['rut','ci','dni','pasaporte','otro']) then
  raise exception 'País o tipo de identificación inválido';
 end if;
 if v_tipo='rut' then
  if v_pais<>'Chile' then raise exception 'RUT aplica solamente a Chile';end if;
  v_raw:=regexp_replace(v_rut,'[.[:space:]-]','','g');
  if v_raw !~ '^[0-9]{7,8}[0-9K]$' then raise exception 'Formato de RUT inválido';end if;
  v_body:=left(v_raw,length(v_raw)-1);
  for v_k in reverse length(v_body)..1 loop
   v_sum:=v_sum+substring(v_body from v_k for 1)::integer*v_mul;
   v_mul:=case when v_mul=7 then 2 else v_mul+1 end;
  end loop;
  v_mod:=11-(v_sum%11);
  v_expected:=case when v_mod=11 then '0' when v_mod=10 then 'K' else v_mod::text end;
  v_check:=right(v_raw,1);
  if v_expected<>v_check then raise exception 'Dígito verificador del RUT inválido';end if;
  v_rut:=v_body||'-'||v_check;
 elsif length(v_rut)<3 or length(v_rut)>40
    or v_rut !~ '^[A-Z0-9][A-Z0-9 ./-]*$' then
  raise exception 'Número de identificación inválido';
 end if;
 v_corp:=lower(btrim(coalesce(p_datos->>'correo_corporativo','')));
 v_personal:=lower(btrim(coalesce(p_datos->>'correo_personal','')));
 if v_corp='' and v_personal='' then raise exception 'Indica al menos un correo corporativo o personal';end if;
 if (v_corp<>'' and v_corp !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or (v_personal<>'' and v_personal !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or length(v_corp)>254 or length(v_personal)>254 then
  raise exception 'Correo electrónico inválido';
 end if;
 v_cel:=btrim(coalesce(p_datos->>'celular',''));
 if v_cel<>'' and (length(v_cel)>25 or v_cel !~ '^\+?[0-9][0-9 ()+-]{5,24}$') then
  raise exception 'Número de celular inválido';
 end if;
 v_preferencia:=coalesce(p_datos->>'preferencia_contacto','todas');
 if v_preferencia <> all(array['corporativo','personal','celular','todas'])
    or (v_preferencia='corporativo' and v_corp='')
    or (v_preferencia='personal' and v_personal='')
    or (v_preferencia='celular' and v_cel='') then
  raise exception 'Preferencia de contacto no compatible con los medios registrados';
 end if;
 if coalesce(p_datos->>'estado_laboral','') <> all(array['activo','suspendido','desvinculado']) then
   raise exception 'Estado laboral inválido';
 end if;
 if nullif(btrim(coalesce(p_datos->>'fecha_ingreso','')),'') is not null then
  if p_datos->>'fecha_ingreso' !~ '^\d{4}-\d{2}-\d{2}$'
     or to_char(to_date(p_datos->>'fecha_ingreso','YYYY-MM-DD'),'YYYY-MM-DD')<>p_datos->>'fecha_ingreso' then
   raise exception 'Fecha de ingreso inválida';
  end if;
 end if;
 v_turno:=btrim(coalesce(p_datos->>'turno',''));
 if v_turno<>'' and not exists(
  select 1 from public.listas_v242
  where campo='shift' and valor=v_turno and activa
 ) then raise exception 'Turno no habilitado en el catálogo';end if;
 if nullif(p_datos->>'supervisor_id','') is null then
  if p_usuario<>v_actor.usuario_id then raise exception 'Supervisor responsable obligatorio';end if;
  v_supervisor:=null;
 else
  v_supervisor:=(p_datos->>'supervisor_id')::uuid;
  if v_supervisor=p_usuario or not exists(
   select 1 from public.perfiles where usuario_id=v_supervisor and activo
  ) then raise exception 'Supervisor no válido';end if;
 end if;
 v_codigo:=btrim(coalesce(p_datos->>'codigo_trabajador',''));
 if v_codigo='' then v_codigo:=v_rut;end if;
 if length(v_codigo)>160 then raise exception 'Código interno demasiado largo';end if;
 -- Lock serializado para verificar duplicidad por documento y correo, incluso entre columnas.
 perform pg_advisory_xact_lock(hashtextextended('hys279_fichas_unique',0));
 if exists(
  select 1 from public.fichas_laborales_v279 f where f.usuario_id<>p_usuario
   and (
    (f.trabajador->>'pais_documento'=v_pais and f.trabajador->>'rut'=v_rut)
    or (v_corp<>'' and v_corp in (f.trabajador->>'correo_corporativo',f.trabajador->>'correo_personal'))
    or (v_personal<>'' and v_personal in (f.trabajador->>'correo_corporativo',f.trabajador->>'correo_personal'))
   )
 ) then raise exception 'El documento o correo ya pertenece a otra ficha';end if;
 v_clean:=jsonb_build_object(
  'nombre',btrim(p_datos->>'nombre'),
  'rut',v_rut,'pais_documento',v_pais,'tipo_documento',v_tipo,
  'cargo',btrim(p_datos->>'cargo'),'gerencia',btrim(p_datos->>'gerencia'),
  'empresa',btrim(p_datos->>'empresa'),'proyecto',btrim(p_datos->>'proyecto'),
  'supervisor_id',coalesce(v_supervisor::text,''),
  'celular',v_cel,'correo_corporativo',v_corp,'correo_personal',v_personal,
  'fecha_ingreso',coalesce(p_datos->>'fecha_ingreso',''),
  'estado_laboral',p_datos->>'estado_laboral',
  'codigo_trabajador',v_codigo,'turno',v_turno,
  'preferencia_contacto',v_preferencia
 );
 select * into v_old from public.fichas_laborales_v279
  where usuario_id=p_usuario for update;
 if coalesce(v_old.revision,0)<>p_revision then
  raise exception 'La ficha fue modificada. Recarga antes de guardar.' using errcode='40001';
 end if;
 if v_old.usuario_id is null then
  insert into public.fichas_laborales_v279(usuario_id,trabajador,revision,actualizado_en,actor_id)
  values(p_usuario,v_clean,1,clock_timestamp(),v_actor.usuario_id) returning * into v_new;
 else
  update public.fichas_laborales_v279 set trabajador=v_clean,
   revision=revision+1,actualizado_en=clock_timestamp(),actor_id=v_actor.usuario_id
  where usuario_id=p_usuario returning * into v_new;
 end if;
 -- El Administrador general puede corregir su nombre oficial sin alterar rol ni facultades.
 if p_usuario=v_actor.usuario_id and v_target.rol='administrador_global' then
  update public.perfiles set nombre=btrim(p_datos->>'nombre') where usuario_id=p_usuario;
 end if;
 insert into public.eventos_v242(actor_id,actor_nombre,accion,entidad,motivo,anterior,nuevo)
 values(v_actor.usuario_id,v_actor.nombre,'FICHA_LABORAL_V279',p_usuario::text,btrim(p_motivo),
   jsonb_build_object('revision',coalesce(v_old.revision,0),'documento_registrado',coalesce(v_old.trabajador->>'rut','')<>'','contactos_registrados',(coalesce(v_old.trabajador->>'correo_corporativo','')<>'') or (coalesce(v_old.trabajador->>'correo_personal','')<>'')),
   jsonb_build_object('revision',v_new.revision,'documento_registrado',true,'contactos_registrados',true)
 );
 return jsonb_build_object('usuario_id',p_usuario,'revision',v_new.revision,'trabajador',v_new.trabajador);
end;
$$;
revoke all on function public.hys279_guardar_ficha(uuid,jsonb,integer,text) from public,anon;
grant execute on function public.hys279_guardar_ficha(uuid,jsonb,integer,text) to authenticated;

create or replace function public.hys279_guardar_opcion(
 p_modulo text,p_campo text,p_id uuid,p_valor text,p_activa boolean,
 p_esperado timestamptz,p_motivo text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor public.perfiles;v_old public.listas_v242;v_new public.listas_v242;
begin
 select * into v_actor from public.perfiles where usuario_id=auth.uid();
 if v_actor.usuario_id is null or not v_actor.activo or v_actor.rol<>'administrador_global'
   or not hys242_private.general_unico() then
  raise exception 'Solo el Administrador general puede administrar listas' using errcode='42501';
 end if;
 if p_modulo <> all(array['APR','OTROS'])
   or p_campo <> all(array['shift','project','Resultado','Prioridad','Estado','otherCategory','otherStatus','owner'])
   or p_activa is null or length(btrim(coalesce(p_valor,'')))<1 or length(btrim(p_valor))>150
   or length(btrim(coalesce(p_motivo,'')))<10 or length(p_motivo)>400 then
  raise exception 'Datos de lista inválidos';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('hys279_option:'||p_modulo||':'||p_campo,0));
 if exists(
  select 1 from public.listas_v242
   where modulo=p_modulo and campo=p_campo and lower(btrim(valor))=lower(btrim(p_valor))
     and (p_id is null or id<>p_id)
 ) then raise exception 'La opción ya existe, incluso si está inactiva';end if;
 if p_id is null then
  if p_esperado is not null then raise exception 'Parámetro de revisión inválido';end if;
  insert into public.listas_v242(modulo,campo,valor,activa,actualizado_en)
   values(p_modulo,p_campo,btrim(p_valor),p_activa,clock_timestamp())
   returning * into v_new;
 else
  select * into v_old from public.listas_v242 where id=p_id for update;
  if v_old.id is null or v_old.modulo<>p_modulo or v_old.campo<>p_campo then
    raise exception 'La opción no existe en este selector';
  end if;
  if p_esperado is null or v_old.actualizado_en is distinct from p_esperado then
    raise exception 'La opción fue modificada por otra persona. Actualiza el catálogo.' using errcode='40001';
  end if;
  update public.listas_v242 set valor=btrim(p_valor),activa=p_activa,actualizado_en=clock_timestamp()
    where id=p_id returning * into v_new;
 end if;
 insert into public.eventos_v242(actor_id,actor_nombre,accion,modulo,entidad,motivo,anterior,nuevo)
 values(v_actor.usuario_id,v_actor.nombre,'LISTA_V279',p_modulo,v_new.id::text,btrim(p_motivo),
  case when v_old.id is null then null else jsonb_build_object('campo',v_old.campo,'valor',v_old.valor,'activa',v_old.activa) end,
  jsonb_build_object('campo',v_new.campo,'valor',v_new.valor,'activa',v_new.activa));
 return jsonb_build_object('id',v_new.id,'modulo',v_new.modulo,'campo',v_new.campo,
  'valor',v_new.valor,'activa',v_new.activa,'actualizado_en',v_new.actualizado_en);
end;
$$;
revoke all on function public.hys279_guardar_opcion(text,text,uuid,text,boolean,timestamptz,text)
  from public,anon;
grant execute on function public.hys279_guardar_opcion(text,text,uuid,text,boolean,timestamptz,text)
  to authenticated;

commit;
