/* FitPulse — application logic.
 * Loaded after js/data.js (which provides PRODUCTS, WEEK, UPCOMING, LIVE_USERS, LIVE_MSGS, SHORTS).
 */
/* ---------- check-icon templates injected into membership lists ---------- */
const check  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A909B" stroke-width="2.6"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const checkv = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D7FF3E" stroke-width="2.6"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
document.querySelectorAll('.plan li').forEach(li=>{ li.innerHTML = li.innerHTML.replace('${check}',check).replace('${checkv}',checkv); });

/* ===================== ROUTING ===================== */
let stack=['home'];
const screensEl = document.querySelectorAll('.screen');
function activate(id){
  screensEl.forEach(s=>s.classList.toggle('active', s.id===id));
  const tab = document.getElementById(id).dataset.tab;
  document.querySelectorAll('.navb').forEach(n=>n.classList.toggle('on', n.dataset.go===tab));
  const el=document.getElementById(id); el.scrollTop=0;
  if(id==='home'){ runCounts(el); animateSteps(); }
  if(id==='schedule') initSchedule();
  if(id==='live') renderUpcoming();
  if(id==='shorts'){ if(!shortsReady){ renderShorts(); shortsReady=true; } }
  if(id==='card') renderCard();
  if(id==='liveroom'){ startLive(); } else { stopLive(); }
}
function go(id, isTab){
  if(isTab){ stack=[id]; } else if(stack[stack.length-1]!==id){ stack.push(id); }
  activate(id);
}
function back(){ stack.pop(); activate(stack[stack.length-1]||'home'); }
function goHome(){ go('home',true); }
document.querySelectorAll('.navb').forEach(n=> n.addEventListener('click',()=>go(n.dataset.go,true)) );

