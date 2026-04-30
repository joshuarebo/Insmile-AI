const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const patientsFile = path.join(dataDir, 'patients.json');
const scansFile = path.join(dataDir, 'scans.json');

fs.mkdirSync(dataDir, { recursive: true });

function load(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let patients = load(patientsFile, []);
let scans = load(scansFile, []);

function persist() {
  save(patientsFile, patients);
  save(scansFile, scans);
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = {
  listPatients: () => patients,
  getPatient: (id) => patients.find((p) => p.id === id),
  createPatient: (data) => {
    const p = {
      id: nextId('pat'),
      createdAt: new Date().toISOString(),
      ...data,
    };
    patients.push(p);
    persist();
    return p;
  },
  updatePatient: (id, updates) => {
    const i = patients.findIndex((p) => p.id === id);
    if (i < 0) return null;
    patients[i] = { ...patients[i], ...updates, id };
    persist();
    return patients[i];
  },
  deletePatient: (id) => {
    const before = patients.length;
    patients = patients.filter((p) => p.id !== id);
    persist();
    return before !== patients.length;
  },

  listScans: (patientId) =>
    patientId ? scans.filter((s) => s.patientId === patientId) : scans,
  getScan: (id) => scans.find((s) => s.id === id),
  createScan: (data) => {
    const s = {
      id: nextId('scan'),
      createdAt: new Date().toISOString(),
      ...data,
    };
    scans.push(s);
    persist();
    return s;
  },
  updateScan: (id, updates) => {
    const i = scans.findIndex((s) => s.id === id);
    if (i < 0) return null;
    scans[i] = { ...scans[i], ...updates, id };
    persist();
    return scans[i];
  },
  deleteScan: (id) => {
    const before = scans.length;
    scans = scans.filter((s) => s.id !== id);
    persist();
    return before !== scans.length;
  },

  nextId,
};
