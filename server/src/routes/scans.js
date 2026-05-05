const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Only .jpg, .jpeg, .png, .webp allowed'));
  },
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('scans')
      .select('*')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching scans:', err);
    res.status(500).json({ message: 'Failed to fetch scans' });
  }
});

router.get('/patient/:patientId', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('scans')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching patient scans:', err);
    res.status(500).json({ message: 'Failed to fetch scans' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('scans')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Scan not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching scan:', err);
    res.status(500).json({ message: 'Failed to fetch scan' });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const { data: scan, error } = await supabaseAdmin
      .from('scans')
      .select('file_path, company_id')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();

    if (error || !scan) return res.status(404).json({ message: 'Scan not found' });

    const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
      .from('scans')
      .createSignedUrl(scan.file_path, 3600);

    if (urlError || !signedUrl) {
      return res.status(404).json({ message: 'Scan image not found' });
    }

    res.redirect(signedUrl.signedUrl);
  } catch (err) {
    console.error('Error fetching scan image:', err);
    res.status(500).json({ message: 'Failed to fetch scan image' });
  }
});

router.post('/upload', requireRole('dentist', 'hygienist', 'clinic_admin', 'super_admin'), upload.single('scan'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const { patientId, scanType } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    const storagePath = `${req.companyId}/${patientId || 'unassigned'}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('scans')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: scan, error: dbError } = await supabaseAdmin
      .from('scans')
      .insert({
        company_id: req.companyId,
        patient_id: patientId || null,
        file_path: storagePath,
        file_name: req.file.originalname,
        scan_type: scanType || 'unknown',
        uploaded_by: req.user.id,
      })
      .select()
      .single();

    if (dbError) throw dbError;
    res.status(201).json(scan);
  } catch (err) {
    console.error('Error uploading scan:', err);
    res.status(500).json({ message: 'Failed to upload scan' });
  }
});

router.delete('/:id', requireRole('clinic_admin', 'super_admin'), async (req, res) => {
  try {
    const { data: scan } = await supabaseAdmin
      .from('scans')
      .select('file_path')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();

    if (!scan) return res.status(404).json({ message: 'Scan not found' });

    await supabaseAdmin.storage.from('scans').remove([scan.file_path]);
    await supabaseAdmin.from('scans').delete().eq('id', req.params.id);

    res.json({ message: 'Scan deleted' });
  } catch (err) {
    console.error('Error deleting scan:', err);
    res.status(500).json({ message: 'Failed to delete scan' });
  }
});

module.exports = router;
