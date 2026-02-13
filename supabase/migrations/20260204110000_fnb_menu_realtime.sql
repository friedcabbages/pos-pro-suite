-- Enable Supabase Realtime for F&B Menu tables
-- Tables must be in supabase_realtime publication for postgres_changes to work
-- Run: select to_regclass('public.fnb_modifier_groups'), to_regclass('public.fnb_modifiers'), to_regclass('public.fnb_product_modifier_groups'); to verify tables exist

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_modifier_groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_modifier_groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_modifiers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_modifiers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_product_modifier_groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_product_modifier_groups;
  END IF;
END $$;
