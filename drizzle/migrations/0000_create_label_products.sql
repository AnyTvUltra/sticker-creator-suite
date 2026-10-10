CREATE TABLE public.label_products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120), data jsonb NOT NULL DEFAULT '{}'::jsonb, layout jsonb NOT NULL DEFAULT '[]'::jsonb, theme text NOT NULL DEFAULT 'mint', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_products TO authenticated;
GRANT ALL ON public.label_products TO service_role;
ALTER TABLE public.label_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own products" ON public.label_products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Create own products" ON public.label_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Edit own products" ON public.label_products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own products" ON public.label_products FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX label_products_owner_idx ON public.label_products(user_id);