/* ===================== SWIPE NAVIGATION (live drag) ===================== */
(function(){
  const TAB_ORDER=['home','live','shorts','schedule','shop','profile'];
  const app=document.getElementById('app');
  const COMMIT=0.32;     // fraction of width needed to commit a switch
  const VELO=0.45;       // px/ms flick velocity that commits regardless of distance
  const LOCK=10;         // px before we decide the gesture is horizontal

  let W=app.clientWidth||360;
  let sx=0, sy=0, st=0, lastX=0, lastT=0, velo=0;
  let active=null, peek=null, dir=0, decided=false, dragging=false, ignore=false;

  function overlayOpen(){ return !!document.querySelector('.sheet.show, .overlay.show'); }
  function inHScroller(node){
    while(node && node!==app){
      if(node.classList && (node.classList.contains('chips')||node.classList.contains('rec-row'))) return true;
      if(node.scrollWidth-node.clientWidth>8){
        const ov=getComputedStyle(node).overflowX;
        if(ov==='auto'||ov==='scroll') return true;
      }
      node=node.parentElement;
    }
    return false;
  }
  // What screen would a swipe in `d` (-1 = swipe-left/next, +1 = swipe-right/prev) reveal?
  function targetFor(d){
    const cur=document.querySelector('.screen.active'); if(!cur) return null;
    const idx=TAB_ORDER.indexOf(cur.id);
    if(idx!==-1){                                   // main tab → wrap around
      const n=(idx+(d<0?1:-1)+TAB_ORDER.length)%TAB_ORDER.length;
      return {el:document.getElementById(TAB_ORDER[n]), kind:'tab'};
    }
    if(d>0 && stack.length>1){                      // sub-page → swipe right = back
      return {el:document.getElementById(stack[stack.length-2]), kind:'back'};
    }
    return null;
  }

  function start(t,target){
    sx=lastX=t.clientX; sy=t.clientY; st=lastT=Date.now(); velo=0;
    decided=false; dragging=false; dir=0; active=null; peek=null;
    ignore = overlayOpen() || inHScroller(target);
  }
  function setupPeek(d){
    active=document.querySelector('.screen.active'); if(!active) return false;
    const tgt=targetFor(d); if(!tgt||!tgt.el){ return false; }
    peek=tgt.el;
    W=app.clientWidth||W;
    active.classList.add('dragging');
    peek.classList.add('dragging','swipe-peek');
    peek.style.transform='translateX('+(d<0?W:-W)+'px)';
    dir=d;
    return true;
  }
  function move(x){
    let dx=x-sx;
    // rubber-band when there's nothing to reveal in that direction
    if(!peek) dx*=0.28;
    const off = peek ? dx : dx;
    active.style.transform='translateX('+off+'px)';
    if(peek) peek.style.transform='translateX('+(off+(dir<0?W:-W))+'px)';
  }
  function settle(commit){
    const a=active, p=peek, d=dir;
    function cleanup(){
      if(a){ a.classList.remove('dragging','swipe-anim'); a.style.transform=''; }
      if(p){ p.classList.remove('dragging','swipe-anim','swipe-peek'); p.style.transform=''; }
    }
    if(commit && p){
      a.classList.add('swipe-anim'); p.classList.add('swipe-anim');
      // current slides fully out; target slides to center
      a.style.transform='translateX('+(d<0?-W:W)+'px)';
      p.style.transform='translateX(0px)';
      const done=()=>{ p.removeEventListener('transitionend',done);
        cleanup();
        // commit routing state without re-animating
        const cur=document.querySelector('.screen.active');
        const idx=TAB_ORDER.indexOf(cur?cur.id:'');
        if(idx!==-1){ go(p.id,true); } else { back(); }
      };
      p.addEventListener('transitionend',done);
      setTimeout(done,320);             // fallback if transitionend doesn't fire
    }else{
      // rubber-band back to rest
      if(a){ a.classList.add('swipe-anim'); a.style.transform='translateX(0px)'; }
      if(p){ p.classList.add('swipe-anim'); p.style.transform='translateX('+(d<0?W:-W)+'px)'; }
      const a0=a;
      setTimeout(cleanup, 300);
      if(a0) a0.addEventListener('transitionend',function h(){ a0.removeEventListener('transitionend',h); cleanup(); });
    }
    active=null; peek=null; dragging=false; decided=false; dir=0;
  }

  app.addEventListener('touchstart',e=>{
    if(e.touches.length!==1){ ignore=true; return; }
    start(e.touches[0], e.target);
  },{passive:true});

  app.addEventListener('touchmove',e=>{
    if(ignore || e.touches.length!==1) return;
    const t=e.touches[0];
    const dx=t.clientX-sx, dy=t.clientY-sy;
    const now=Date.now();
    if(now!==lastT){ velo=(t.clientX-lastX)/(now-lastT); lastX=t.clientX; lastT=now; }
    if(!decided){
      if(Math.abs(dx)<LOCK && Math.abs(dy)<LOCK) return;     // wait until intent is clear
      if(Math.abs(dy)>Math.abs(dx)){ ignore=true; return; }  // vertical → let it scroll
      decided=true; dragging=true;
      setupPeek(dx<0?-1:1);                                  // may set peek=null (edge → rubber-band)
    }
    if(dragging){ move(t.clientX); }
  },{passive:true});

  app.addEventListener('touchend',()=>{
    if(!dragging){ ignore=false; return; }
    const dx=lastX-sx;
    const passed = Math.abs(dx) > W*COMMIT;
    const flicked = Math.abs(velo) > VELO && (velo<0 ? dir<0 : dir>0);
    settle(!!peek && (passed||flicked));
    ignore=false;
  },{passive:true});

  window.addEventListener('resize',()=>{ W=app.clientWidth||W; });
})();

/* steps ring animation */
function animateSteps(){
  const arc=document.getElementById('stepArc'); if(!arc||arc.dataset.done) return; arc.dataset.done=1;
  const C=2*Math.PI*38, pct=Math.min(8432/10000,1);
  requestAnimationFrame(()=>{ arc.style.strokeDashoffset=(C*(1-pct)).toFixed(2); });
}

/* ===================== count-up ===================== */
function runCounts(scope){
  scope.querySelectorAll('[data-count]').forEach(el=>{
    if(el.dataset.done) return; el.dataset.done=1;
    const target=+el.dataset.count; const dur=1100; const t0=performance.now();
    (function tick(t){ const p=Math.min((t-t0)/dur,1); const e=1-Math.pow(1-p,3);
      el.textContent=Math.round(target*e).toLocaleString(); if(p<1) requestAnimationFrame(tick); })(t0);
  });
}

/* ===================== TOAST ===================== */
let toastT;
function toast(msg){ const t=document.getElementById('toast'); t.innerHTML='<span style="color:var(--volt)">✓</span> '+msg;
  t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),1900); }

