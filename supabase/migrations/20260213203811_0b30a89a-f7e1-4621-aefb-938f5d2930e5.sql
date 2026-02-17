
-- Create word_sets table for storing user vocabulary sets
CREATE TABLE public.word_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  cards_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.word_sets ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth, using local user_id text field)
CREATE POLICY "Anyone can read public word sets"
ON public.word_sets FOR SELECT
USING (is_public = true);

CREATE POLICY "Anyone can manage word sets"
ON public.word_sets FOR ALL
USING (true)
WITH CHECK (true);
