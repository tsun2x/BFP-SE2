-- Migration: Create station_checklist_items table for custom checklist items
-- Purpose: Allow stations to add, edit, and delete custom checklist items

CREATE TABLE IF NOT EXISTS public.station_checklist_items (
  item_id BIGSERIAL PRIMARY KEY,
  station_id BIGINT NOT NULL REFERENCES public.fire_stations(station_id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipment' CHECK (category IN ('equipment', 'personnel')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (station_id, item_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_station_checklist_items_station_id ON public.station_checklist_items(station_id);
CREATE INDEX IF NOT EXISTS idx_station_checklist_items_category ON public.station_checklist_items(category);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_station_checklist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER station_checklist_items_updated_at_trigger
  BEFORE UPDATE ON public.station_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_station_checklist_items_updated_at();
