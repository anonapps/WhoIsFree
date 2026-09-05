-- Shared platform authentication foundation.
-- Apply to the single shared Supabase project.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO shared.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

REVOKE USAGE ON SCHEMA shared FROM anon;
GRANT USAGE ON SCHEMA shared TO authenticated;
GRANT SELECT, INSERT, UPDATE ON shared.user_profiles TO authenticated;
GRANT ALL ON shared.user_profiles TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

DROP POLICY IF EXISTS users_can_read_own_profile ON shared.user_profiles;
CREATE POLICY users_can_read_own_profile
  ON shared.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS users_can_insert_own_profile ON shared.user_profiles;
CREATE POLICY users_can_insert_own_profile
  ON shared.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS users_can_update_own_profile ON shared.user_profiles;
CREATE POLICY users_can_update_own_profile
  ON shared.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
