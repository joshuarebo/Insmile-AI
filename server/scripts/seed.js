#!/usr/bin/env node
/**
 * Seed a demo patient and register an existing uploaded scan,
 * so the UI has something to show without re-uploading.
 *
 *   node scripts/seed.js
 */
const fs = require('fs');
const path = require('path');

process.chdir(path.resolve(__dirname, '..'));
const store = require('../src/store');

const patients = [
  {
    name: 'Amina Wanjiru',
    email: 'amina@example.co.ke',
    phone: '+254 712 000 111',
    gender: 'female',
    notes: 'Reports mild sensitivity on left lower molar.',
  },
  {
    name: 'Brian Otieno',
    email: 'brian@example.co.ke',
    phone: '+254 722 333 444',
    gender: 'male',
    notes: 'Regular patient. Last cleaning 8 months ago.',
  },
];

function pickUpload() {
  const dir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  if (!files.length) return null;
  return path.join(dir, files[0]);
}

function run() {
  const created = patients.map((p) => {
    const existing = store.listPatients().find((x) => x.email === p.email);
    return existing || store.createPatient(p);
  });

  const sample = pickUpload();
  if (sample) {
    const hasScan = store.listScans().some((s) => s.filePath === sample);
    if (!hasScan) {
      store.createScan({
        patientId: created[0].id,
        scanType: 'panoramic',
        fileName: path.basename(sample),
        filePath: sample,
        size: fs.statSync(sample).size,
        status: 'uploaded',
      });
    }
  }

  console.log('Seeded patients:');
  created.forEach((p) => console.log(`  - ${p.name}  (${p.id})`));
  console.log(`Scans in store: ${store.listScans().length}`);
}

run();
