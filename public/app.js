let CATEGORIES = [];
let ITEMS = [];
let currentSlug = null;
let CLICK_SOUND_URL = null;

const $ = id => document.getElementById(id);
const catGrid = $('catGrid');
const grid = $('grid');
const emptyEl = $('empty');
const homeView = $('homeView');
const categoryView = $('categoryView');
const searchView = $('searchView');
const catBanner = $('catBanner');

async function getJSON(url){ const r = await fetch(url); return r.json(); }

function fmtSize(n){
  if(!n && n!==0) return '';
  const u=['B','KB','MB','GB']; let i=0; let v=n;
  while(v>=1024 && i<u.length-1){ v/=1024; i++; }
  return v.toFixed(v<10&&i>0?1:0)+' '+u[i];
}
function countItems(slug){ return ITEMS.filter(i=>i.categorySlug===slug).length; }

/* ---------- Views ---------- */
function showHome(){
  currentSlug=null;
  homeView.style.display='block';
  categoryView.style.display='none';
  searchView.style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
}
function showCategory(slug){
  const cat=CATEGORIES.find(c=>c.slug===slug);
  if(!cat) return showHome();
  currentSlug=slug;
  homeView.style.display='none';
  searchView.style.display='none';
  categoryView.style.display='block';
  renderBanner(cat);
  renderItems(ITEMS.filter(i=>i.categorySlug===slug));
  window.scrollTo({top:0,behavior:'smooth'});
}
function showSearch(term){
  homeView.style.display='none';
  categoryView.style.display='none';
  searchView.style.display='block';
  const t=term.toLowerCase();
  const list=ITEMS.filter(i=>(i.title+' '+(i.description||'')+' '+i.categoryName).toLowerCase().includes(t));
  $('searchTitle').textContent='Resultados para \u201C'+term+'\u201D';
  const g=$('searchGrid'); g.innerHTML='';
  $('searchEmpty').style.display=list.length?'none':'block';
  list.forEach(i=>g.appendChild(card(i)));
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- Banner da categoria ---------- */
function renderBanner(cat){
  catBanner.innerHTML='';
  catBanner.className='cat-banner';
  const bannerImg = cat.banner || cat.image;
  if(bannerImg){ catBanner.style.backgroundImage='url("'+bannerImg+'")'; catBanner.classList.remove('ph'); }
  else { catBanner.style.backgroundImage=''; catBanner.classList.add('ph'); }
  const inner=document.createElement('div'); inner.className='cat-banner-inner';
  const h=document.createElement('h1'); h.textContent=cat.name; inner.appendChild(h);
  const p=document.createElement('p'); p.textContent=countItems(cat.slug)+' arquivo(s) para baixar'; inner.appendChild(p);
  catBanner.appendChild(inner);
}

/* ---------- Grade de categorias ---------- */
function renderCategories(){
  catGrid.innerHTML='';
  CATEGORIES.forEach(c=> catGrid.appendChild(catTile(c)));
  renderDrawerCats();
}
function catTile(c){
  const el=document.createElement('div'); el.className='cat-tile';
  const media=document.createElement('div'); media.className='cat-media';
  if(c.image){ const img=document.createElement('img'); img.src=c.image; img.alt=c.name; img.loading='lazy'; media.appendChild(img); }
  else { media.classList.add('ph'); const l=document.createElement('span'); l.className='cat-letter'; l.textContent=(c.name||'?').charAt(0).toUpperCase(); media.appendChild(l); }
  const overlay=document.createElement('div'); overlay.className='cat-overlay';
  const name=document.createElement('div'); name.className='cat-name'; name.textContent=c.name;
  const count=document.createElement('div'); count.className='cat-count'; count.textContent=countItems(c.slug)+' arquivo(s)';
  overlay.appendChild(name); overlay.appendChild(count); media.appendChild(overlay);
  el.appendChild(media);
  el.onclick=()=>{ playClickSound(); showCategory(c.slug); };
  return el;
}

/* ---------- Cards de itens ---------- */
function mediaNode(item){
  const wrap=document.createElement('div'); wrap.className='media';
  if(item.previewType==='video'){
    const v=document.createElement('video');
    v.src=item.preview; v.controls=true; v.preload='metadata'; v.playsInline=false; v.muted=true;
    let hoverPreview=false;
    v.addEventListener('mouseenter',()=>{ if(v.paused){ hoverPreview=true; v.play().catch(()=>{}); } });
    v.addEventListener('mouseleave',()=>{ if(hoverPreview){ v.pause(); v.currentTime=0; } });
    v.addEventListener('play',()=>{ if(!hoverPreview){ v.muted=false; } });
    v.addEventListener('click',()=>{ hoverPreview=false; });
    wrap.appendChild(v);
  } else if(item.previewType==='image'){
    const img=document.createElement('img'); img.src=item.preview; img.loading='lazy'; img.alt=item.title;
    img.classList.add('zoomable'); img.title='Clique para ampliar';
    img.addEventListener('click',e=>{ e.stopPropagation(); openLightbox(item.preview); });
    wrap.appendChild(img);
    const hint=document.createElement('span'); hint.className='zoom-hint'; hint.textContent='\u26F6'; wrap.appendChild(hint);
  } else if(item.previewType==='audio'){
    const ph=document.createElement('div'); ph.className='audio-ph'; ph.textContent='\u266A'; wrap.appendChild(ph);
    const a=document.createElement('audio'); a.src=item.preview; a.controls=true;
    a.style.position='absolute'; a.style.bottom='8px'; a.style.left='8px'; a.style.width='calc(100% - 16px)';
    wrap.appendChild(a);
  } else {
    const ph=document.createElement('div'); ph.className='audio-ph'; ph.textContent='\u2B07'; wrap.appendChild(ph);
  }
  const badge=document.createElement('span'); badge.className='badge'; badge.textContent=item.categoryName;
  wrap.appendChild(badge);
  return wrap;
}
function card(item){
  const c=document.createElement('div'); c.className='card';
  c.appendChild(mediaNode(item));
  const body=document.createElement('div'); body.className='body';
  const h=document.createElement('h3'); h.textContent=item.title; body.appendChild(h);
  if(item.description){ const d=document.createElement('div'); d.className='desc'; d.textContent=item.description; body.appendChild(d); }
  const meta=document.createElement('div'); meta.className='meta'; meta.textContent=fmtSize(item.size); body.appendChild(meta);
  const a=document.createElement('a'); a.className='btn'; a.href='/download/'+item.id; a.textContent='\u2B07 Baixar'; body.appendChild(a);
  c.appendChild(body);
  return c;
}
function renderItems(list){
  grid.innerHTML='';
  emptyEl.style.display=list.length?'none':'block';
  list.forEach(i=>grid.appendChild(card(i)));
}

/* ---------- Menu lateral (drawer) ---------- */
function openDrawer(){ $('drawer').classList.add('open'); $('overlay').classList.add('show'); }
function closeDrawer(){ $('drawer').classList.remove('open'); $('overlay').classList.remove('show'); }
function renderDrawerCats(){
  const box=$('drawerCats'); box.innerHTML='';
  CATEGORIES.forEach(c=>{
    const a=document.createElement('a'); a.href='#'; a.className='nav-item sub';
    const ic=document.createElement('span'); ic.className='ni'; ic.textContent='\u25C9'; a.appendChild(ic);
    a.appendChild(document.createTextNode(' '+c.name));
    a.onclick=e=>{ e.preventDefault(); playClickSound(); closeDrawer(); showCategory(c.slug); };
    box.appendChild(a);
  });
}
$('menuBtn').addEventListener('click',openDrawer);
$('drawerClose').addEventListener('click',closeDrawer);
$('overlay').addEventListener('click',closeDrawer);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeDrawer(); });
document.querySelectorAll('.drawer-nav .nav-item[data-action]').forEach(el=>{
  el.addEventListener('click',e=>{
    const act=el.getAttribute('data-action');
    if(act==='home'){ e.preventDefault(); closeDrawer(); showHome(); }
    if(act==='search'){ e.preventDefault(); closeDrawer(); $('search').focus(); }
  });
});

