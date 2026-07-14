/* ===== Enathlon — Backgammon =====
   Partita ONLINE 1v1 realtime (Firestore via shared/store.js).
   Regole e dadi deterministici nel modulo puro engine.js.
   I dadi NON sono nello stato: dice(seed, turnIndex) → nessuno può ritirare. */
import { t } from '../../shared/i18n.js';
import { avatarSVG } from '../../shared/avatars.js';
import * as auth from '../../shared/auth.js';
import * as store from '../../shared/store.js';
import { dice, diceToMoves, legalSequences, applyMove, nextMoves, isSequenceComplete, isWin } from './engine.js';

const $ = (s) => document.querySelector(s);
function toast(m){ const e=$('#toast'); e.textContent=m; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),1800); }
document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));

const params  = new URLSearchParams(location.search);
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
$('#youMark').textContent = myColor === 'w' ? '⚪' : '⚫';
$('#oppName').textContent = oppNick;
$('#oppMark').textContent = oppColor === 'w' ? '⚪' : '⚫';
store.getPlayer(oppNick).then(op => { $('#oppAv').innerHTML = avatarSVG(op || { animal:'cat', shirt:'#9b59b6', pants:'#6f3a86' }); });

/* Disposizione: la propria casa finisce sempre in basso a destra. */
const TOP_W = [12,13,14,15,16,17,18,19,20,21,22,23], BOT_W = [11,10,9,8,7,6,5,4,3,2,1,0];
const topRow = myColor === 'w' ? TOP_W : BOT_W;
const botRow = myColor === 'w' ? BOT_W : TOP_W;

/* costruisci i 24 punti una volta sola */
const ptEls = {};   // indice punto → elemento
function buildQuad(el, indici){
  el.innerHTML = '';
  for (const i of indici){
    const d = document.createElement('div');
    d.className = 'pt ' + (i % 2 === 0 ? 'even' : 'odd');
    d.onclick = () => onPick(i);
    el.appendChild(d);
    ptEls[i] = d;
  }
}
buildQuad($('#topLeft'),  topRow.slice(0, 6));
buildQuad($('#topRight'), topRow.slice(6));
buildQuad($('#botLeft'),  botRow.slice(0, 6));
buildQuad($('#botRight'), botRow.slice(6));
$('#bar').onclick   = () => onPick('bar');
$('#barB').onclick  = () => onPick('bar');
$('#offMe').onclick = () => onPick('off');

let cur = null;        // ultimo stato match
let pending = [];      // mosse di questo turno, non ancora confermate
let selected = null;   // origine selezionata: 'bar' | 0..23 | null
let sequences = [];    // sequenze massimali legali del turno
let curDice = [0,0];

const engState = (s) => ({ points: s.points, bar: s.bar, off: s.off });

/* stato "come si vedrebbe" applicando le mosse in sospeso */
function workingState(){
  let s = engState(cur.state);
  for (const mv of pending) s = applyMove(s, myColor, mv);
  return s;
}

function drawCheckers(el, valore){
  el.querySelectorAll('.chk, .more').forEach(x => x.remove());
  const colore = valore > 0 ? 'w' : 'b';
  const n = Math.abs(valore);
  const mostrate = Math.min(n, 5);
  for (let k = 0; k < mostrate; k++){
    const c = document.createElement('div');
    c.className = 'chk ' + colore;
    el.appendChild(c);
  }
  if (n > 5){
    const more = document.createElement('div');
    more.className = 'more';
    more.textContent = '+' + (n - 5);
    el.appendChild(more);
  }
}

function drawBar(s){
  for (const id of ['#bar', '#barB']){
    const el = $(id);
    el.querySelectorAll('.chk').forEach(x => x.remove());
    el.classList.remove('sel', 'target');
  }
  const mie = s.bar[myColor], sue = s.bar[oppColor];
  const el = $('#bar');
  for (let k = 0; k < Math.min(mie, 4); k++){ const c=document.createElement('div'); c.className='chk '+myColor; el.appendChild(c); }
  const elB = $('#barB');
  for (let k = 0; k < Math.min(sue, 4); k++){ const c=document.createElement('div'); c.className='chk '+oppColor; elB.appendChild(c); }
  if (selected === 'bar') $('#bar').classList.add('sel');
}

function drawDice(myTurn){
  const el = $('#dice'); el.innerHTML = '';
  const tutti = diceToMoves(curDice);
  // dadi ancora da giocare = tutti meno quelli consumati dalle mosse in sospeso
  const restanti = tutti.slice();
  for (const m of pending){
    const k = restanti.indexOf(m.die);
    if (k >= 0) restanti.splice(k, 1);
  }
  for (const d of tutti){
    const div = document.createElement('div');
    div.className = 'die';
    div.textContent = d;
    const k = restanti.indexOf(d);
    if (k >= 0) restanti.splice(k, 1);   // ancora giocabile
    else div.classList.add('used');      // già consumato in questo turno
    el.appendChild(div);
  }
  if (!myTurn) el.querySelectorAll('.die').forEach(x => x.classList.add('used'));
}

