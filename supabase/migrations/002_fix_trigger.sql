-- Fix the handle_new_user trigger
-- The issue: apostrophe in default clinic name and potential slug conflicts

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _company_id UUID;
  _role TEXT;
  _full_name TEXT;
  _clinic_name TEXT;
  _slug TEXT;
  _invitation RECORD;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _clinic_name := COALESCE(NEW.raw_user_meta_data->>'clinic_name', _full_name || ' Clinic');

  -- Check if there's a pending invitation for this email
  SELECT * INTO _invitation
  FROM invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation IS NOT NULL THEN
    -- Join existing company via invitation
    _company_id := _invitation.company_id;
    _role := _invitation.role;

    -- Mark invitation as accepted
    UPDATE invitations SET accepted_at = now() WHERE id = _invitation.id;
  ELSE
    -- Generate a safe slug
    _slug := LOWER(REGEXP_REPLACE(_clinic_name, '[^a-zA-Z0-9]+', '-', 'g'));
    _slug := _slug || '-' || SUBSTRING(NEW.id::text FROM 1 FOR 8);

    -- Create a new company for this user
    INSERT INTO companies (name, slug)
    VALUES (_clinic_name, _slug)
    RETURNING id INTO _company_id;

    _role := 'clinic_admin';
  END IF;

  -- Create profile
  INSERT INTO profiles (id, company_id, role, full_name)
  VALUES (NEW.id, _company_id, _role, _full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
