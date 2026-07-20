import { t } from '../../shared/i18n.js';
import * as auth from '../../shared/auth.js';
import * as store from '../../shared/store.js';
import { loadDictionary, isValid } from './dictionary.js';
import { buildBag, letterValue, remainingPenalty } from './tiles.js';
import { wordsFormed, scoreMove, bonusAt } from './board.js';

const $ = (s) => document.querySelector(s);
function toast(m){ const e=$('#toast'); e.textContent=m; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),1900); }
document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));

const params = new URLSearchParams(location.search);
const matchId = params.get('match');
if (!store.isAccessGranted()) location.href = '../../index.html';
const me = await auth.current();
if (!me || !matchId) location.href = '../../lobby.html';

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function emptyBoard(){ return Array.from({length:15},()=>Array(15).fill(null)); }

const m0 = await store.getMatch(matchId);
if (!m0){ toast('Partita non trovata'); setTimeout(()=>location.href='../../lobby.html',1000); throw new Error('match not found'); }
const oppNick = m0.players.find(p => p !== me.nick) || '???';
const lang = m0.state.lang;
$('#gLang').textContent = 'Scrabble ' + (lang === 'it' ? '🇮🇹' : '🇬🇧');
$('#youName').textContent = me.nick;
$('#oppName').textContent = oppNick;

const dict = await loadDictionary(lang);           // blocca finché il dizionario è pronto
const val = (l) => letterValue(lang, l);

// INIT: prepara sacchetto, leggii e tabellone la prima volta che QUALCUNO apre
// la partita appena creata. Prima era riservato a players[0] (lo sfidante): se
// però apriva per primo l'altro giocatore (players[1]), l'init non partiva, la
// fase restava 'init' e render() usciva subito lasciando lo schermo bloccato su
// "Preparazione partita…" — niente tabellone né lettere. Il turno resta a
// players[0] a prescindere da chi inizializza, quindi lo sfidante muove sempre
// per primo. Se due aprono nello stesso istante l'ultima scrittura vince: senza
// mosse ancora fatte, entrambi ri-renderizzano dallo stato canonico, nessuna
// perdita. Vale anche per le partite già bloccate: le sblocca chiunque le apra.
if (m0.state.phase === 'init'){
  const bag = shuffle(buildBag(lang));
  const racks = {};
  let ptr = 0;
  for (const p of m0.players){ racks[p] = bag.slice(ptr, ptr+7); ptr += 7; }
  await store.updateMatch(matchId, {
    state: { lang, phase:'active', board: emptyBoard(), bag, bagPointer: ptr,
             racks, scores: { [m0.players[0]]:0, [m0.players[1]]:0 }, passes: 0 },
    turn: m0.players[0],
  });
}

let cur = null;          // ultimo stato match
let pending = [];        // tessere posate in questo turno: {r,c,letter,blank,rackIdx}
let selIdx = null;       // indice tessera selezionata nel leggio

function draw(state, nick, n){
  const drawn = state.bag.slice(state.bagPointer, state.bagPointer + n);
  state.bagPointer += drawn.length;
  state.racks[nick] = state.racks[nick].concat(drawn);
}

function renderBoard(state){
  const el = $('#board'); el.innerHTML='';
  for (let r=0;r<15;r++) for (let c=0;c<15;c++){
    const sq = document.createElement('div'); sq.className='sq';
    const pend = pending.find(p=>p.r===r && p.c===c);
    const cell = state.board[r][c] || (pend && {letter:pend.letter, blank:pend.blank});
    if (cell){ sq.classList.add('tile'); if(pend) sq.classList.add('pending');
      sq.innerHTML = `<span class="l">${cell.letter}</span><span class="v">${cell.blank?0:val(cell.letter)}</span>`;
    } else {
      const b = bonusAt(r,c); if (b) sq.classList.add(b);
      if (r===7 && c===7) sq.classList.add('center');
      sq.textContent = b || (r===7&&c===7?'★':'');
    }
    sq.onclick = () => onSquare(r,c);
    el.appendChild(sq);
  }
}
function renderRack(state){
  const el = $('#rack'); el.innerHTML='';
  const rack = state.racks[me.nick] || [];
  const used = new Set(pending.map(p=>p.rackIdx));
  rack.forEach((letter,i)=>{
    if (used.has(i)) return;
    const tl = document.createElement('div'); tl.className='tile'+(selIdx===i?' sel':'');
    tl.innerHTML = letter===' ' ? '<span class="l">·</span>' : `<span class="l">${letter}</span><span class="v">${val(letter)}</span>`;
    tl.onclick = () => { selIdx = (selIdx===i?null:i); renderRack(cur.state); };
    el.appendChild(tl);
  });
}
function render(m){
  cur = m;
  if (m.state.phase === 'init'){ $('#status').textContent = t('sc_setup'); return; }
  $('#loading').classList.add('hidden'); $('#game').classList.remove('hidden');
  $('#youScore').textContent = m.state.scores[me.nick] ?? 0;
  $('#oppScore').textContent = m.state.scores[oppNick] ?? 0;
  const myTurn = m.turn === me.nick && m.status === 'active';
  $('#pYou').classList.toggle('turn', myTurn);
  $('#pOpp').classList.toggle('turn', m.turn===oppNick && m.status==='active');
  renderBoard(m.state); renderRack(m.state);
  $('#btnPlay').disabled = !myTurn || pending.length===0;
  if (m.status !== 'active'){
    $('#status').innerHTML = m.winner===me.nick ? `<span class="hl">${t('youWin')}</span>`
      : m.winner===oppNick ? t('oppWin') : t('draw');
  } else if (myTurn){ $('#status').innerHTML = `<span class="hl">${t('yourTurnMsg')}</span>`; }
  else { $('#status').textContent = oppNick + ' — ' + t('oppTurnMsg'); }
}

