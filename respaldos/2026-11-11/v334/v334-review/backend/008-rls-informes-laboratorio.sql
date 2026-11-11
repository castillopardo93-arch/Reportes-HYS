-- Solo para PGlite local. El servidor establece test.usuario tras validar la sesión HTTP.
begin;
create role hys323_report_user nologin;
create table hys318_lab.accesos_informes (
  usuario uuid not null references public.perfiles(usuario_id),
  modulo text not null check (modulo in ('APR','OTROS')),
  editar boolean not null,
  consulta_general boolean not null,
  primary key (usuario, modulo)
);
revoke all on hys318_lab.accesos_informes from public, anon, authenticated, hys323_report_user;
insert into hys318_lab.accesos_informes values
 ('00000000-0000-4000-8000-000000000001','APR',true,false),
 ('00000000-0000-4000-8000-000000000001','OTROS',true,false),
 ('00000000-0000-4000-8000-000000000002','APR',false,true),
 ('00000000-0000-4000-8000-000000000004','APR',true,false);

create function hys318_lab.permite_informe(p_actor uuid,p_modulo text,p_cerrado boolean,p_escritura boolean)
returns boolean
language sql stable security definer set search_path=''
as $$
 select exists (
   select 1
   from hys318_lab.accesos_informes a
   join public.perfiles p on p.usuario_id=a.usuario
   where a.usuario=auth.uid() and p.activo is true and a.modulo=p_modulo
     and ((a.editar and a.usuario=p_actor)
          or (not p_escritura and p_cerrado and a.consulta_general))
 )
$$;
revoke all on function hys318_lab.permite_informe(uuid,text,boolean,boolean) from public, anon, authenticated;
grant usage on schema hys318_lab to hys323_report_user;
grant execute on function hys318_lab.permite_informe(uuid,text,boolean,boolean) to hys323_report_user;
grant select,insert,update on hys318_lab.borradores to hys323_report_user;

create policy hys323_lectura on hys318_lab.borradores
 for select to hys323_report_user
 using (hys318_lab.permite_informe(actor,payload->>'module',cerrado is not null,false));

create policy hys323_creacion on hys318_lab.borradores
 for insert to hys323_report_user
 with check (cerrado is null and payload->>'status'='En edición'
  and payload->>'authenticatedUser'=actor::text
  and hys318_lab.permite_informe(actor,payload->>'module',false,true));

create policy hys323_actualizacion on hys318_lab.borradores
 for update to hys323_report_user
 using (cerrado is null and hys318_lab.permite_informe(actor,payload->>'module',false,true))
 with check (payload->>'authenticatedUser'=actor::text
  and payload->>'status'=case when cerrado is null then 'En edición' else 'Finalizado' end
  and hys318_lab.permite_informe(actor,payload->>'module',cerrado is not null,true));
create function hys318_lab.proteger_identidad_informe()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.actor is distinct from old.actor
    or new.id is distinct from old.id
    or (new.payload->>'module') is distinct from (old.payload->>'module') then
  raise exception 'No se puede cambiar la identidad ni la tarjeta del informe.' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function hys318_lab.proteger_identidad_informe() from public, anon, authenticated;
create trigger hys323_identidad_informe before update on hys318_lab.borradores
 for each row execute function hys318_lab.proteger_identidad_informe();
commit;
