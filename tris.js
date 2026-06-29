/* ===== Enathlon — Tris (vs AI) ===== */
import { t, getLang } from '../../shared/i18n.js';
import { avatarSVG } from '../../shared/avatars.js';
import * as auth from '../../shared/auth.js';
import * as store from '../../shared/store.js';

const $ = (s) => document.querySelector(s);
function toast(m){ const e=$('#toast'); e.textContent=m; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),1800); }
document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let board, turn, over, scores = { you:0, opp:0 };

const me = await auth.current();
if (!me) location.href = '../../index.html';
$('#youName').textContent = me.nick;
$('#youAv').innerHTML = avatarSVG(me);
$('#oppAv').innerHTML = avatarSVG({ animal:'owl', shirt:'#00A0A3', pants:'#007A7D' });

function markSVG(p){
  return p === 'X'
    ? '<svg viewBox="0 0 40 40"><line x1="9" y1="9" x2="31" y2="31" stroke="#3aa0d8" stroke-width="6" stroke-linecap="round"/><line x1="31" y1="9" x2="9" y2="31" stroke="#3aa0d8" stroke-width="6" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="12" fill="none" stroke="#1FC5A8" stroke-width="6"/></svg>';
}
function build(){ const b=$('#board'); b.innerHTML='';
  for(let i=0;i<9;i++){ const c=document.createElement('div'); c.className='cell'; c.dataset.i=i; c.onclick=()=>play(i); b.appendChild(c); } }
function status(){ if(over) return;
  $('#status').innerHTML = turn==='X' ? `<span class="hl">${t('yourTurnMsg')}</span>` : t('oppTurnMsg');
  $('#pYou').classList.toggle('turn', turn==='X'); $('#pOpp').classList.toggle('turn', turn==='O'); }
function place(i,p){ board[i]=p; const c=document.querySelector(`.cell[data-i="${i}"]`); c.innerHTML=markSVG(p); c.classList.add('filled'); }

function play(i){
  if(over || board[i] || turn!=='X') return;
  place(i,'X'); if(check()) return;
  turn='O'; status(); setTimeout(aiMove, 600);
}
function aiMove(){
  if(over) return;
  const empty = board.map((v,i)=>v?null:i).filter(v=>v!==null);
  const move = findWin('O') ?? findWin('X') ?? (board[4]?null:4) ?? empty[Math.floor(Math.random()*empty.length)];
  place(move,'O'); if(check()) return; turn='X'; status();
}
function findWin(p){ for(const [a,b,c] of WINS){ const line=[board[a],board[b],board[c]];
  if(line.filter(v=>v===p).length===2 && line.includes('')) return [a,b,c][line.indexOf('')]; } return null; }

async function check(){
  for(const line of WINS){ const [a,b,c]=line;
    if(board[a] && board[a]===board[b] && board[b]===board[c]){
      over=true; line.forEach(i=>document.querySelector(`.cell[data-i="${i}"]`).classList.add('win'));
      if(board[a]==='X'){ scores.you++; $('#youScore').textContent=scores.you; $('#status').innerHTML=`<span class="hl">${t('youWin')}</span>`; await store.addPoints(me.nick, 3); }
      else { scores.opp++; $('#oppScore').textContent=scores.opp; $('#status').textContent=t('oppWin'); }
      $('#pYou').classList.remove('turn'); $('#pOpp').classList.remove('turn'); return true;
    } }
  if(board.every(v=>v)){ over=true; $('#status').textContent=t('draw'); await store.addPoints(me.nick, 1); return true; }
  return false;
}
function reset(){ board=['','','','','','','','','']; turn='X'; over=false; build(); status(); }
$('#rematch').onclick = reset;
reset();
