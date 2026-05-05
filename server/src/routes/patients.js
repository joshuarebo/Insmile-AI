const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ message: 'Failed to fetch patients' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Patient not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ message: 'Failed to fetch patient' });
  }
});

router.post('/', requireRole('dentist', 'hygienist', 'clinic_admin', 'super_admin', 'receptionist'), async (req, res) => {
  try {
    const {
      full_name, date_of_birth, gender, phone, email,
      national_id, sha_number, nhif_number,
      insurance_provider, insurance_member_number,
      allergies, medical_history, medications,
      preferred_language, referral_source, notes,
    } = req.body;

    if (!full_name) return res.status(400).json({ message: 'full_name is required' });

    const { data, error } = await supabaseAdmin
      .from('patients')
      .insert({
        company_id: req.companyId,
        full_name,
        date_of_birth,
        gender,
        phone,
        email,
        national_id,
        sha_number,
        nhif_number,
        insurance_provider,
        insurance_member_number,
        allergies: allergies || [],
        medical_history,
        medications: medications || [],
        preferred_language: preferred_language || 'en',
        referral_source,
        notes,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ message: 'Failed to create patient' });
  }
});

router.put('/:id', requireRole('dentist', 'hygienist', 'clinic_admin', 'super_admin', 'receptionist'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ message: 'Patient not found' });
    res.json(data);
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ message: 'Failed to update patient' });
  }
});

router.delete('/:id', requireRole('clinic_admin', 'super_admin'), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('patients')
      .delete()
      .eq('id', req.params.id)
      .eq('company_id', req.companyId);

    if (error) throw error;
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    console.error('Error deleting patient:', err);
    res.status(500).json({ message: 'Failed to delete patient' });
  }
});

module.exports = router;
