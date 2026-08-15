insert into public.profiles (id, full_name, phone, role)
select
  id,
  raw_user_meta_data ->> 'full_name',
  raw_user_meta_data ->> 'phone',
  'customer'::public.profile_role
from auth.users
on conflict (id) do nothing;
