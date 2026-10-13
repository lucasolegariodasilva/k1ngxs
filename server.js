const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Segredo da sessao: defina SESSION_SECRET no ambiente em producao.
const SESSION_SECRET = process.env.SESSION_SECRET || 'troque-este-segredo-em-producao';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

// Arquivos publicos (frontend) e arquivos enviados.
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

// ---- Upload (multer) ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = db.slugify(path.parse(file.originalname).name).slice(0, 40);
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, db.id() + '-' + safe + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1 GB por arquivo
});

// ---- Autenticacao ----
function requireAdmin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'Nao autorizado' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const users = db.read('users', []);
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Usuario ou senha invalidos' });
  }
  req.session.user = { id: user.id, username: user.username };
  res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: (req.session && req.session.user) || null });
});

// ---- Categorias ----
app.get('/api/categories', (req, res) => {
  const cats = db.read('categories', []).sort((a, b) => a.order - b.order);
  res.json(cats);
});

app.post('/api/categories', requireAdmin, upload.single('image'), (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    if (req.file) fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Informe um nome' });
  }
  const cats = db.read('categories', []);
  const slug = db.slugify(name);
  if (cats.some(c => c.slug === slug)) {
    if (req.file) fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    return res.status(409).json({ error: 'Categoria ja existe' });
  }
  const cat = {
    id: db.id(), name, slug, order: cats.length,
    image: req.file ? '/uploads/' + req.file.filename : null
  };
  cats.push(cat);
  db.write('categories', cats);
  res.json(cat);
});

// Atualiza nome, imagem (grade) e/ou banner (tela da categoria).
const catUpdateUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]);
app.post('/api/categories/:id', requireAdmin, catUpdateUpload, (req, res) => {
  const cats = db.read('categories', []);
  const cat = cats.find(c => c.id === req.params.id);
  const imgFile = req.files && req.files.image && req.files.image[0];
  const bannerFile = req.files && req.files.banner && req.files.banner[0];
  function cleanup(){ [imgFile, bannerFile].forEach(f => { if (f) try { fs.existsSync(f.path) && fs.unlinkSync(f.path); } catch (e) {} }); }
  if (!cat) { cleanup(); return res.status(404).json({ error: 'Nao encontrada' }); }
  const name = (req.body.name || '').trim();
  if (name && name !== cat.name) {
    const slug = db.slugify(name);
    if (cats.some(c => c.slug === slug && c.id !== cat.id)) {
      cleanup();
      return res.status(409).json({ error: 'Ja existe uma categoria com esse nome' });
    }
    // atualiza o slug dos itens dessa categoria
    let items = db.read('items', []);
    items.forEach(i => { if (i.categoryId === cat.id) { i.categorySlug = slug; i.categoryName = name; } });
    db.write('items', items);
    cat.name = name; cat.slug = slug;
  }
  if (imgFile) {
    if (cat.image) { const old = path.join(UPLOAD_DIR, path.basename(cat.image)); try { if (fs.existsSync(old)) fs.unlinkSync(old); } catch (e) {} }
    cat.image = '/uploads/' + imgFile.filename;
  }
  // banner (imagem exibida ao entrar na categoria)
  if (req.body.removeBanner === '1') {
    if (cat.banner) { const old = path.join(UPLOAD_DIR, path.basename(cat.banner)); try { if (fs.existsSync(old)) fs.unlinkSync(old); } catch (e) {} }
    cat.banner = null;
  }
  if (bannerFile) {
    if (cat.banner) { const old = path.join(UPLOAD_DIR, path.basename(cat.banner)); try { if (fs.existsSync(old)) fs.unlinkSync(old); } catch (e) {} }
    cat.banner = '/uploads/' + bannerFile.filename;
  }
  db.write('categories', cats);
  res.json(cat);
});

app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  let cats = db.read('categories', []);
  const cat = cats.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Nao encontrada' });
  // remove a imagem da categoria
  if (cat.image) {
    const img = path.join(UPLOAD_DIR, path.basename(cat.image));
    try { if (fs.existsSync(img)) fs.unlinkSync(img); } catch (e) {}
  }
  if (cat.banner) {
    const bn = path.join(UPLOAD_DIR, path.basename(cat.banner));
    try { if (fs.existsSync(bn)) fs.unlinkSync(bn); } catch (e) {}
  }
  // remove itens da categoria (e seus arquivos)
  let items = db.read('items', []);
  const toRemove = items.filter(i => i.categoryId === cat.id);
  for (const it of toRemove) removeItemFiles(it);
  items = items.filter(i => i.categoryId !== cat.id);
  db.write('items', items);
  cats = cats.filter(c => c.id !== cat.id);
  db.write('categories', cats);
  res.json({ ok: true });
});

