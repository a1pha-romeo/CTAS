import fs from 'fs';
import config from '../config/env.js';

if (fs.existsSync(config.dbPath)) {
  fs.unlinkSync(config.dbPath);
  console.log(`[CTAS] Removed database at ${config.dbPath}`);
}
const walPath = `${config.dbPath}-wal`;
const shmPath = `${config.dbPath}-shm`;
if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

console.log('[CTAS] Database reset complete.');
