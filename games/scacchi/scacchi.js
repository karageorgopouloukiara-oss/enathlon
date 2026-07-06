/* ===== Enathlon — Scacchi =====
   Partita ONLINE 1v1 realtime vs collega (Firestore via shared/store.js).
   La logica di legalità mosse è nel modulo puro engine.js. */
import { t } from '../../shared/i18n.js';
import { avatarSVG } from '../../shared/avatars.js';
import * as auth from '../../shared/auth.js';
import * as store from '../../shared/store.js';
import { movesFrom, applyMove, gameStatus, isInCheck, colorOf } from './engine.js';

const $ = (s) => document.querySelector(s);
function toast(m){ const e=$('#toast'); e.textContent=m; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),1800); }
document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));

const GLYPH = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };

const params = new URLSearchParams(location.search);
const matchId = params.get('match');
if (!store.isAccessGranted()) location.href = '../../index.html';
const me = await auth.current();
if (!me || !matchId) location.href = '../../lobby.html';

const m0 = await store.getMatch(matchId);
if (!m0){ toast('Partita non trovata'); setTimeout(()=>location.href='../../lobby.html',1000); throw new Error('match not found'); }

const myColor  = m0.state.colors[me.nick];
const oppColor = myColor === 'w' ? 'b' : 'w';
const oppNick  = m0.players.find(p => p !== me.nick) || '???';

$('#youName').textContent = me.nick;
$('#youAv').innerHTML = avatarSVG(me);
$('#youMark').textContent = myColor === 'w' ? t('ch_white') : t('ch_black');
$('#oppName').textContent = oppNick;
$('#oppMark').textContent = oppColor === 'w' ? t('ch_white') : t('ch_black');
store.getPlayer(oppNick).then(op => { $('#oppAv').innerHTML = avatarSVG(op || { animal:'cat', shirt:'#9b59b6', pants:'#6f3a86' }); });

// Ordine di visualizzazione delle 64 caselle: Bianco vede r 0→7, Nero specchiato.
const viewOrder = [];
if (myColor === 'w'){ for (let r=0;r<8;r++) for (let c=0;c<8;c++) viewOrder.push(r*8+c); }
else { for (let r=7;r>=0;r--) for (let c=7;c>=0;c--) viewOrder.push(r*8+c); }

// costruisci le 64 celle una volta sola
const boardEl = $('#board');
const cells = {}; // index → element
boardEl.innerHTML = '';
for (const i of viewOrder){
  const r = Math.floor(i/8), c = i%8;
  const el = document.createElement('div');
  el.className = 'sq ' + ((r+c)%2 === 0 ? 'light' : 'dark');
  el.onclick = () => onSquare(i);
  boardEl.appendChild(el);
  cells[i] = el;
}

let cur = null;      // ultimo stato match
let selected = null; // casella selezionata (indice) o null
let legal = [];      // mosse legali dalla casella selezionata

function engState(state){ return { board: state.board, castling: state.castling, epTarget: state.epTarget }; }

function render(m){
  cur = m;
  const b = m.state.board;
  const myTurn = m.turn === me.nick && m.status === 'active';
  $('#pYou').classList.toggle('turn', myTurn);
  $('#pOpp').classList.toggle('turn', m.turn === oppNick && m.status === 'active');

  const inCheckColor = isInCheck(b, m.turn === me.nick ? myColor : oppColor) ? (m.turn === me.nick ? myColor : oppColor) : null;
  const kingIdx = inCheckColor ? b.indexOf(inCheckColor === 'w' ? 'K' : 'k') : -1;

  for (const i of viewOrder){
    const el = cells[i];
    const piece = b[i];
    el.innerHTML = piece ? `<span class="pc ${colorOf(piece)}">${GLYPH[piece.toLowerCase()]}</span>` : '';
    el.classList.remove('sel','last','target','cap','check');
    if (m.state.lastMove && (i === m.state.lastMove.from || i === m.state.lastMove.to)) el.classList.add('last');
    if (i === kingIdx) el.classList.add('check');
  }
  if (selected != null){
    cells[selected]?.classList.add('sel');
    for (const mv of legal){
      const el = cells[mv.to];
      if (!el) continue;
      el.classList.add('target');
      if (b[mv.to] || mv.flag === 'ep') el.classList.add('cap');
    }
  }

  // stato testuale
  if (m.status !== 'active'){
    if (m.winner === me.nick) $('#status').innerHTML = `<span class="hl">${t('youWin')}</span>`;
    else if (m.winner === oppNick) $('#status').textContent = t('oppWin');
    else $('#status').textContent = t('ch_stalemate');
  } else if (myTurn){
    $('#status').innerHTML = inCheckColor === myColor
      ? `<span class="hl">${t('ch_youInCheck')}</span>`
      : `<span class="hl">${t('yourTurnMsg')}</span>`;
  } else {
    $('#status').textContent = oppNick + ' — ' + t('oppTurnMsg');
  }
}

