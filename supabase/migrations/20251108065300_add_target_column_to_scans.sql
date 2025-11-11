-- Migration: Add target column to scans table
-- Location: supabase/migrations/20251108065300_add_target_column_to_scans.sql

ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS target TEXT;
