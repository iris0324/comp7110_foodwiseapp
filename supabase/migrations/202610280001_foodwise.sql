begin;
alter table public.food_items alter column quantity type numeric using quantity::numeric;
alter table public.food_items alter column user_id set default auth.uid();
alter table public.food_items add column if not exists client_id text default gen_random_uuid()::text;
alter table public.food_items add column if not exists extra jsonb not null default '{}'::jsonb;
-- Some manually-created int8 PKs have no identity/default sequence.
do $$ declare d text; ident text; begin
 select column_default,is_identity into d,ident from information_schema.columns where table_schema='public' and table_name='food_items' and column_name='id';
 if d is null and ident='NO' then
 create sequence public.foodwise_food_id_seq owned by public.food_items.id;
 perform setval('public.foodwise_food_id_seq',greatest(coalesce((select max(id) from public.food_items),0)+1,1),false);
 alter table public.food_items alter column id set default nextval('public.foodwise_food_id_seq');
 end if;
end $$;
create unique index if not exists food_items_user_client_idx on public.food_items(user_id,client_id);
create index if not exists food_items_user_expiry_idx on public.food_items(user_id,expiry_date);
create index if not exists food_items_user_category_idx on public.food_items(user_id,category);
-- Preserve legacy unowned/orphan rows; new writes must have a valid owner.
alter table public.food_items add constraint food_items_owner_fk foreign key(user_id) references auth.users(id) on delete cascade not valid;
alter table public.food_items add constraint food_items_owner_required check(user_id is not null) not valid;
create table public.foodwise_state(user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),state jsonb not null,updated_at timestamptz not null default now());
create table public.foodwise_media(user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),id text not null,mime_type text not null,data text not null,primary key(user_id,id),check(length(data)<=14000000));
grant usage on schema public to authenticated;
do $$ declare t text; p record; seq text; begin
 foreach t in array array['food_items','foodwise_state','foodwise_media'] loop
 execute format('alter table public.%I enable row level security',t);
 for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',p.policyname,t);end loop;
 execute format('revoke all on public.%I from anon,authenticated,public',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
 end loop;
 seq:=pg_get_serial_sequence('public.food_items','id');if seq is not null then execute format('grant usage,select on sequence %s to authenticated',seq);end if;
end $$;
create function public.foodwise_load(initial_state jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s jsonb; foods jsonb; begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 insert into public.foodwise_state(user_id,state) values(auth.uid(),initial_state-'foodItems') on conflict(user_id) do nothing;
 select state into s from public.foodwise_state where user_id=auth.uid() for update;
 select coalesce(jsonb_agg(f.extra||jsonb_build_object('id',f.client_id,'name',f.name,'quantity',f.quantity::text,'initialQuantity',coalesce(f.extra->>'initialQuantity',f.quantity::text),'remainingQuantity',f.quantity::text,'unit',coalesce(f.unit,''),'category',coalesce(f.category,'other'),'recordedDate',coalesce(f.expiry_date::text,''),'notes',coalesce(f.notes,''),'createdAt',coalesce(f.created_at,now()),'status',coalesce(f.extra->>'status','available'),'source',coalesce(f.extra->>'source','manual'),'location',coalesce(f.extra->>'location',''),'planDate',coalesce(f.extra->>'planDate',''),'isStarred',coalesce((f.extra->>'isStarred')::boolean,false)) order by f.id),'[]'::jsonb) into foods from public.food_items f where f.user_id=auth.uid();
 return s||jsonb_build_object('foodItems',foods);
end $$;
create function public.foodwise_save(expected_revision bigint,expected_epoch text,next_state jsonb,uploads jsonb default '[]',clear_media boolean default false) returns void language plpgsql security invoker set search_path='' as $$
declare s jsonb; f jsonb; m jsonb; begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 select state into s from public.foodwise_state where user_id=auth.uid() for update;
 if s is null or (s->>'revision')::bigint<>expected_revision or s->>'epoch'<>expected_epoch then raise exception 'conflict';end if;
 if (next_state->>'revision')::bigint<>expected_revision+1 or jsonb_typeof(next_state->'foodItems')<>'array' then raise exception 'invalid state';end if;
 for f in select value from jsonb_array_elements(next_state->'foodItems') loop
 insert into public.food_items(user_id,client_id,name,quantity,expiry_date,category,unit,notes,created_at,extra) values(auth.uid(),f->>'id',f->>'name',(f->>'remainingQuantity')::numeric,nullif(f->>'recordedDate','')::date,f->>'category',f->>'unit',f->>'notes',coalesce((f->>'createdAt')::timestamptz,now()),f)
 on conflict(user_id,client_id) do update set name=excluded.name,quantity=excluded.quantity,expiry_date=excluded.expiry_date,category=excluded.category,unit=excluded.unit,notes=excluded.notes,extra=excluded.extra;
 end loop;
 delete from public.food_items where user_id=auth.uid() and client_id not in(select value->>'id' from jsonb_array_elements(next_state->'foodItems'));
 if clear_media then delete from public.foodwise_media where user_id=auth.uid();end if;
 for m in select value from jsonb_array_elements(uploads) loop
 insert into public.foodwise_media(user_id,id,mime_type,data) values(auth.uid(),m->>'id',m->>'type',m->>'data') on conflict(user_id,id) do update set mime_type=excluded.mime_type,data=excluded.data;
 end loop;
 update public.foodwise_state set state=next_state-'foodItems',updated_at=now() where user_id=auth.uid();
end $$;
revoke all on function public.foodwise_load(jsonb) from public,anon;
revoke all on function public.foodwise_save(bigint,text,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.foodwise_load(jsonb) to authenticated;
grant execute on function public.foodwise_save(bigint,text,jsonb,jsonb,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