function render(m){
  cur = m;
  const myTurn = m.turn === me.nick && m.status === 'active';
  $('#pYou').classList.toggle('turn', myTurn);
  $('#pOpp').classList.toggle('turn', m.turn === oppNick && m.status === 'active');

  curDice = dice(m.state.seed, m.state.turnIndex);
  sequences = myTurn ? legalSequences(engState(m.state), myColor, curDice) : [];

  const s = workingState();

  // punti
  for (let i = 0; i < 24; i++){
    const el = ptEls[i];
    el.classList.remove('sel', 'target');
    drawCheckers(el, s.points[i]);
  }
  drawBar(s);

  // evidenzia destinazioni della pedina selezionata
  $('#offMe').classList.remove('target');       // sempre: ripulisci il render precedente
  if (selected !== null){
    if (selected !== 'bar') ptEls[selected]?.classList.add('sel');
    for (const mv of nextMoves(sequences, pending)){
      if (mv.from !== selected) continue;
      if (mv.to === 'off') $('#offMe').classList.add('target');
      else ptEls[mv.to]?.classList.add('target');
    }
  }

  // vassoi
  $('#offMeN').textContent  = s.off[myColor];
  $('#offOppN').textContent = s.off[oppColor];

  drawDice(myTurn);

  // pulsanti
  const completo = myTurn && isSequenceComplete(sequences, pending);
  $('#confirm').disabled = !completo;
  $('#undo').disabled    = !(myTurn && pending.length > 0);
  $('#pass').style.display   = (myTurn && sequences.length === 0) ? '' : 'none';
  $('#resign').style.display = (m.status === 'active') ? '' : 'none';

  // stato testuale
  if (m.status !== 'active'){
    $('#status').innerHTML = m.winner === me.nick
      ? `<span class="hl">${t('youWin')}</span>` : t('oppWin');
  } else if (myTurn){
    $('#status').innerHTML = sequences.length === 0
      ? t('bg_noMoves')
      : `<span class="hl">${t('yourTurnMsg')}</span>`;
  } else {
    $('#status').textContent = oppNick + ' — ' + t('oppTurnMsg');
  }
}

function onPick(i){
  if (!cur || cur.status !== 'active' || cur.turn !== me.nick) return;
  const possibili = nextMoves(sequences, pending);

  // clic su una destinazione valida per l'origine selezionata → esegui la mossa
  if (selected !== null){
    const mv = possibili.find(m => m.from === selected && m.to === i);
    if (mv){ pending.push(mv); selected = null; render(cur); return; }
  }
  // altrimenti prova a selezionare i come origine
  if (i !== 'off' && possibili.some(m => m.from === i)) selected = i;
  else selected = null;
  render(cur);
}

$('#undo').onclick = () => { pending = []; selected = null; render(cur); };

$('#confirm').onclick = async () => {
  if (!cur || cur.turn !== me.nick || cur.status !== 'active') return;
  if (!isSequenceComplete(sequences, pending)) return;
  const s = workingState();
  const newState = { ...cur.state, points: s.points, bar: s.bar, off: s.off,
                     turnIndex: cur.state.turnIndex + 1, lastMove: pending.slice() };
  const patch = { state: newState, turn: oppNick };
  const vinto = isWin(s, myColor);
  if (vinto){ patch.status = 'done'; patch.winner = me.nick; }
  pending = []; selected = null;
  await store.updateMatch(matchId, patch);
  if (vinto) await store.addPoints(me.nick, 5);
};

$('#pass').onclick = async () => {
  if (!cur || cur.turn !== me.nick || cur.status !== 'active') return;
  if (sequences.length !== 0) return;
  const newState = { ...cur.state, turnIndex: cur.state.turnIndex + 1, lastMove: [] };
  pending = []; selected = null;
  await store.updateMatch(matchId, { state: newState, turn: oppNick });
};

$('#resign').onclick = async () => {
  if (!cur || cur.status !== 'active') return;
  if (!confirm(t('bg_resignConfirm'))) return;
  await store.updateMatch(matchId, { status:'done', winner: oppNick });
  await store.addPoints(oppNick, 5);
};

// realtime: ogni cambiamento (anche il turno del collega) ridisegna
store.subscribeMatch(matchId, m => {
  if (!m) return;
  if (m.turn !== me.nick){ pending = []; selected = null; }
  render(m);
});
