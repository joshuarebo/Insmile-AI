const { supabaseAdmin } = require('../lib/supabase');

// The DB trigger for auto-creating profiles on signup may not fire reliably in all
// Supabase configurations, so this middleware includes a fallback that creates the
// profile on first authenticated request. This makes the system self-healing.

async function requireAuth(req, res, next) {
  const auth = req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single();

    // If trigger didn't fire (edge case), create profile + company on first authenticated request
    if (!profile) {
      profile = await ensureProfile(user);
    }

    if (!profile) {
      return res.status(403).json({ message: 'Profile not found. Complete registration first.' });
    }

    req.user = user;
    req.profile = profile;
    req.companyId = profile.company_id;
    req.accessToken = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Authentication failed' });
  }
}

async function ensureProfile(user) {
  const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
  const clinicName = user.user_metadata?.clinic_name || fullName + ' Clinic';
  const slug = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + user.id.slice(0, 8);

  // Check for pending invitation
  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('email', user.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let companyId;
  let role;

  if (invitation) {
    companyId = invitation.company_id;
    role = invitation.role;
    await supabaseAdmin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id);
  } else {
    const { data: company, error: compErr } = await supabaseAdmin
      .from('companies')
      .insert({ name: clinicName, slug })
      .select()
      .single();
    if (compErr) {
      console.error('Failed to create company:', compErr.message);
      return null;
    }
    companyId = company.id;
    role = 'clinic_admin';
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .insert({ id: user.id, company_id: companyId, role, full_name: fullName })
    .select('*, companies(*)')
    .single();

  if (profErr) {
    console.error('Failed to create profile:', profErr.message);
    return null;
  }

  return profile;
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
