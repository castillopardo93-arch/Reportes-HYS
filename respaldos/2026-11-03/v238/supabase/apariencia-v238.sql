-- Apariencia compartida exclusiva de v238; datos e informes no se alteran.
begin;
create table public.apariencia_v238(
 id smallint primary key default 1 check(id=1),config jsonb not null default '{}'::jsonb,
 revision integer not null default 0 check(revision>=0),actualizado_en timestamptz not null default now(),
 actor_id uuid references public.perfiles(usuario_id),actor_nombre text);
create table public.historial_apariencia_v238(
 revision integer primary key,config jsonb not null,fecha timestamptz not null default now(),
 actor_id uuid references public.perfiles(usuario_id),actor_nombre text not null);
create index historial_apariencia_v238_actor on public.historial_apariencia_v238(actor_id);
create index apariencia_v238_actor on public.apariencia_v238(actor_id);
insert into public.apariencia_v238(id,config) values(1,'{}');
insert into public.historial_apariencia_v238(revision,config,actor_nombre) values(0,'{}','Apariencia original de v238');
alter table public.apariencia_v238 enable row level security;
alter table public.historial_apariencia_v238 enable row level security;
revoke all on public.apariencia_v238,public.historial_apariencia_v238 from public,anon,authenticated;
grant select on public.apariencia_v238,public.historial_apariencia_v238 to authenticated;
grant update(config) on public.apariencia_v238 to authenticated;
create policy apariencia_read_v238 on public.apariencia_v238 for select to authenticated using((select hys238_private.allowed('APR','read')) or (select hys238_private.allowed('OTROS','read')));
create policy apariencia_update_v238 on public.apariencia_v238 for update to authenticated using((select hys238_private.allowed('APR','global'))) with check((select hys238_private.allowed('APR','global')));
create policy apariencia_history_read_v238 on public.historial_apariencia_v238 for select to authenticated using((select hys238_private.allowed('APR','global')));
create function hys238_private.valid_appearance(c jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; v jsonb;
begin
 if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>260000 then return false;end if;
 for k,v in select * from jsonb_each(c) loop
  if k not in ('preset','colors','icons','text','fontSize','spacing','radius','logo') then return false;end if;
  if k='preset' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('corporativo','claro','contraste','personalizado')) then return false;end if;
  if k='fontSize' and (jsonb_typeof(v)<>'number' or (v#>>'{}')::numeric not between 12 and 18) then return false;end if;
  if k='radius' and (jsonb_typeof(v)<>'number' or (v#>>'{}')::numeric not in (0,8,12,16,24)) then return false;end if;
  if k='spacing' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('compacto','normal','amplio')) then return false;end if;
  if k='logo' and (jsonb_typeof(v)<>'string' or length(v#>>'{}')>220000 or (v#>>'{}'<>'' and v#>>'{}' !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$')) then return false;end if;
 end loop;
 for k in select unnest(array['colors','icons','text']) loop
  if c?k and jsonb_typeof(c->k)<>'object' then return false;end if;
 end loop;
 for k,v in select * from jsonb_each(coalesce(c->'colors','{}')) loop
  if k not in ('background','surface','header','sidebar','primary','secondary','text','muted','border','activities','inspections','findings','active') or jsonb_typeof(v)<>'string' or v#>>'{}' !~ '^#[0-9a-fA-F]{6}$' then return false;end if;
 end loop;
 for k,v in select * from jsonb_each(coalesce(c->'icons','{}')) loop
  if k not in ('APR','OTROS','brand','inicio','informe','historial','config','activities','inspections','findings') or jsonb_typeof(v)<>'string' or v#>>'{}' not in ('shield','clipboard','helmet','users','alert','briefcase','check','tools','leaf','building','star','settings','palette','home','report','history','search') then return false;end if;
 end loop;
 for k,v in select * from jsonb_each(coalesce(c->'text','{}')) loop
  if k not in ('company','title','APR','OTROS','descriptionAPR','descriptionOTROS') or jsonb_typeof(v)<>'string' or length(v#>>'{}')>180 then return false;end if;
  if k in ('title','APR','OTROS') and length(btrim(v#>>'{}'))<1 then return false;end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function hys238_private.valid_appearance(jsonb) from public,anon;
grant execute on function hys238_private.valid_appearance(jsonb) to authenticated;
alter table public.apariencia_v238 add constraint apariencia_valid_v238 check(hys238_private.valid_appearance(config));
create function hys238_private.appearance_update() returns trigger language plpgsql security definer set search_path='' as $$
declare actor public.perfiles;
begin
 if not hys238_private.allowed('APR','global') then raise exception 'Solo el Administrador Global puede modificar la apariencia' using errcode='42501';end if;
 if not hys238_private.valid_appearance(new.config) then raise exception 'Configuración de apariencia inválida' using errcode='22023';end if;
 select * into strict actor from public.perfiles where usuario_id=auth.uid() and activo and rol='administrador_global';
 new.id:=old.id;new.revision:=old.revision+1;new.actualizado_en:=clock_timestamp();new.actor_id:=actor.usuario_id;new.actor_nombre:=actor.nombre;
 return new;
end $$;
create function hys238_private.appearance_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.historial_apariencia_v238(revision,config,fecha,actor_id,actor_nombre) values(new.revision,new.config,new.actualizado_en,new.actor_id,new.actor_nombre);
 return new;
end $$;
revoke all on function hys238_private.appearance_update(),hys238_private.appearance_history() from public,anon,authenticated;
create trigger apariencia_update_v238 before update on public.apariencia_v238 for each row execute function hys238_private.appearance_update();
create trigger apariencia_history_v238 after update on public.apariencia_v238 for each row execute function hys238_private.appearance_history();
commit;

