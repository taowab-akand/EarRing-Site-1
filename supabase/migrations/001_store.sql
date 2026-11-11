create extension if not exists pgcrypto;
create table public.admins(user_id uuid primary key references auth.users(id), created_at timestamptz not null default now());
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from admins where user_id=auth.uid())$$;
create table public.categories(id int primary key check(id between 1 and 4),name text not null,display_order int not null check(display_order between 1 and 4));
insert into categories values(1,'Stud Earrings',1),(2,'Hoop Earrings',2),(3,'Drop Earrings',3),(4,'Jhumka Earrings',4);
create table public.products(id uuid primary key default gen_random_uuid(),category_id int not null references categories(id),name text not null,sku text not null unique,description text not null default '',price numeric(12,2) not null check(price>=0),sale_price numeric(12,2) check(sale_price>=0 and sale_price<price),material text not null default '',color text not null default '',dimensions text not null default '',stock int not null default 0 check(stock>=0),active boolean not null default false,featured boolean not null default false,is_new boolean not null default false,bestseller boolean not null default false,images text[] not null default '{}',created_at timestamptz not null default now());
create table public.settings(key text primary key,value text not null);
insert into settings values ('store_name','EarRing'),('inside_dhaka','80'),('outside_dhaka','130');
create table public.customers(id uuid primary key default gen_random_uuid(),normalized_phone text not null unique check(normalized_phone ~ '^01[3-9][0-9]{8}$'),display_phone text not null,latest_name text not null,latest_address text not null,first_order_at timestamptz not null default now(),last_order_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.orders(id uuid primary key default gen_random_uuid(),reference text not null unique default ('ER-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),idempotency_key uuid not null unique,customer_id uuid not null references customers(id),name text not null,phone text not null,address text not null,area text not null check(area in ('inside_dhaka','outside_dhaka')),subtotal numeric(12,2) not null,delivery numeric(12,2) not null,total numeric(12,2) not null,payment text not null check(payment in ('cod','bkash','nagad')),payment_status text not null default 'unverified' check(payment_status in ('unverified','paid','refunded')),transaction_ref text, status text not null default 'pending' check(status in ('pending','confirmed','shipped','delivered','cancelled')),note text,admin_notes text not null default '',created_at timestamptz not null default now());
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders(id),product_id uuid not null references products(id),name text not null,sku text not null,unit_price numeric(12,2) not null,quantity int not null check(quantity>0),subtotal numeric(12,2) not null);
create index on orders(customer_id,created_at desc);
create index on products(category_id) where active;
alter table admins enable row level security;alter table categories enable row level security;alter table products enable row level security;alter table settings enable row level security;alter table customers enable row level security;alter table orders enable row level security;alter table order_items enable row level security;
create policy admin_self on admins for select to authenticated using(user_id=auth.uid());
create policy catalog_read on products for select using(active or is_admin());
create policy catalog_admin on products for all to authenticated using(is_admin()) with check(is_admin());
create policy category_read on categories for select using(true);
create policy category_update on categories for update to authenticated using(is_admin()) with check(is_admin());
create policy settings_read on settings for select using(true);
create policy settings_admin on settings for all to authenticated using(is_admin()) with check(is_admin());
create policy customer_read on customers for select to authenticated using(is_admin());
create policy order_read on orders for select to authenticated using(is_admin());
create policy items_read on order_items for select to authenticated using(is_admin());
create function public.place_order(payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb; p products; customer uuid; oid uuid; ref text; phone text; subtotal numeric:=0; fee numeric; quantity int; existing orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(payload->>'idempotency_key',0));
 select * into existing from orders where idempotency_key=(payload->>'idempotency_key')::uuid;
 if found then return jsonb_build_object('reference',existing.reference); end if;
 phone:=regexp_replace(payload->>'phone','[^0-9]','','g');if phone like '880%' then phone:=substr(phone,3);end if;
 if phone !~ '^01[3-9][0-9]{8}$' then raise exception 'Invalid phone';end if;
 if jsonb_array_length(payload->'items')<1 or jsonb_array_length(payload->'items')>50 then raise exception 'Invalid cart';end if;
 if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(payload->'items') x) then raise exception 'Duplicate cart items';end if;
 select value::numeric into fee from settings where key=payload->>'area';if fee is null or fee<0 then raise exception 'Delivery unavailable';end if;
 if payload->>'payment'<>'cod' and not exists(select 1 from settings where key=payload->>'payment' and length(value)>0) then raise exception 'Payment unavailable';end if;
 for item in select value from jsonb_array_elements(payload->'items') order by value->>'id' loop
 select * into p from products where id=(item->>'id')::uuid for update;
 quantity:=(item->>'quantity')::int;
 if not found or not p.active or quantity<1 or quantity>p.stock then raise exception 'An item is unavailable. Please refresh your bag.';end if;
 subtotal:=subtotal+coalesce(p.sale_price,p.price)*quantity;
 end loop;
 insert into customers(normalized_phone,display_phone,latest_name,latest_address) values(phone,payload->>'phone',payload->>'name',payload->>'address') on conflict(normalized_phone) do update set latest_name=excluded.latest_name,latest_address=excluded.latest_address,display_phone=excluded.display_phone,last_order_at=now(),updated_at=now() returning id into customer;
 insert into orders(idempotency_key,customer_id,name,phone,address,area,subtotal,delivery,total,payment,transaction_ref,note) values((payload->>'idempotency_key')::uuid,customer,payload->>'name',phone,payload->>'address',payload->>'area',subtotal,fee,subtotal+fee,payload->>'payment',payload->>'transaction_ref',payload->>'note') returning id,reference into oid,ref;
 for item in select value from jsonb_array_elements(payload->'items') loop
 select * into p from products where id=(item->>'id')::uuid;quantity:=(item->>'quantity')::int;
 insert into order_items(order_id,product_id,name,sku,unit_price,quantity,subtotal) values(oid,p.id,p.name,p.sku,coalesce(p.sale_price,p.price),quantity,coalesce(p.sale_price,p.price)*quantity);
 update products set stock=stock-quantity where id=p.id;
 end loop;
 return jsonb_build_object('reference',ref);
end $$;
revoke all on function place_order(jsonb) from public,anon,authenticated;
grant execute on function place_order(jsonb) to service_role;
create function public.update_order(oid uuid,new_status text,new_payment text,notes text) returns void language plpgsql security definer set search_path=public as $$
declare old orders; item order_items; available int;
begin
 if not is_admin() then raise exception 'Forbidden';end if;
 select * into old from orders where id=oid for update;if not found then raise exception 'Order not found';end if;
 if old.status<>new_status and (old.status='cancelled' or new_status='cancelled') then
 for item in select * from order_items where order_id=oid order by product_id loop
 select stock into available from products where id=item.product_id for update;
 if old.status='cancelled' and available<item.quantity then raise exception 'Insufficient stock to restore order';end if;
 update products set stock=stock+case when new_status='cancelled' then item.quantity else -item.quantity end where id=item.product_id;
 end loop;end if;
 update orders set status=new_status,payment_status=new_payment,admin_notes=notes where id=oid;
end $$;
revoke all on function update_order(uuid,text,text,text) from public,anon;
grant execute on function update_order(uuid,text,text,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('products','products',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy image_read on storage.objects for select using(bucket_id='products');
create policy image_admin on storage.objects for all to authenticated using(bucket_id='products' and public.is_admin()) with check(bucket_id='products' and public.is_admin());
