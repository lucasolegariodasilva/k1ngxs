// Armazenamento simples em arquivos JSON (sem dependencias nativas).
// Ideal para um site pequeno e facil de hospedar em qualquer lugar.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function filePath(name) {
  return path.join(DATA_DIR, name + '.json');
}

function read(name, fallback) {
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function write(name, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = filePath(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath(name)); // escrita atomica
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cat-' + id();
}

module.exports = { read, write, id, slugify, DATA_DIR };