function onSquare(r,c){
  if (!cur || cur.turn!==me.nick || cur.status!=='active') return;
  const existingPend = pending.findIndex(p=>p.r===r && p.c===c);
  if (existingPend>=0){ pending.splice(existingPend,1); renderBoard(cur.state); renderRack(cur.state); syncPlayBtn(); return; }
  if (cur.state.board[r][c]) return;               // occupata da tessera confermata
  if (selIdx===null){ toast(t('sc_pickTile')); return; }
  let letter = cur.state.racks[me.nick][selIdx]; let blank = false;
  if (letter===' '){ const ch=(prompt(t('sc_blankPrompt'))||'').trim().toUpperCase();
    if(!/^[A-Z]$/.test(ch)){ return; } letter=ch; blank=true; }
  pending.push({ r,c,letter,blank,rackIdx:selIdx }); selIdx=null;
  renderBoard(cur.state); renderRack(cur.state); syncPlayBtn();
}
function syncPlayBtn(){ $('#btnPlay').disabled = !(cur.turn===me.nick && cur.status==='active' && pending.length>0); }

function firstMoveTouchesCenter(){ return pending.some(p=>p.r===7 && p.c===7); }
function boardIsEmpty(state){ return state.board.every(row=>row.every(c=>!c)); }

$('#btnRecall').onclick = () => { pending=[]; selIdx=null; renderBoard(cur.state); renderRack(cur.state); syncPlayBtn(); };

$('#btnPlay').onclick = async () => {
  if (cur.turn!==me.nick || cur.status!=='active' || !pending.length) return;
  // 1) prima mossa deve toccare il centro
  if (boardIsEmpty(cur.state) && !firstMoveTouchesCenter()){ toast(t('sc_center')); return; }
  // 2) validazione rigida di TUTTE le parole
  const words = wordsFormed(cur.state.board, pending);
  if (!words.length){ toast(t('sc_noword')); return; }
  const bad = words.find(w => !isValid(dict, w.word));
  if (bad){ toast(t('sc_invalid') + ' ' + bad.word); return; }
  // 3) punteggio e aggiornamento stato
  const gained = scoreMove(cur.state.board, pending, val);
  const state = structuredClone(cur.state);
  for (const p of pending){ state.board[p.r][p.c] = { letter:p.letter, blank:p.blank }; }
  // rimuovi le tessere usate dal leggio e ripesca
  const usedIdx = new Set(pending.map(p=>p.rackIdx));
  state.racks[me.nick] = state.racks[me.nick].filter((_,i)=>!usedIdx.has(i));
  draw(state, me.nick, 7 - state.racks[me.nick].length);
  state.scores[me.nick] = (state.scores[me.nick]||0) + gained;
  state.passes = 0;
  const emptied = state.racks[me.nick].length===0 && state.bagPointer>=state.bag.length;
  const patch = { state, turn: oppNick };
  if (emptied){ // fine: chi svuota prende le tessere residue avversarie
    state.scores[me.nick] += remainingPenalty(lang, state.racks[oppNick]);
    patch.status='done';
    patch.winner = state.scores[me.nick] >= state.scores[oppNick] ? me.nick : oppNick;
  }
  pending=[]; selIdx=null;
  await store.updateMatch(matchId, patch);
  if (patch.status==='done' && patch.winner===me.nick) await store.addPoints(me.nick, 5);
};

$('#btnPass').onclick = async () => {
  if (cur.turn!==me.nick || cur.status!=='active') return;
  const state = structuredClone(cur.state);
  state.passes = (state.passes||0) + 1;
  const patch = { state, turn: oppNick };
  if (state.passes >= 2){ // due passaggi consecutivi ⇒ fine, detrazione tessere residue
    const a=me.nick, b=oppNick;
    state.scores[a]-=remainingPenalty(lang, state.racks[a]);
    state.scores[b]-=remainingPenalty(lang, state.racks[b]);
    patch.status='done';
    patch.winner = state.scores[a]===state.scores[b] ? null : (state.scores[a]>state.scores[b]?a:b);
  }
  pending=[]; selIdx=null;
  await store.updateMatch(matchId, patch);
  if (patch.status==='done' && patch.winner===me.nick) await store.addPoints(me.nick, 5);
};

$('#btnExchange').onclick = async () => {
  if (cur.turn!==me.nick || cur.status!=='active') return;
  if (cur.state.bagPointer >= cur.state.bag.length){ toast(t('sc_bagEmpty')); return; }
  if (selIdx===null){ toast(t('sc_pickExchange')); return; }
  const state = structuredClone(cur.state);
  const [out] = state.racks[me.nick].splice(selIdx,1);
  draw(state, me.nick, 1);
  state.bag.push(out);                 // la tessera scartata torna in fondo al sacchetto
  state.passes = 0;
  selIdx=null; pending=[];
  await store.updateMatch(matchId, { state, turn: oppNick });
};

store.subscribeMatch(matchId, m => { if (m) render(m); });
