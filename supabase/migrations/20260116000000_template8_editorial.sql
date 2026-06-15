-- Template 8 « Audace » (heroStyle editorial) : étend la contrainte template_id à 1..8.
alter table public.restaurants drop constraint if exists restaurants_template_id_check;
alter table public.restaurants
  add constraint restaurants_template_id_check check (template_id >= 1 and template_id <= 8);
