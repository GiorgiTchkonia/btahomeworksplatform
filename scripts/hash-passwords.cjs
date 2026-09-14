// One-time script: hash all plaintext passwords in whitelist.json
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const WHITELIST_PATH = path.join(__dirname, '../data/whitelist.json');

async function hashPasswords() {
  const raw = fs.readFileSync(WHITELIST_PATH, 'utf-8');
  const data = JSON.parse(raw);

  // Check if already hashed (bcrypt hashes start with $2b$)
  const firstTeacher = data.teachers[0];
  if (firstTeacher.password && firstTeacher.password.startsWith('$2b$')) {
    console.log('Passwords already hashed. Skipping.');
    return;
  }

  console.log('Hashing passwords...');

  for (const teacher of data.teachers) {
    if (teacher.password) {
      teacher.password = await bcrypt.hash(teacher.password, SALT_ROUNDS);
      console.log(`  Hashed teacher: ${teacher.email}`);
    }
  }

  for (const student of data.students) {
    if (student.password) {
      student.password = await bcrypt.hash(student.password, SALT_ROUNDS);
      console.log(`  Hashed student: ${student.email}`);
    }
  }

  const tempPath = `${WHITELIST_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, WHITELIST_PATH);
  console.log('Done! Passwords are now hashed in whitelist.json');
}

hashPasswords().catch(console.error);
