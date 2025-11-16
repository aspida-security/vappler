-- Migration: Add graph_data column to scans table
-- Location: supabase/migrations/20251115170000_add_graph_data_to_scans.sql

ALTER TABLE public.scans
ADD COLUMN IF NOT EXISTS graph_data JSONB;

COMMENT ON COLUMN public.scans.graph_data IS 'JSONB data representing the serialized NetworkX graph for attack path visualization.';

-- Enable efficient JSON queries if needed later
CREATE INDEX IF NOT EXISTS idx_scans_graph_data ON public.scans USING GIN (graph_data);
