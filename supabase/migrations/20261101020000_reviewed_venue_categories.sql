BEGIN;
-- Operator-reviewed classification, not a wholesale acceptance of food/stores.
-- Only the exempt Google identifier, our category and independent evidence URL
-- are persistent here. Google descriptive fields stay in their existing cache.
CREATE TABLE private.reviewed_venue_categories (
 google_place_id text PRIMARY KEY,
 category text NOT NULL CHECK(category IN ('cafe','bar','night_club','gym')),
 evidence_url text NOT NULL,
 reviewed_by text NOT NULL,
 reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.reviewed_venue_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.reviewed_venue_categories FROM PUBLIC,anon,authenticated;
INSERT INTO private.reviewed_venue_categories(google_place_id,category,evidence_url,reviewed_by)
VALUES('ChIJO_UXP4rdyhQRiaTrdXEeUcM','cafe','https://nevadacoffee.co/magazalarimiz','owner-reported Pendik Marina; official branch directory reviewed');
CREATE FUNCTION public.get_reviewed_venue_categories() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_object_agg(google_place_id,category),'{}') FROM private.reviewed_venue_categories;
$$;
REVOKE ALL ON FUNCTION public.get_reviewed_venue_categories() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_reviewed_venue_categories() TO service_role;
COMMIT;
