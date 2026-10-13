const $ = id => document.getElementById(id);
async function getJSON(url){ const r=await fetch(url); return r.json(); }
function msg(el,text,type){ el.innerHTML=''; if(!text) return; const d=document.createElement('div'); d.className='msg '+(type||'ok'); d.textContent=text; el.appendChild(d); }

let CATEGORIES=[];

async function checkAuth(){
  const {user}=await getJSON('/api/me');
  if(user){ showAdmin(); } else { showLogin(); }
}
function showLogin(){ $('loginView').style.display='flex'; $('adminView').style.display='none'; $('logoutBtn').style.display='none'; }
function showAdmin(){ $('loginView').style.display='none'; $('adminView').style.display='block'; $('logoutBtn').style.display='inline-block'; loadAll(); }

$('loginForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('username').value,password:$('password').value})});
  const data=await r.json();
  if(r.ok){ showAdmin(); } else { msg($('loginMsg'),data.error||'Falha ao entrar','err'); }
});
$('logoutBtn').addEventListener('click', async e=>{ e.preventDefault(); await fetch('/api/logout',{method:'POST'}); showLogin(); });

async function loadAll(){ await loadCategories(); await loadItems(); await loadSettings(); }

async function loadSettings(){
  const s=await getJSON('/api/settings');
  const prev=$('bgPreview');
  if(s && s.backgroundImage){ prev.style.backgroundImage='url("'+s.backgroundImage+'")'; prev.textContent=''; }
  else { prev.style.backgroundImage=''; prev.textContent='Nenhuma imagem definida'; }
  const mc=$('musicCurrent');
  if(mc){ mc.textContent = (s && s.backgroundMusic) ? ('M\u00fasica definida: '+s.backgroundMusic.split('/').pop()) : 'Nenhuma m\u00fasica definida'; }
  const cc=$('clickCurrent');
  if(cc){ cc.textContent = (s && s.clickSound) ? ('Som definido: '+s.clickSound.split('/').pop()) : 'Nenhum som definido'; }
}

async function loadCategories(){
  CATEGORIES=await getJSON('/api/categories');
  const sel=$('categoryId'); sel.innerHTML='';
  CATEGORIES.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o); });
  const list=$('catList'); list.innerHTML='';
  CATEGORIES.forEach(c=>{
    const row=document.createElement('div'); row.className='cat-admin-item';
    const thumb=document.createElement('div'); thumb.className='cat-thumb';
    if(c.image){ const img=document.createElement('img'); img.src=c.image; img.alt=c.name; thumb.appendChild(img); }
    else { thumb.classList.add('ph'); thumb.textContent=(c.name||'?').charAt(0).toUpperCase(); }
    row.appendChild(thumb);
    const info=document.createElement('div'); info.className='info';
    const nm=document.createElement('b'); nm.textContent=c.name; info.appendChild(nm);
    const st=document.createElement('span'); st.textContent=(c.image?'com imagem':'sem imagem')+(c.banner?' \u00b7 banner personalizado':''); info.appendChild(st);
    row.appendChild(info);
    const change=document.createElement('button'); change.className='btn ghost'; change.style.width='auto';
    change.textContent=c.image?'Trocar imagem':'Adicionar imagem';
    change.onclick=()=>pickCategoryImage(c);
    row.appendChild(change);
    const chb=document.createElement('button'); chb.className='btn ghost'; chb.style.width='auto';
    chb.textContent=c.banner?'Trocar banner':'Definir banner';
    chb.onclick=()=>pickCategoryBanner(c);
    row.appendChild(chb);
    if(c.banner){
      const rmb=document.createElement('button'); rmb.className='btn ghost'; rmb.style.width='auto'; rmb.textContent='Remover banner';
      rmb.onclick=async()=>{ const fd=new FormData(); fd.append('removeBanner','1'); const r=await fetch('/api/categories/'+c.id,{method:'POST',body:fd}); if(r.ok){ msg($('catMsg'),'Banner removido.','ok'); loadCategories(); } };
      row.appendChild(rmb);
    }
    const b=document.createElement('button'); b.className='btn danger'; b.style.width='auto'; b.textContent='Excluir';
    b.onclick=async()=>{ if(!confirm('Excluir a categoria "'+c.name+'" e todos os seus arquivos?')) return; await fetch('/api/categories/'+c.id,{method:'DELETE'}); loadAll(); };
    row.appendChild(b);
    list.appendChild(row);
  });
}

