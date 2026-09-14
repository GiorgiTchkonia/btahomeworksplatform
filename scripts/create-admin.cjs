const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const WHITELIST_PATH = path.join(__dirname, '../data/whitelist.json');
const SALT_ROUNDS = 12; // Higher salt rounds for admin

const ADMIN_CREDENTIALS = {
  id: 'admin-1',
  name: 'მთავარი ადმინისტრატორი',
  email: 'admin@academy.ge',
  passwordPlain: 'Admin#Academy2026',
  role: 'ADMIN'
};

async function main() {
  const raw = fs.readFileSync(WHITELIST_PATH, 'utf-8');
  const data = JSON.parse(raw);

  const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.passwordPlain, SALT_ROUNDS);

  data.admins = [
    {
      id: ADMIN_CREDENTIALS.id,
      name: ADMIN_CREDENTIALS.name,
      email: ADMIN_CREDENTIALS.email,
      password: hashedPassword,
      role: ADMIN_CREDENTIALS.role
    }
  ];

  const tempPath = `${WHITELIST_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, WHITELIST_PATH);

  // Verify
  const isMatch = await bcrypt.compare(ADMIN_CREDENTIALS.passwordPlain, hashedPassword);
  console.log('Admin account created in whitelist.json!');
  console.log('Email:', ADMIN_CREDENTIALS.email);
  console.log('Password verified successfully:', isMatch);
}

main().catch(console.error);
