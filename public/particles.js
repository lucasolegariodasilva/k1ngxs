// Particulas animadas no fundo do site (canvas, sem bibliotecas externas).
(function(){
  const canvas=document.getElementById('bg-particles');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let W,H,particles=[];
  const COLOR='255,59,71'; // combina com a cor de destaque (vermelho)
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
    const target=Math.min(110,Math.floor(W*H/14000));
    particles=[];
    for(let i=0;i<target;i++){
      particles.push({
        x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-0.5)*0.4, vy:(Math.random()-0.5)*0.4,
        r:Math.random()*1.8+0.6
      });
    }
  }

  const mouse={x:null,y:null};
  window.addEventListener('mousemove',e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
  window.addEventListener('mouseout',()=>{ mouse.x=null; mouse.y=null; });

  function step(){
    ctx.clearRect(0,0,W,H);
    for(const p of particles){
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>W) p.vx*=-1;
      if(p.y<0||p.y>H) p.vy*=-1;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba('+COLOR+',0.7)';
      ctx.fill();
    }
    // linhas entre particulas proximas
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const a=particles[i],b=particles[j];
        const dx=a.x-b.x, dy=a.y-b.y; const d=dx*dx+dy*dy;
        if(d<13000){
          const op=1-d/13000;
          ctx.strokeStyle='rgba('+COLOR+','+(op*0.35)+')';
          ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
      // conecta com o mouse
      if(mouse.x!=null){
        const a=particles[i];
        const dx=a.x-mouse.x, dy=a.y-mouse.y; const d=dx*dx+dy*dy;
        if(d<22000){
          const op=1-d/22000;
          ctx.strokeStyle='rgba('+COLOR+','+(op*0.5)+')';
          ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(mouse.x,mouse.y); ctx.stroke();
        }
      }
    }
    if(!reduce) requestAnimationFrame(step);
  }

  window.addEventListener('resize',resize);
  resize();
  if(reduce){ step(); } else { requestAnimationFrame(step); }
})();
