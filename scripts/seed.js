// Cria as categorias iniciais pedidas pelo usuario (apenas se ainda nao existirem).
const db = require('../lib/db');

const DEFAULT_CATEGORIES = [
  'Sfx-Pure',
  'Wallpaper',
  'Citizen',
  'Otimizacao',
  'Tutoriais FiveM',
  'Tutoriais Edicao',
  'Plugins Editor',
  'OBS Lite',
  'Outros',
  'Banners'
];

function seed() {
  let cats = db.read('categories', []);
  if (!Array.isArray(cats)) cats = [];
  let order = cats.length;
  for (const name of DEFAULT_CATEGORIES) {
    const slug = db.slugify(name);
    if (!cats.some(c => c.slug === slug)) {
      cats.push({ id: db.id(), name, slug, order: order++ });
    }
  }
  db.write('categories', cats);
  if (!db.read('items', null)) db.write('items', []);
  console.log('Categorias prontas:', cats.map(c => c.name).join(', '));
}

seed();
