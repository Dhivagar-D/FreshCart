import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
dotenv.config();

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 14) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 14 characters) in server/.env before running this command.');
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_EPHEMERAL_DB === 'true') throw new Error('Admin creation cannot use an ephemeral database in production.');
  await connectDB();
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) throw new Error('An account with this email already exists. No changes were made.');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const user = await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'admin', status: 'active' });
  console.log(`Admin account created: ${user.email}`);
  await (await import('mongoose')).default.disconnect();
}
createAdmin().catch(async (error) => { console.error(`Admin bootstrap failed: ${error.message}`); process.exitCode = 1; });