// seleciona e envia uma nova imagem para uma categoria existente
function pickCategoryImage(cat){
  const input=$('catImageEdit');
  input.value='';
  input.onchange=async()=>{
    if(!input.files[0]) return;
    const fd=new FormData(); fd.append('image',input.files[0]);
    msg($('catMsg'),'Enviando imagem...','ok');
    const r=await fetch('/api/categories/'+cat.id,{method:'POST',body:fd});
    const data=await r.json();
    if(r.ok){ msg($('catMsg'),'Imagem atualizada!','ok'); loadCategories(); }
    else msg($('catMsg'),data.error||'Erro','err');
  };
  input.click();
}

// seleciona e envia um novo banner (imagem da tela da categoria)
function pickCategoryBanner(cat){
  const input=$('catImageEdit');
  input.value='';
  input.onchange=async()=>{
    if(!input.files[0]) return;
    const fd=new FormData(); fd.append('banner',input.files[0]);
    msg($('catMsg'),'Enviando banner...','ok');
    const r=await fetch('/api/categories/'+cat.id,{method:'POST',body:fd});
    const data=await r.json();
    if(r.ok){ msg($('catMsg'),'Banner atualizado!','ok'); loadCategories(); }
    else msg($('catMsg'),data.error||'Erro','err');
  };
  input.click();
}

$('catForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const name=$('catName').value.trim(); if(!name) return;
  const fd=new FormData(); fd.append('name',name);
  if($('catImage').files[0]) fd.append('image',$('catImage').files[0]);
  const r=await fetch('/api/categories',{method:'POST',body:fd});
  const data=await r.json();
  if(r.ok){ $('catForm').reset(); msg($('catMsg'),'Categoria criada!','ok'); loadCategories(); }
  else msg($('catMsg'),data.error||'Erro','err');
});

$('itemForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const fd=new FormData();
  fd.append('title',$('title').value);
  fd.append('categoryId',$('categoryId').value);
  fd.append('description',$('description').value);
  if($('preview').files[0]) fd.append('preview',$('preview').files[0]);
  if($('file').files[0]) fd.append('file',$('file').files[0]);
  msg($('itemMsg'),'Enviando...','ok');
  const r=await fetch('/api/items',{method:'POST',body:fd});
  const data=await r.json();
  if(r.ok){ e.target.reset(); msg($('itemMsg'),'Publicado com sucesso!','ok'); loadItems(); }
  else msg($('itemMsg'),data.error||'Erro ao publicar','err');
});

async function loadItems(){
  const items=await getJSON('/api/items');
  const list=$('itemList'); list.innerHTML='';
  if(!items.length){ const p=document.createElement('div'); p.className='empty'; p.textContent='Nenhuma publicacao ainda.'; list.appendChild(p); return; }
  items.forEach(it=>{
    const row=document.createElement('div'); row.className='list-item';
    let thumb;
    if(it.previewType==='video'){ thumb=document.createElement('video'); thumb.src=it.preview; thumb.muted=true; }
    else if(it.previewType==='image'){ thumb=document.createElement('img'); thumb.src=it.preview; }
    else { thumb=document.createElement('div'); thumb.textContent='\u266A'; thumb.style.cssText='width:64px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--surface);border-radius:6px;color:var(--muted)'; }
    row.appendChild(thumb);
    const info=document.createElement('div'); info.className='info';
    const b=document.createElement('b'); b.textContent=it.title; info.appendChild(b);
    const s=document.createElement('span'); s.textContent=it.categoryName; info.appendChild(s);
    row.appendChild(info);
    const del=document.createElement('button'); del.className='btn danger'; del.style.width='auto'; del.textContent='Excluir';
    del.onclick=async()=>{ if(!confirm('Excluir "'+it.title+'"?')) return; await fetch('/api/items/'+it.id,{method:'DELETE'}); loadItems(); };
    row.appendChild(del);
    list.appendChild(row);
  });
}

