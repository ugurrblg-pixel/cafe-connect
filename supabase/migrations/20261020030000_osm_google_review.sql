BEGIN;
-- Identity/status only. Google names, coordinates and photos never enter OSM records.
CREATE TABLE private.osm_google_review (
 candidate_id uuid PRIMARY KEY REFERENCES private.osm_place_candidates(id),
 google_place_id text CHECK(length(google_place_id) BETWEEN 1 AND 300),
 task text NOT NULL CHECK(task IN ('matched','needs_id','needs_review')),
 compared_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.osm_google_review ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.osm_google_review FROM PUBLIC,anon,authenticated;
COMMIT;
