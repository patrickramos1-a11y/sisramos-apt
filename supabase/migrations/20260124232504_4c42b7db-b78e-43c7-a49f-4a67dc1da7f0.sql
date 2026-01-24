-- Add muito_urgente column to demandas table
ALTER TABLE public.demandas 
ADD COLUMN muito_urgente boolean NOT NULL DEFAULT false;