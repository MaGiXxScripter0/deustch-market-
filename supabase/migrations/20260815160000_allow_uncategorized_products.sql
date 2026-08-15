alter table public.products
  drop constraint products_category_id_fkey,
  alter column category_id drop not null,
  add constraint products_category_id_fkey
    foreign key (category_id) references public.categories (id) on delete set null;
