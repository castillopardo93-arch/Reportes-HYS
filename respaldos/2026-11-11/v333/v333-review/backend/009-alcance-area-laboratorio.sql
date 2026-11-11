-- Las áreas de esta tabla corresponden al catálogo ficticio de la interfaz local.
begin;
create table hys318_lab.areas_acceso_informe (
 usuario uuid not null,
 modulo text not null,
 area text not null check (btrim(area) <> ''),
 primary key (usuario, modulo, area),
 foreign key (usuario, modulo) references hys318_lab.accesos_informes(usuario, modulo)
   on delete cascade
);
revoke all on hys318_lab.areas_acceso_informe from public, anon, authenticated, hys323_report_user;
insert into hys318_lab.areas_acceso_informe values
 ('00000000-0000-4000-8000-000000000001','APR','Eléctrica'),
 ('00000000-0000-4000-8000-000000000001','APR','Mecánica'),
 ('00000000-0000-4000-8000-000000000001','OTROS','Eléctrica'),
 ('00000000-0000-4000-8000-000000000001','OTROS','Mecánica'),
 ('00000000-0000-4000-8000-000000000002','APR','Eléctrica'),
 ('00000000-0000-4000-8000-000000000004','APR','Mecánica');

create function hys318_lab.permite_area_informe(p_modulo text,p_area text,p_borrador boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from hys318_lab.areas_acceso_informe a
  where a.usuario=auth.uid() and a.modulo=p_modulo
    and (a.area=p_area or (p_borrador and coalesce(btrim(p_area),'')=''))
 )
$$;
revoke all on function hys318_lab.permite_area_informe(text,text,boolean) from public, anon, authenticated;
grant execute on function hys318_lab.permite_area_informe(text,text,boolean) to hys323_report_user;

create policy hys325_alcance_area on hys318_lab.borradores
 as restrictive for all to hys323_report_user
 using (hys318_lab.permite_area_informe(payload->>'module',payload->>'area',cerrado is null))
 with check (hys318_lab.permite_area_informe(payload->>'module',payload->>'area',cerrado is null));
commit;