$('bgForm').addEventListener('submit', async e=>{
  e.preventDefault();
  if(!$('bgImage').files[0]){ msg($('bgMsg'),'Escolha uma imagem','err'); return; }
  const fd=new FormData(); fd.append('background',$('bgImage').files[0]);
  msg($('bgMsg'),'Enviando...','ok');
  const r=await fetch('/api/settings',{method:'POST',body:fd});
  const data=await r.json();
  if(r.ok){ $('bgForm').reset(); msg($('bgMsg'),'Plano de fundo aplicado! Abra o site para ver.','ok'); loadSettings(); }
  else msg($('bgMsg'),data.error||'Erro','err');
});
$('bgRemove').addEventListener('click', async ()=>{
  if(!confirm('Remover o plano de fundo do site?')) return;
  const fd=new FormData(); fd.append('remove','1');
  const r=await fetch('/api/settings',{method:'POST',body:fd});
  if(r.ok){ msg($('bgMsg'),'Plano de fundo removido.','ok'); loadSettings(); }
});

$('musicForm').addEventListener('submit', async e=>{
  e.preventDefault();
  if(!$('musicFile').files[0]){ msg($('musicMsg'),'Escolha um arquivo de \u00e1udio','err'); return; }
  const fd=new FormData(); fd.append('music',$('musicFile').files[0]);
  msg($('musicMsg'),'Enviando...','ok');
  const r=await fetch('/api/settings',{method:'POST',body:fd});
  let data={}; try{ data=await r.json(); }catch(_){}
  if(r.ok){ $('musicForm').reset(); msg($('musicMsg'),'M\u00fasica aplicada! Abra o site para ouvir.','ok'); loadSettings(); }
  else msg($('musicMsg'),data.error||'Erro','err');
});
$('musicRemove').addEventListener('click', async ()=>{
  if(!confirm('Remover a m\u00fasica de fundo?')) return;
  const fd=new FormData(); fd.append('removeMusic','1');
  const r=await fetch('/api/settings',{method:'POST',body:fd});
  if(r.ok){ msg($('musicMsg'),'M\u00fasica removida.','ok'); loadSettings(); }
});

$('clickForm').addEventListener('submit', async e=>{
  e.preventDefault();
  if(!$('clickFile').files[0]){ msg($('clickMsg'),'Escolha um arquivo de \u00e1udio','err'); return; }
  const fd=new FormData(); fd.append('clickSound',$('clickFile').files[0]);
  msg($('clickMsg'),'Enviando...','ok');
  const r=await fetch('/api/settings',{method:'POST',body:fd});
  let data={}; try{ data=await r.json(); }catch(_){}
  if(r.ok){ $('clickForm').reset(); msg($('clickMsg'),'Som aplicado! Ser\u00e1 tocado quando clicarem numa categoria.','ok'); loadSettings(); }
  else msg($('clickMsg'),data.error||'Erro','err');
});
$('clickRemove').addEventListener('click', async ()=>{
  if(!confirm('Remover o som de clique?')) return;
  const fd=new FormData(); fd.append('removeClickSound','1');
  const r=await fetch('/api/settings',{method:'POST',body:fd});
  if(r.ok){ msg($('clickMsg'),'Som removido.','ok'); loadSettings(); }
});

checkAuth();