/* ===================== SHEETS / OVERLAYS ===================== */
function openSheet(id){ const s=document.getElementById(id); if(id==='cartSheet')renderCart(); if(id==='compareSheet')renderCompare(); s.classList.add('show'); }
function closeSheet(id){ document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('.sheet').forEach(sh=> sh.addEventListener('click',e=>{ if(e.target===sh) sh.classList.remove('show'); }));
function openCompare(){ openSheet('compareSheet'); }

/* ===================== PAYMENT ===================== */
let annual=false, auto=true;
function selPay(el){ document.querySelectorAll('#payment .pay-opt').forEach(p=>p.classList.remove('sel')); el.classList.add('sel'); }
function toggleAuto(){ auto=!auto; document.getElementById('autoTog').classList.toggle('on',auto);
  document.getElementById('nextDate').textContent = auto ? 'Jun 21, 2026' : 'Not scheduled'; }
function toggleAnnual(){
  annual=!annual;
  document.getElementById('annTog').classList.toggle('on',annual);
  if(annual){
    document.getElementById('payPrice').textContent='A$95.04';
    document.getElementById('payCycle').textContent='per year';
    document.getElementById('rowCycle').textContent='Annual Renewal';
    document.getElementById('totalDue').innerHTML='A$95.04<small> /yr</small>';
    document.getElementById('nextDate').textContent= auto ? 'May 21, 2027':'Not scheduled';
  } else {
    document.getElementById('payPrice').textContent='A$9.90';
    document.getElementById('payCycle').textContent='per month';
    document.getElementById('rowCycle').textContent='Monthly Renewal';
    document.getElementById('totalDue').innerHTML='A$9.90<small> /mo</small>';
    document.getElementById('nextDate').textContent= auto ? 'Jun 21, 2026':'Not scheduled';
  }
}
function confirmPay(){
  document.getElementById('succDate').textContent = annual ? 'May 21, 2027' : 'Jun 21, 2026';
  document.getElementById('successOverlay').classList.add('show');
}
function closeSuccess(){ document.getElementById('successOverlay').classList.remove('show'); go('membership',true); }

/* ===================== COMPARE TABLE ===================== */
function renderCompare(){
  const rows=[
    ['Workout videos','✓','✓','✓'],['Weekly plans','✓','✓','✓'],['Community','✓','✓','✓'],
    ['Personal coach','—','✓','✓'],['Nutrition guidance','—','✓','✓'],['AI tracking','—','✓','✓'],
    ['Unlimited classes','—','✓','✓'],['1-on-1 sessions','—','—','✓'],['Custom meal plans','—','—','✓'],['Priority booking','—','—','✓']
  ];
  let h='<table class="nut-table"><tr><td></td><td style="text-align:center;font-weight:800">Basic</td><td style="text-align:center;font-weight:800;color:var(--volt)">Premium</td><td style="text-align:center;font-weight:800">Elite</td></tr>';
  rows.forEach(r=>{ h+='<tr><td style="font-weight:600">'+r[0]+'</td>'+
    [1,2,3].map(i=>'<td style="text-align:center;'+(r[i]==='✓'?'color:'+(i===2?'var(--volt)':'#fff'):'color:var(--muted2)')+'">'+r[i]+'</td>').join('')+'</tr>'; });
  h+='</table><div class="totalbar" style="margin:16px 2px 12px"><div></div><div></div></div>';
  h+='<button class="cta volt" style="width:100%" onclick="closeSheet(\'compareSheet\');go(\'payment\')">Upgrade to Premium · A$9.90/mo</button>';
  document.getElementById('compareBody').innerHTML=h;
}

/* ===================== SHOP / PRODUCTS ===================== */
function tubSVG(c,label,lid){ lid=lid||c; return `<svg viewBox="0 0 90 100" fill="none">
  <rect x="20" y="6" width="50" height="13" rx="5" fill="${lid}"/>
  <path d="M16 22 h58 a4 4 0 0 1 4 4 v62 a8 8 0 0 1-8 8 H20 a8 8 0 0 1-8-8 V26 a4 4 0 0 1 4-4z" fill="${c}"/>
  <rect x="20" y="40" width="42" height="40" rx="6" fill="#0B0C0E" opacity=".82"/>
  <path d="M26 70 h6 l3 5 5-13 4 16 3-8 h7" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <text x="41" y="52" font-family="Anton" font-size="9" fill="${c}" text-anchor="middle">${label}</text></svg>`; }
function jarSVG(c,label){ return `<svg viewBox="0 0 90 100" fill="none">
  <rect x="26" y="8" width="38" height="11" rx="4" fill="#E9EDF2"/>
  <path d="M18 20 h54 v66 a8 8 0 0 1-8 8 H26 a8 8 0 0 1-8-8z" fill="${c}"/>
  <rect x="24" y="40" width="42" height="38" rx="6" fill="#0B0C0E" opacity=".8"/>
  <text x="45" y="63" font-family="Anton" font-size="10" fill="${c}" text-anchor="middle">${label}</text></svg>`; }

function artOf(p){ return p.art==='jar'? jarSVG(p.color,p.art2) : tubSVG(p.color,p.art2); }

let shopCat='featured';
const CAT_LABEL={featured:'Featured Products',protein:'Protein',preworkout:'Pre-Workout',creatine:'Creatine',vitamins:'Vitamins'};
function shopOrder(cat){
  const keys=Object.keys(PRODUCTS);
  return cat==='featured' ? keys.filter(k=>PRODUCTS[k].featured) : keys.filter(k=>PRODUCTS[k].cat===cat);
}
function renderShop(cat){
  if(cat) shopCat=cat;
  const order=shopOrder(shopCat);
  const heading=document.getElementById('shopHeading'); if(heading) heading.textContent=CAT_LABEL[shopCat]||'Products';
  let h='';
  if(!order.length){ h='<div style="text-align:center;color:var(--muted);padding:26px 0">No products in this category yet.</div>'; }
  order.forEach(k=>{ const p=PRODUCTS[k];
    h+=`<div class="prod" onclick="openProduct('${k}')">
      <div class="pimg">${artOf(p)}</div>
      <div class="info">
        <span class="ptag">${p.tag}</span>
        <h4>${p.name}</h4>
        <div class="pflav">${p.sub}</div>
        <div class="pbot"><span class="pprice">A$${p.price}</span>
          <button class="addbtn" onclick="event.stopPropagation();addToCart('${k}',this)">+</button></div>
      </div></div>`; });
  document.getElementById('prodList').innerHTML=h;
}
function filterShop(el,cat){
  document.querySelectorAll('#shop .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  renderShop(cat);
}
function openProduct(k){
  const p=PRODUCTS[k]; document.getElementById('pdTitle').textContent=p.name;
  const stars='★★★★★'.slice(0,Math.round(p.rating))+'☆☆☆☆☆'.slice(0,5-Math.round(p.rating));
  const rec=Object.keys(PRODUCTS).filter(x=>x!==k).slice(0,4);
  let recH=rec.map(rk=>{const r=PRODUCTS[rk];return `<div class="rec-card" onclick="openProduct('${rk}')"><div class="ri">${artOf(r)}</div><h5>${r.name}</h5><div class="rp">A$${r.price}</div></div>`;}).join('');
  let nut=p.nutrition.map(n=>`<tr><td>${n[0]}</td><td>${n[1]}</td></tr>`).join('');
  let revs=p.revs.map(r=>`<div class="review"><div class="rh"><div class="av" style="background:${r[1]}">${r[0][0]}</div><div><div class="rn">${r[0]}</div><div class="stars">★★★★★</div></div></div><div class="rt">${r[2]}</div></div>`).join('');
  document.getElementById('pdBody').innerHTML=`
    <div class="reveal d1 pd-hero"><div class="ring"></div>${artOf(p)}</div>
    <span class="reveal d2 ptag" style="color:${p.color};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em">${p.tag}</span>
    <div class="reveal d2 pd-name">${p.name}</div>
    <div class="reveal d2 pd-sub">${p.sub}</div>
    <div class="reveal d2 pd-pricebar">
      <div class="pd-price">A$${p.price}</div>
      <div class="stars" style="font-size:14px">${stars}<span>${p.rating} · ${p.reviews} reviews</span></div>
    </div>
    <p class="reveal d3 pd-desc">${p.desc}</p>
    <div class="section-h reveal d3"><h3>Nutrition Information</h3></div>
    <div class="reveal d3 card" style="padding:6px 18px"><table class="nut-table">${nut}</table></div>
    <div class="section-h reveal d4"><h3>Product Reviews</h3><span style="font-size:12px;color:var(--muted)">${p.reviews}</span></div>
    <div class="reveal d4">${revs}</div>
    <div class="section-h reveal d5"><h3>Recommended</h3></div>
    <div class="reveal d5 rec-row" style="margin-bottom:20px">${recH}</div>`;
  document.getElementById('pdStickyPrice').textContent='A$'+p.price;
  document.getElementById('pdAdd').onclick=function(){ addToCart(k,this); };
  go('product');
}

/* ===================== CART ===================== */
let cart=[];
function updateBadge(){ const n=cart.reduce((s,i)=>s+i.q,0);
  ['cartIcon','cartIcon2'].forEach(id=>{ const el=document.getElementById(id); el.dataset.c=n; el.classList.toggle('show',n>0);
    el.classList.remove('bump'); void el.offsetWidth; }); }
function addToCart(k,btn){
  const p=PRODUCTS[k]; const ex=cart.find(i=>i.k===k); if(ex)ex.q++; else cart.push({k,q:1});
  flyToCart(btn); updateBadge(); toast(p.name+' added to cart');
}
function flyToCart(btn){
  const target=document.getElementById('product').classList.contains('active')?document.getElementById('cartIcon2'):document.getElementById('cartIcon');
  const b=btn.getBoundingClientRect(), t=target.getBoundingClientRect();
  const f=document.createElement('div'); f.className='fly';
  f.style.left=(b.left+b.width/2-9)+'px'; f.style.top=(b.top+b.height/2-9)+'px';
  document.body.appendChild(f);
  requestAnimationFrame(()=>{ f.style.left=(t.left+t.width/2-9)+'px'; f.style.top=(t.top+t.height/2-9)+'px'; f.style.transform='scale(.3)'; f.style.opacity='.4'; });
  setTimeout(()=>{ f.remove(); target.animate([{transform:'scale(1)'},{transform:'scale(1.3)'},{transform:'scale(1)'}],{duration:300}); },680);
}
function renderCart(){
  const wrap=document.getElementById('cartItems'); const n=cart.reduce((s,i)=>s+i.q,0);
  document.getElementById('cartCount').textContent=n+(n===1?' item':' items');
  if(!cart.length){ wrap.innerHTML='<div style="text-align:center;color:var(--muted);padding:30px 0">Your cart is empty.</div>'; document.getElementById('cartTotal').textContent='A$0.00'; return; }
  let total=0;
  wrap.innerHTML=cart.map(i=>{ const p=PRODUCTS[i.k]; total+=p.price*i.q;
    return `<div class="prod" style="padding:10px"><div class="pimg" style="width:56px;height:62px">${artOf(p)}</div>
      <div class="info"><h4 style="font-size:14px">${p.name}</h4><div class="pflav">Qty ${i.q}</div>
      <div class="pbot"><span class="pprice" style="font-size:18px">A$${(p.price*i.q).toFixed(2)}</span></div></div></div>`; }).join('');
  document.getElementById('cartTotal').textContent='A$'+total.toFixed(2);
}

/* ===================== CHAT ===================== */
function sendChat(){
  const inp=document.getElementById('chatInput'); const v=inp.value.trim(); if(!v)return;
  const m=document.getElementById('chatMsgs');
  m.insertAdjacentHTML('beforeend','<div class="bub me">'+v.replace(/</g,'&lt;')+'</div>'); inp.value=''; m.scrollTop=m.scrollHeight;
  setTimeout(()=>{ m.insertAdjacentHTML('beforeend','<div class="bub them">Got it 👊 Let\'s lock that in for tomorrow.</div>'); m.scrollTop=m.scrollHeight; },900);
}

/* ===================== SCHEDULE ===================== */
let schedInit=false;
function initSchedule(){
  if(schedInit){ return; } schedInit=true;
  const strip=document.getElementById('weekStrip');
  strip.innerHTML=WEEK.map((d,i)=>`<button class="day${d.today?' today':''}" onclick="selectDay(${i})">
    <div class="dn">${d.dn}</div><div class="dd">${d.dd}</div><div class="dpt${d.n?'':' empty'}"></div></button>`).join('');
  // animate goal ring 5/6 = 83%
  const pct=Math.round(5/6*100), circ=220, off=circ-(circ*pct/100);
  setTimeout(()=>{ document.getElementById('goalRing').style.transition='stroke-dashoffset 1.2s ease'; document.getElementById('goalRing').style.strokeDashoffset=off; },200);
  let p=0; const pe=document.getElementById('goalPct'); const iv=setInterval(()=>{ p++; pe.textContent=p+'%'; if(p>=pct)clearInterval(iv); },12);
  renderDayInline(2);
}
function renderDayInline(i){
  const d=WEEK[i]; const full={Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'}[d.dn];
  document.getElementById('dayHeading').textContent=full+(d.today?' · Today':'');
  const list=document.getElementById('dayList');
  if(!d.cls.length){ list.innerHTML='<div class="card" style="text-align:center;color:var(--muted)">Rest day — no sessions scheduled. 🧘</div>'; return; }
  list.innerHTML=d.cls.map(c=>sessHTML(c)).join('');
}
function sessHTML(c){ return `<div class="sched-item"><div class="tm">${c[0]}<small>${c[1]}</small></div>
  <div class="si"><h4>${c[2]}</h4><p>${c[3]}</p></div>
  <div class="scoach" style="background:${c[5]};${c[5]==='#FF4D5E'?'color:#2a0006':''}">${c[4]}</div></div>`; }
function selectDay(i){
  document.querySelectorAll('#weekStrip .day').forEach((el,idx)=>el.classList.toggle('today',idx===i));
  renderDayInline(i);
  // also open detail sheet
  const d=WEEK[i]; const full={Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'}[d.dn];
  document.getElementById('ddTitle').textContent=full+' '+d.dd;
  document.getElementById('ddSub').textContent=d.cls.length?(d.cls.length+' session'+(d.cls.length>1?'s':'')+' scheduled'):'Rest day';
  document.getElementById('ddList').innerHTML=d.cls.length? d.cls.map(c=>sessHTML(c)).join('') : '<div class="card" style="text-align:center;color:var(--muted)">No sessions — enjoy your recovery. 🧘</div>';
  openSheet('dayDetail');
}

/* ===================== AUTH ===================== */
const Store=(()=>{ let mem={},ok=false;
  try{ localStorage.setItem('__fp','1'); localStorage.removeItem('__fp'); ok=true; }catch(e){ ok=false; }
  return {
    get:k=>{ try{ return ok?localStorage.getItem(k):mem[k]; }catch(e){ return mem[k]; } },
    set:(k,v)=>{ try{ ok?localStorage.setItem(k,v):(mem[k]=v); }catch(e){ mem[k]=v; } },
    del:k=>{ try{ ok?localStorage.removeItem(k):(delete mem[k]); }catch(e){ delete mem[k]; } }
  };
})();
function val(id){ const el=document.getElementById(id); return el?(el.value||'').trim():''; }
function validEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function initialsOf(n){ return (n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('')||'U').toUpperCase(); }
function titleCase(s){ return s.replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim(); }

function doSignup(){
  const n=val('suName'), e=val('suEmail'), p=val('suPass'), p2=val('suPass2'), er=document.getElementById('suErr');
  if(!n){ er.textContent='Please enter your name.'; return; }
  if(!validEmail(e)){ er.textContent='Please enter a valid email address.'; return; }
  if(p.length<6){ er.textContent='Password must be at least 6 characters.'; return; }
  if(p!==p2){ er.textContent="Passwords don't match."; return; }
  er.textContent='';
  const acct={name:n, email:e, pass:p};
  Store.set('fp_user', JSON.stringify(acct)); Store.set('fp_session','1');
  setUser(acct); clearAuthFields();
  toast('Account created — welcome, '+n.split(' ')[0]+'!'); goHome();
}
function doLogin(){
  const e=val('liEmail'), p=val('liPass'), er=document.getElementById('liErr');
  if(!validEmail(e)){ er.textContent='Please enter a valid email address.'; return; }
  if(!p){ er.textContent='Please enter your password.'; return; }
  let saved=null; try{ saved=JSON.parse(Store.get('fp_user')||'null'); }catch(_){}
  if(saved && saved.email.toLowerCase()===e.toLowerCase()){
    if(saved.pass!==p){ er.textContent='Incorrect password. Please try again.'; return; }
    er.textContent=''; Store.set('fp_session','1'); setUser(saved); clearAuthFields();
    toast('Welcome back, '+saved.name.split(' ')[0]+'!'); goHome();
  } else {
    // demo mode: accept any valid-looking credentials
    er.textContent=''; const acct={name:titleCase(e.split('@')[0])||'Member', email:e, pass:p};
    Store.set('fp_user', JSON.stringify(acct)); Store.set('fp_session','1');
    setUser(acct); clearAuthFields(); toast('Logged in as '+acct.name); goHome();
  }
}
function clearAuthFields(){ ['suName','suEmail','suPass','suPass2','liEmail','liPass'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); }
function setUser(acct){
  currentUser=acct;
  document.getElementById('profName').textContent=acct.name;
  document.getElementById('profEmail').textContent=acct.email;
  document.getElementById('profAv').textContent=initialsOf(acct.name);
  document.getElementById('homeUser').textContent=acct.name.split(' ')[0];
  document.getElementById('authBtns').style.display='none';
  document.getElementById('signedInBar').style.display='flex';
}
function logout(){
  currentUser=null; Store.del('fp_session');
  document.getElementById('profName').textContent='Guest';
  document.getElementById('profEmail').textContent='Not signed in';
  document.getElementById('profAv').textContent='G';
  document.getElementById('authBtns').style.display='';
  document.getElementById('signedInBar').style.display='none';
  toast('Logged out'); goHome();
}
let currentUser=null;
(function(){ try{ if(Store.get('fp_session')==='1'){ const s=JSON.parse(Store.get('fp_user')||'null'); if(s) setUser(s); } }catch(_){} })();

/* ===================== LIVE ===================== */
function renderUpcoming(){
  const wrap=document.getElementById('liveUpcoming'); if(!wrap||wrap.dataset.done) return; wrap.dataset.done=1;
  wrap.innerHTML=UPCOMING.map(u=>`<div class="live-up">
    <div class="lu-time">${u[0]}<small>${u[1]}</small></div>
    <div class="lu-b"><h4>${u[2]}</h4><p>${u[3]}</p></div>
    <button class="lu-bell" onclick="toast('Reminder set for ${u[2]}')"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.5 21a2 2 0 0 1-3 0" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>`).join('');
}
let liveTimer=null, liveSecs=0;
function enterLiveRoom(host){
  document.getElementById('lrTitle').textContent = host ? 'Your Live Session' : 'Full-Body Burn';
  document.querySelector('#liveroom .ls-coach').textContent = host ? 'You · Hosting' : 'Coach Alex · HIIT';
  go('liveroom');
  if(host) setTimeout(()=>toast("You're live! Say hi to your viewers 👋"),500);
}
function startLive(){
  const feed=document.getElementById('liveChat'); if(!feed) return;
  feed.innerHTML=''; liveSecs=0; updateLiveTime();
  clearInterval(liveTimer);
  liveTimer=setInterval(()=>{ liveSecs++; updateLiveTime(); if(liveSecs%3===0) addLiveMsg(); if(liveSecs%4===0) floatHeart(false); }, 1000);
  addLiveMsg(); addLiveMsg();
}
function stopLive(){ if(liveTimer){ clearInterval(liveTimer); liveTimer=null; } }
function updateLiveTime(){
  const m=String(Math.floor(liveSecs/60)).padStart(2,'0'), s=String(liveSecs%60).padStart(2,'0');
  const t=document.getElementById('liveTime'); if(t)t.textContent=m+':'+s;
  const v=document.getElementById('liveViewers'); if(v)v.textContent=(1240+liveSecs*3).toLocaleString();
}
function addLiveMsg(){
  const feed=document.getElementById('liveChat'); if(!feed) return;
  const u=LIVE_USERS[Math.floor(Math.random()*LIVE_USERS.length)], m=LIVE_MSGS[Math.floor(Math.random()*LIVE_MSGS.length)];
  const d=document.createElement('div'); d.className='lc'; d.innerHTML='<b style="color:'+u[1]+'">'+u[0]+'</b>'+m;
  feed.appendChild(d); feed.scrollTop=feed.scrollHeight;
  while(feed.children.length>40) feed.removeChild(feed.firstChild);
}
function sendLiveMsg(){
  const inp=document.getElementById('liveInput'); const t=(inp.value||'').trim(); if(!t) return;
  const feed=document.getElementById('liveChat');
  const d=document.createElement('div'); d.className='lc me'; d.innerHTML='<b style="color:var(--volt)">You</b>'+t.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  feed.appendChild(d); feed.scrollTop=feed.scrollHeight; inp.value='';
}
function floatHeart(big){
  const stage=document.getElementById('liveStage'); if(!stage) return;
  const h=document.createElement('i'); h.className='fheart';
  h.textContent=['❤️','🔥','💪','👏','⚡'][Math.floor(Math.random()*5)];
  h.style.left=(58+Math.random()*32)+'%'; if(big) h.style.fontSize='30px';
  stage.appendChild(h); setTimeout(()=>h.remove(),2500);
}
function leaveLive(){ stopLive(); back(); }

/* ===================== SHORTS ===================== */
let shortsReady=false;
function fmtK(n){ return n>=1000 ? (n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'k' : ''+n; }
function renderShorts(){
  const feed=document.getElementById('shortsFeed'); if(!feed) return;
  feed.innerHTML=SHORTS.map(s=>`
    <div class="short" style="background:linear-gradient(160deg,${s.g[0]}26,${s.g[1]})">
      <div class="short-play"><svg viewBox="0 0 24 24" fill="rgba(255,255,255,.92)"><circle cx="12" cy="12" r="11" fill="rgba(255,255,255,.14)"/><path d="M10 8.5l6 3.5-6 3.5z"/></svg></div>
      <span class="short-cat" style="color:${s.g[0]}">${s.tag}</span>
      <div class="short-rail">
        <button class="srx ${s.liked?'liked':''}" onclick="likeShort(${s.id},this)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 21s-7-4.6-9.5-9C.9 8.6 2.6 5 6 5c2 0 3 1.2 4 2.5C11 6.2 12 5 14 5c3.4 0 5.1 3.6 3.5 7-2.5 4.4-9.5 9-9.5 9z"/></svg><b>${fmtK(s.likes)}</b></button>
        <button class="srx" onclick="toast('Comments coming soon')"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-5A8 8 0 1 1 21 12z" stroke-linejoin="round"/></svg><b>${fmtK(s.comments)}</b></button>
        <button class="srx" onclick="toast('Link copied!')"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" stroke-linecap="round" stroke-linejoin="round"/></svg><b>Share</b></button>
      </div>
      <div class="short-info"><div class="su">${s.user}</div><div class="stitle">${s.title}</div></div>
    </div>`).join('');
}
function likeShort(id,btn){
  const s=SHORTS.find(x=>x.id===id); if(!s) return;
  s.liked=!s.liked; s.likes+=s.liked?1:-1;
  btn.classList.toggle('liked',s.liked); btn.querySelector('b').textContent=fmtK(s.likes);
}
let postColor='#D7FF3E';
function pickPostColor(el,c){ postColor=c; document.querySelectorAll('#postSheet .swatch').forEach(s=>s.classList.remove('on')); el.classList.add('on'); }
function publishShort(){
  const cap=(document.getElementById('postCap').value||'').trim()||'My new short';
  const handle='@'+(currentUser ? currentUser.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9_]/g,'') : 'you');
  SHORTS.unshift({id:Date.now(),user:handle,title:cap,tag:'New',g:[postColor,'#15171c'],likes:0,comments:0,liked:false});
  shortsReady=true; renderShorts();
  closeSheet('postSheet'); document.getElementById('postCap').value='';
  go('shorts',true);
  toast('Short published! 🎬');
}

/* ===================== MEMBERSHIP CARD ===================== */
const MEMBER_TIER='Premium';          // demo tier: 'Basic' | 'Premium' | 'Elite'
let cardDone=false;
function memberNo(){
  // deterministic 14-digit number derived from the member's name
  const name=(currentUser?currentUser.name:'Kunyihao Zhong');
  let h=2166136261>>>0;
  for(let i=0;i<name.length;i++){ h^=name.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
  let s=''+(4827000000000+ (h% 1000000000));
  s=(s+'0026').slice(0,14);
  return s;
}
function renderCard(){
  if(cardDone) return; cardDone=true;
  const name=(currentUser?currentUser.name:document.getElementById('profName').textContent)||'Kunyihao Zhong';
  const tier=MEMBER_TIER;
  const digits=memberNo();
  const grouped=digits.replace(/(\d{4})(\d{4})(\d{4})(\d{2})/, '$1-$2-$3-$4');
  // tier styling
  const tierEl=document.getElementById('mcTier');
  tierEl.textContent=tier.toUpperCase();
  tierEl.classList.remove('t-basic','t-elite');
  if(tier==='Basic') tierEl.classList.add('t-basic');
  if(tier==='Elite') tierEl.classList.add('t-elite');
  document.getElementById('mcName').textContent=name;
  document.getElementById('mcNo').textContent='FP-'+grouped;
  document.getElementById('mcCode').textContent='FP '+digits.replace(/(\d{4})(\d{4})(\d{4})(\d{2})/, '$1 $2 $3 $4');
  // QR encodes a check-in payload; barcode encodes the numeric member id
  try{
    document.getElementById('mcQR').innerHTML=QR.svg('FITPULSE:'+tier.toUpperCase()+':'+digits, {quiet:2});
  }catch(e){ document.getElementById('mcQR').textContent='QR unavailable'; }
  try{
    document.getElementById('mcBar').innerHTML=Barcode.code128(digits, {height:54});
  }catch(e){ document.getElementById('mcBar').textContent='Barcode unavailable'; }
}

/* ===================== INIT ===================== */
renderShop();
runCounts(document.getElementById('home'));
animateSteps();
renderShorts(); shortsReady=true;
