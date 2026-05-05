-- The trigger might not have been created because it references auth.users
-- In Supabase, triggers on auth.users must be created in the auth schema context
-- Let's drop and recreate properly

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
