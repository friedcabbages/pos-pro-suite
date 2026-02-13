-- Enable Supabase Realtime for F&B Cashier tables
-- Tables must be in supabase_realtime publication for postgres_changes to work

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_tables') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_tables;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_bills') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_bills;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_bill_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_bill_orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fnb_order_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fnb_order_items;
  END IF;
END $$;
