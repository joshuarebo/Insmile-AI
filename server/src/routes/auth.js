const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
    },
    profile: req.profile,
    company: req.profile.companies,
  });
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, phone, specialization, kmpdb_number, avatar_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, phone, specialization, kmpdb_number, avatar_url })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.post('/invite', requireAuth, requireRole('clinic_admin', 'super_admin'), async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ message: 'email and role are required' });

    const validRoles = ['clinic_admin', 'dentist', 'hygienist', 'receptionist'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        company_id: req.companyId,
        email,
        role,
        invited_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: send invitation email via Supabase or external service
    res.status(201).json({ message: 'Invitation created', invitation: data });
  } catch (err) {
    console.error('Error creating invitation:', err);
    res.status(500).json({ message: 'Failed to create invitation' });
  }
});

router.get('/team', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, phone, avatar_url, specialization, created_at')
      .eq('company_id', req.companyId)
      .order('created_at');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ message: 'Failed to fetch team' });
  }
});

module.exports = router;
