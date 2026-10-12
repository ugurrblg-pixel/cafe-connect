-- Fix signup metadata persistence without adding client access.
BEGIN;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE dob_text text:=NEW.raw_user_meta_data->>'date_of_birth'; dob date; years integer;
BEGIN
 IF dob_text IS NOT NULL THEN
  IF dob_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
   RAISE EXCEPTION 'Invalid birth date' USING ERRCODE='22023'; END IF;
  BEGIN dob:=dob_text::date;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
   RAISE EXCEPTION 'Invalid birth date' USING ERRCODE='22023'; END;
  years:=extract(year FROM age((clock_timestamp() AT TIME ZONE 'UTC')::date,dob))::integer;
  IF dob<date '1900-01-01' OR years<18 THEN
   RAISE EXCEPTION 'Valid adult birth date required' USING ERRCODE='22023'; END IF;
 END IF;
 -- Missing metadata stays compatible with existing provider/admin-created accounts.
 -- This records self-reported DOB; it does not verify identity or gate all existing accounts.
 INSERT INTO public.profiles(user_id,name,date_of_birth,age)
 VALUES(NEW.id,left(coalesce(NEW.raw_user_meta_data->>'name',''),50),dob,years);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
COMMIT;