function clearSelection(){ selected = null; legal = []; }

async function onSquare(i){
  if (!cur || cur.status !== 'active' || cur.turn !== me.nick) return;
  const b = cur.state.board;

  // clic su una destinazione legale → esegui la mossa
  if (selected != null){
    const options = legal.filter(mv => mv.to === i);
    if (options.length){
      let move = options[0];
      if (options.length > 1){                  // promozione: scegli il pezzo
        const pr = await pickPromotion();
        if (!pr) return;
        move = options.find(mv => mv.promotion === pr);
      }
      clearSelection();
      await doMove(move);
      return;
    }
  }
  // altrimenti: seleziona un proprio pezzo
  if (b[i] && colorOf(b[i]) === myColor){
    selected = i;
    legal = movesFrom(engState(cur.state), i);
    render(cur);
  } else {
    clearSelection();
    render(cur);
  }
}

async function doMove(move){
  const next = applyMove(engState(cur.state), move);
  const status = gameStatus(next, oppColor);
  const newState = { ...cur.state, board: next.board, castling: next.castling,
                     epTarget: next.epTarget, lastMove: { from: move.from, to: move.to } };
  const patch = { state: newState, turn: oppNick };
  if (status === 'checkmate'){ patch.status='done'; patch.winner=me.nick; }
  else if (status === 'stalemate'){ patch.status='done'; patch.winner=null; }
  await store.updateMatch(matchId, patch);
  if (patch.status === 'done'){
    if (patch.winner === me.nick) await store.addPoints(me.nick, 5);
    else if (patch.winner === null){ await store.addPoints(me.nick, 2); await store.addPoints(oppNick, 2); }
  }
}

function pickPromotion(){
  return new Promise(resolve => {
    const ov = document.createElement('div'); ov.className = 'promo-ov';
    const glyphs = myColor === 'w' ? { q:'♕', r:'♖', b:'♗', n:'♘' } : { q:'♛', r:'♜', b:'♝', n:'♞' };
    ov.innerHTML = `<div class="promo-card"><div style="font-weight:900">${t('ch_promote')}</div>
      <div class="promo-row">${['q','r','b','n'].map(p=>`<button data-p="${p}">${glyphs[p]}</button>`).join('')}</div></div>`;
    ov.onclick = (e) => { if (e.target === ov){ ov.remove(); resolve(null); } };
    ov.querySelectorAll('button').forEach(btn => btn.onclick = () => { ov.remove(); resolve(btn.dataset.p); });
    document.body.appendChild(ov);
  });
}

$('#resign').onclick = async () => {
  if (!cur || cur.status !== 'active') return;
  if (!confirm(t('ch_resignConfirm'))) return;
  await store.updateMatch(matchId, { status:'done', winner: oppNick });
  await store.addPoints(oppNick, 5);
};

// realtime: ogni cambiamento (anche la mossa del collega) ridisegna
store.subscribeMatch(matchId, m => { if (m){ if (m.turn !== me.nick) clearSelection(); render(m); } });