// ---- Itens (demonstracao + arquivo para download) ----
app.get('/api/items', (req, res) => {
  let items = db.read('items', []);
  if (req.query.category) items = items.filter(i => i.categorySlug === req.query.category);
  items.sort((a, b) => b.createdAt - a.createdAt);
  res.json(items);
});

const uploadFields = upload.fields([
  { name: 'preview', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

app.post('/api/items', requireAdmin, uploadFields, (req, res) => {
  const title = (req.body.title || '').trim();
  const categoryId = req.body.categoryId;
  const description = (req.body.description || '').trim();
  const cats = db.read('categories', []);
  const cat = cats.find(c => c.id === categoryId);
  const previewFile = req.files && req.files.preview && req.files.preview[0];
  const dlFile = req.files && req.files.file && req.files.file[0];
  if (!title || !cat || !previewFile || !dlFile) {
    [previewFile, dlFile].forEach(f => f && fs.existsSync(f.path) && fs.unlinkSync(f.path));
    return res.status(400).json({ error: 'Preencha titulo, categoria, demonstracao e arquivo' });
  }
  const previewMime = previewFile.mimetype || '';
  const previewType = previewMime.startsWith('video') ? 'video'
    : previewMime.startsWith('image') ? 'image'
    : previewMime.startsWith('audio') ? 'audio' : 'other';
  const item = {
    id: db.id(),
    title, description,
    categoryId: cat.id,
    categorySlug: cat.slug,
    categoryName: cat.name,
    preview: '/uploads/' + previewFile.filename,
    previewType,
    file: '/uploads/' + dlFile.filename,
    downloadName: dlFile.originalname,
    size: dlFile.size,
    createdAt: Date.now()
  };
  const items = db.read('items', []);
  items.push(item);
  db.write('items', items);
  res.json(item);
});

app.delete('/api/items/:id', requireAdmin, (req, res) => {
  let items = db.read('items', []);
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Nao encontrado' });
  removeItemFiles(item);
  items = items.filter(i => i.id !== req.params.id);
  db.write('items', items);
  res.json({ ok: true });
});

// ---- Configuracoes do site (plano de fundo + musica) ----
const DEFAULT_SETTINGS = { backgroundImage: null, backgroundMusic: null, clickSound: null };

app.get('/api/settings', (req, res) => {
  res.json(Object.assign({}, DEFAULT_SETTINGS, db.read('settings', {})));
});

function removeUpload(url) {
  if (!url) return;
  const abs = path.join(UPLOAD_DIR, path.basename(url));
  try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch (e) {}
}

const settingsUpload = upload.fields([
  { name: 'background', maxCount: 1 },
  { name: 'music', maxCount: 1 },
  { name: 'clickSound', maxCount: 1 }
]);

app.post('/api/settings', requireAdmin, settingsUpload, (req, res) => {
  const settings = Object.assign({}, DEFAULT_SETTINGS, db.read('settings', {}));
  const bg = req.files && req.files.background && req.files.background[0];
  const music = req.files && req.files.music && req.files.music[0];
  const click = req.files && req.files.clickSound && req.files.clickSound[0];

  // plano de fundo (imagem)
  if (req.body.removeBg === '1' || req.body.remove === '1') {
    removeUpload(settings.backgroundImage); settings.backgroundImage = null;
  }
  if (bg) { removeUpload(settings.backgroundImage); settings.backgroundImage = '/uploads/' + bg.filename; }

  // musica de fundo
  if (req.body.removeMusic === '1') {
    removeUpload(settings.backgroundMusic); settings.backgroundMusic = null;
  }
  if (music) { removeUpload(settings.backgroundMusic); settings.backgroundMusic = '/uploads/' + music.filename; }

  // som ao clicar nas categorias
  if (req.body.removeClickSound === '1') {
    removeUpload(settings.clickSound); settings.clickSound = null;
  }
  if (click) { removeUpload(settings.clickSound); settings.clickSound = '/uploads/' + click.filename; }

  db.write('settings', settings);
  res.json(settings);
});

// Download com nome original.
app.get('/download/:id', (req, res) => {
  const items = db.read('items', []);  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).send('Arquivo nao encontrado');
  const abs = path.join(UPLOAD_DIR, path.basename(item.file));
  if (!fs.existsSync(abs)) return res.status(404).send('Arquivo nao encontrado');
  res.download(abs, item.downloadName || path.basename(abs));
});

function removeItemFiles(item) {
  for (const url of [item.preview, item.file]) {
    if (!url) continue;
    const abs = path.join(UPLOAD_DIR, path.basename(url));
    try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch (e) {}
  }
}

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, HOST, () => {
  console.log('Site rodando em http://' + HOST + ':' + PORT);
  console.log('Painel do administrador em http://' + HOST + ':' + PORT + '/admin');
});
