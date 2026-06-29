/* ===== Enathlon — Onboarding + Lobby controller ===== */
import { t, getLang, setLang, STR } from './i18n.js';
import { ANIMALS, AVATAR_COLORS, avatarSVG } from './avatars.js';
import { GAMES } from './games.js';
import * as auth from './auth.js';
import * as store from './store.js';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window._t); window._t=setTimeout(()=>el.classList.remove('show'),2000); }

/* applica le stringhe a tutti gli elementi [data-t] */
function applyI18n(){
  $$('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
  document.documentElement.lang = getLang();
}
function langToggle(containerId, after){
  const c = $('#'+containerId); if(!c) return; c.innerHTML='';
  ['it','en'].forEach(l => {
    const b = document.createElement('div');
    b.className = 'lang-btn' + (getLang()===l ? ' active' : '');
    b.textContent = l.toUpperCase();
    b.onclick = () => { setLang(l); applyI18n(); buildAllLangToggles(); after && after(); };
    c.appendChild(b);
  });
}
function buildAllLangToggles(){ ['obLang','lobbyLang','gearLang'].forEach(id => langToggle(id, refreshDynamic)); }
function refreshDynamic(){ if(!$('#lobby').classList.contains('hidden')) LB.render(); else OB.refresh(); }

/* ============ ONBOARDING ============ */
const ORDER = ['s-welcome','s-nick','s-pin','s-avatar','s-done'];
const draft = { nick:'', pin:'', animal:'fox', shirt:'#006894', pants:'#004f70' };
let curScreen = 's-welcome';

const OB = {
  go(id){ $('#'+curScreen).classList.remove('on'); $('#'+id).classList.add('on'); curScreen=id; OB.steps();
    if(id==='s-avatar') OB.buildAvatar();
    if(id==='s-done'){ $('#doneAvatar').innerHTML = avatarSVG(draft); } },
  steps(){ const w=$('#obSteps'); const idx=ORDER.indexOf(curScreen); if(idx<0){w.innerHTML='';return;}
    w.innerHTML=''; ORDER.forEach((_,i)=>{ const d=document.createElement('div'); d.className='dot'+(i<=idx?' on':''); w.appendChild(d); }); },
  async checkNick(){ const v=$('#nickInput').value.trim(); const el=$('#avail'); const btn=$('#nickNext');
    if(v.length<2){ el.textContent=''; el.className='avail'; btn.disabled=true; return; }
    const ok = await auth.isNickAvailable(v);
    el.textContent = ok ? t('available') : t('taken'); el.className='avail '+(ok?'ok':'no');
    btn.disabled = !ok; if(ok) draft.nick=v; },
  checkPin(){ const a=$('#pin1'), b=$('#pin2'); a.value=a.value.replace(/\D/g,''); b.value=b.value.replace(/\D/g,'');
    const msg=$('#pinMsg'), btn=$('#pinNext');
    if(a.value.length===4 && b.value.length===4 && a.value!==b.value){ msg.textContent=t('pinMismatch'); btn.disabled=true; return; }
    msg.textContent=''; if(a.value.length===4 && a.value===b.value){ draft.pin=a.value; btn.disabled=false; } else btn.disabled=true; },
  buildAvatar(){
    $('#obAvatar').innerHTML = avatarSVG(draft);
    const g=$('#obGrid'); g.innerHTML='';
    Object.entries(ANIMALS).forEach(([k,a])=>{ const b=document.createElement('div'); b.className='ab'+(k===draft.animal?' active':''); b.textContent=a.emoji;
      b.onclick=()=>{ draft.animal=k; OB.buildAvatar(); }; g.appendChild(b); });
    OB.sw('obShirt','shirt'); OB.sw('obPants','pants'); },
  sw(id,key){ const c=$('#'+id); c.innerHTML=''; AVATAR_COLORS.forEach(col=>{ const s=document.createElement('div'); s.className='swatch'+(col===draft[key]?' active':''); s.style.background=col;
    s.onclick=()=>{ draft[key]=col; OB.buildAvatar(); }; c.appendChild(s); }); },
  async create(){ try { await auth.register({ ...draft, remember:true }); OB.go('s-done'); }
    catch(e){ toast(t('taken')); OB.go('s-nick'); } },
  enter(){ showLobby(); },
  async login(){ const nick=$('#loginNick').value.trim(); const pin=$('#loginPin').value; const remember=$('#remember').checked;
    const p = await auth.login({ nick, pin, remember });
    if(p) showLobby(); else toast('⚠ '+t('badLogin')); },
  refresh(){ OB.steps(); if(curScreen==='s-avatar') OB.buildAvatar(); $('#nickInput')&&OB.checkNick(); },
};
window.OB = OB;

/* ============ LOBBY ============ */
const LB = {
  toggleGear(){ $('#gearMenu').classList.toggle('open'); },
  logout(){ auth.logout(); location.reload(); },
  async render(){
    // games
    const grid=$('#gameGrid'); grid.innerHTML='';
    GAMES.forEach(g=>{ const c=document.createElement('div'); c.className='gcard';
      c.innerHTML = `<div class="ic">${g.icon}</div><div class="nm">${t(g.key)}</div><div class="pl">${g.players}</div>`+
        (g.status==='soon' ? `<div class="soon">${t('soon')}</div>` : ``);
      c.onclick=()=>LB.openGame(g); grid.appendChild(c); });
    // ongoing
    const me = await auth.current();
    const ol=$('#ongoingList'); ol.innerHTML='';
    const matches = me ? await store.matchesFor(me.nick) : [];
    if(!matches.length){ ol.innerHTML=`<div class="row" style="color:var(--text-mut)">${t('noOngoing')}</div>`; }
    matches.forEach(m=>{ const g=GAMES.find(x=>x.id===m.game); const yourTurn=m.turn===me.nick;
      const opp=m.players.find(p=>p!==me.nick)||'AI';
      const r=document.createElement('div'); r.className='row';
      r.innerHTML=`<span class="em">${g?g.icon:'🎮'}</span><span class="nm">${g?t(g.key):m.game} ${t('vs')} ${opp}</span>`+
        `<span style="font-size:10px;font-weight:800;color:${yourTurn?'#1FC5A8':'#b5892a'}">${yourTurn?t('yourTurn'):t('waiting')}</span>`;
      r.style.cursor='pointer'; r.onclick=()=>{ if(g) location.href=g.path+'?match='+m.id; };
      ol.appendChild(r); });
    // leaderboard
    const ll=$('#leaderList'); ll.innerHTML='';
    const lead = await store.leaderboard();
    lead.slice(0,8).forEach((p,i)=>{ const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'';
      const r=document.createElement('div'); r.className='row';
      r.innerHTML=`<span style="width:18px;font-weight:900;color:var(--text-mut)">${medal}</span><span class="em">${ANIMALS[p.animal]?.emoji||'🐾'}</span>`+
        `<span class="nm">${p.nick}${me&&p.nick===me.nick?' <span class=me-badge>tu</span>':''}</span><span class="pts">${p.points||0}</span>`;
      ll.appendChild(r); });
  },
  openGame(g){
    if(g.status!=='ready'){ toast(t(g.key)+' — '+t('comingSoon')); return; }
    location.href = g.path + '?mode=ai';
  },
};
window.LB = LB;

function showLobby(){ location.href = 'lobby.html'; }
function showOnboarding(){
  $('#lobby').classList.add('hidden');
  $('#onboarding').classList.remove('hidden');
  applyI18n(); buildAllLangToggles(); OB.steps();
}
document.addEventListener('click', e => { if(!e.target.closest('#gearMenu') && !e.target.closest('.btn-ghost')) $('#gearMenu')?.classList.remove('open'); });

/* ============ ACCESS GATE ============ */
function showGate(){
  $('#gate').classList.remove('hidden');
  $('#onboarding').classList.add('hidden');
  applyI18n(); buildAllLangToggles();
  const submit = () => {
    if (store.tryAccess($('#gateCode').value.trim())) { $('#gate').classList.add('hidden'); afterGate(); }
    else { $('#gateErr').textContent = t('gateErr'); }
  };
  $('#gateBtn').onclick = submit;
  $('#gateCode').onkeydown = (e) => { if(e.key==='Enter') submit(); };
}
async function afterGate(){
  const me = await auth.current();
  if(me) showLobby(); else showOnboarding();
}

/* ============ BOOT ============ */
(async function(){
  applyI18n(); buildAllLangToggles();
  if (!store.isAccessGranted()) showGate();
  else afterGate();
})();
