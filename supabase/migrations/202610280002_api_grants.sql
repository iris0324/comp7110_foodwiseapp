-- Dashboard exposure toggles grant anon by default. Retain authenticated access.
begin;
revoke all on public.food_items,public.foodwise_state,public.foodwise_media from anon,public;
revoke all on function public.foodwise_load(jsonb) from anon,public;
revoke all on function public.foodwise_save(bigint,text,jsonb,jsonb,boolean) from anon,public;
notify pgrst,'reload schema';
commit;
