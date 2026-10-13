// Cria ou atualiza um usuario administrador.
// Uso:  node scripts/create-admin.js <usuario> <senha>
const bcrypt = require('bcryptjs');
const db = require('../lib/db');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error('Uso: node scripts/create-admin.js <usuario> <senha>');
  process.exit(1);
}
if (password.length < 6) {
  console.error('A senha precisa ter pelo menos 6 caracteres.');
  process.exit(1);
}

let users = db.read('users', []);
if (!Array.isArray(users)) users = [];
const hash = bcrypt.hashSync(password, 10);
const existing = users.find(u => u.username === username);
if (existing) {
  existing.passwordHash = hash;
  console.log('Senha do administrador "' + username + '" atualizada.');
} else {
  users.push({ id: db.id(), username, passwordHash: hash });
  console.log('Administrador "' + username + '" criado.');
}
db.write('users', users);