/* ---------- Busca ---------- */
$('search').addEventListener('input',e=>{
  const term=e.target.value.trim();
  if(!term){ showHome(); return; }
  showSearch(term);
});

$('backBtn').addEventListener('click',showHome);

/* ---------- Lightbox (ver imagem ampliada) ---------- */
function openLightbox(src){
  const lb=$('lightbox'); $('lightboxImg').src=src; lb.classList.add('open');
}
function closeLightbox(){ const lb=$('lightbox'); lb.classList.remove('open'); $('lightboxImg').src=''; }
$('lbClose').addEventListener('click',closeLightbox);
$('lightbox').addEventListener('click',e=>{ if(e.target.id==='lightbox') closeLightbox(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeLightbox(); });

/* ---------- Musica de fundo ---------- */
function setupMusic(url){
  const player=$('musicPlayer');
  const audio=$('bgMusic');
  const toggle=$('musicToggle');
  const vol=$('musicVol');
  if(!url){ player.style.display='none'; return; }
  player.style.display='flex';
  audio.src=url;
  // volume salvo pelo visitante
  let saved=parseInt(localStorage.getItem('k1_vol'),10);
  if(isNaN(saved)) saved=40;
  vol.value=saved; audio.volume=saved/100;
  function updateIcon(){ toggle.innerHTML = audio.paused ? '&#9654;' : '&#10073;&#10073;'; }
  vol.addEventListener('input',()=>{ audio.volume=vol.value/100; localStorage.setItem('k1_vol',vol.value); if(audio.paused && vol.value>0){ audio.play().catch(()=>{}); } });
  toggle.addEventListener('click',()=>{ if(audio.paused){ audio.play().catch(()=>{}); } else { audio.pause(); } updateIcon(); });
  audio.addEventListener('play',updateIcon);
  audio.addEventListener('pause',updateIcon);
  // tenta iniciar automaticamente; se o navegador bloquear, inicia no 1o clique do usuario
  audio.play().then(updateIcon).catch(()=>{
    updateIcon();
    const once=()=>{ audio.play().then(updateIcon).catch(()=>{}); document.removeEventListener('click',once); document.removeEventListener('keydown',once); };
    document.addEventListener('click',once); document.addEventListener('keydown',once);
  });
}

/* ---------- Som ao clicar nas categorias ---------- */
function playClickSound(){
  if(!CLICK_SOUND_URL) return;
  try{ const a=new Audio(CLICK_SOUND_URL); a.volume=0.7; a.play().catch(()=>{}); }catch(e){}
}

/* ---------- Plano de fundo ---------- */
function applyBackground(url){
  const el=$('bg-photo');
  if(url){ el.style.backgroundImage='url("'+url+'")'; document.body.classList.add('has-bg'); }
  else { el.style.backgroundImage=''; document.body.classList.remove('has-bg'); }
}

/* ---------- Init ---------- */
async function init(){
  CATEGORIES=await getJSON('/api/categories');
  ITEMS=await getJSON('/api/items');
  const settings=await getJSON('/api/settings');
  applyBackground(settings && settings.backgroundImage);
  setupMusic(settings && settings.backgroundMusic);
  CLICK_SOUND_URL=(settings && settings.clickSound) || null;
  renderCategories();
  showHome();
}
init();
