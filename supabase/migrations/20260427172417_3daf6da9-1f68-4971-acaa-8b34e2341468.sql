CREATE TABLE public.instagram_metrics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  website_clicks INTEGER NOT NULL DEFAULT 0,
  posts_published INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'n8n',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (date)
);

ALTER TABLE public.instagram_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read instagram_metrics_daily"
  ON public.instagram_metrics_daily FOR SELECT
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_metrics_daily;