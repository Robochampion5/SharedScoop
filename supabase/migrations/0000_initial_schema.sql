create type membership_status as enum ('pending', 'approved', 'rejected');
create type membership_role as enum ('admin', 'member');
create type order_status as enum ('pooling', 'ordered', 'delivered');

create table public.users (
  id uuid references auth.users(id) primary key,
  full_name text,
  phone_number text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  pincode text not null,
  min_order_threshold numeric not null default 0,
  current_pool_balance numeric not null default 0,
  admin_user_id uuid references public.users(id) not null,
  whatsapp_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.memberships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  community_id uuid references public.communities(id) on delete cascade not null,
  status membership_status default 'pending' not null,
  role membership_role default 'member' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, community_id)
);

create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  wholesale_price numeric not null,
  retail_price numeric not null,
  image_url text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.orders (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  product_id uuid references public.products(id) not null,
  total_qty integer not null default 0,
  status order_status default 'pooling' not null,
  delivery_otp text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.user_contributions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  order_id uuid references public.orders(id) on delete cascade not null,
  amount_paid numeric not null default 0,
  qty_requested integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;
alter table public.communities enable row level security;
alter table public.memberships enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.user_contributions enable row level security;

-- Policies
create policy "Users can view all users" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

create policy "Anyone can view communities" on public.communities for select using (true);
create policy "Admins can create communities" on public.communities for insert with check (auth.uid() = admin_user_id);

create policy "Users can submit memberships" on public.memberships for insert with check (auth.uid() = user_id);
create policy "Users can see memberships in their communities" on public.memberships for select using (
  exists (select 1 from public.memberships m2 where m2.community_id = public.memberships.community_id and m2.user_id = auth.uid()) OR auth.uid() = user_id
);
create policy "Admins can update memberships" on public.memberships for update using (
  exists (select 1 from public.communities c where c.id = community_id and c.admin_user_id = auth.uid())
);

create policy "Anyone can view products" on public.products for select using (true);

create policy "Users can see orders for their communities" on public.orders for select using (
  exists (select 1 from public.memberships m where m.community_id = public.orders.community_id and m.user_id = auth.uid())
);
create policy "Admins can update orders" on public.orders for update using (
  exists (select 1 from public.communities c where c.id = community_id and c.admin_user_id = auth.uid())
);
create policy "Admins can create orders" on public.orders for insert with check (
  exists (select 1 from public.communities c where c.id = community_id and c.admin_user_id = auth.uid())
);
create policy "Users can update orders" on public.orders for update using (
   exists (select 1 from public.memberships m where m.community_id = public.orders.community_id and m.user_id = auth.uid())
);

create policy "Users can see contributions in their communities" on public.user_contributions for select using (
  exists (select 1 from public.orders o join public.memberships m on o.community_id = m.community_id where o.id = order_id and m.user_id = auth.uid())
);
create policy "Users can create their own contributions" on public.user_contributions for insert with check (
  auth.uid() = user_id
);

-- Trigger to increment current_pool_balance on contribution
create or replace function update_pool_balance() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set current_pool_balance = current_pool_balance + new.amount_paid
    where id = (select community_id from public.orders where id = new.order_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_contribution
  after insert on public.user_contributions
  for each row execute function update_pool_balance();

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
