import * as store from '../../shared/store.js';
import { t } from '../../shared/i18n.js';
import {
  isPlayable, isWild, colorOf, valueOf,
  applyPlay, applyDraw, applyPass, applyRetire
} from './engine.js';

const $ = s => document.querySelector(s);
const matchId = new URLSearchParams(location.search).get('match');
const me = store.getSessionNick();

if (!store.isAccessGranted() || !me) { location.href = '../../index.html'; }

/* stringhe statiche dell'header (lobby, titolo) */
document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));

let match = null;

function label(card) {
  if (card === 'W') return '★';
  if (card === 'F') return '+4';
  const v = valueOf(card);
  return v === 'S' ? '⊘' : v === 'R' ? '⇄' : v === 'D' ? '+2' : v;
}
const colorHex = { r:'#d33', g:'#2a2', b:'#26c', y:'#d9a300' };

function render() {
  if (!match) return;
  const st = match.state;
  const myTurn = match.turn === me && match.status === 'active';
  const top = st.discard[st.discard.length - 1];

  // giocatori
  $('#players').innerHTML = match.players.map(p => {
    const retired = st.retired.includes(p);
    const n = (st.hands[p] || []).length;
    const isTurn = match.turn === p && match.status === 'active';
    const uno = n === 1 && !retired ? `<span class="uno">${t('un_uno')}</span>` : '';
    const name = p === me ? t('un_you') : p;
    return `<div class="pchip ${isTurn?'turn':''} ${retired?'retired':''}">
      ${name} · ${t('un_cards')(n)} ${uno}</div>`;
  }).join('');

  // tavolo
  $('#dir').textContent = st.direction === 1 ? '↻' : '↺';
  const tc = $('#topCard');
  tc.textContent = label(top);
  tc.style.background = isWild(top) ? '#333' : colorHex[colorOf(top)];
  $('#colorDot').style.background = colorHex[st.color] || '#333';

  // status
  if (match.status === 'done') {
    $('#status').innerHTML = match.winner === me
      ? `<span class="hl">${t('un_youWin')}</span>`
      : t('un_winner')(match.winner);
  } else {
    $('#status').textContent = myTurn ? t('un_yourTurn') : t('un_wait')(match.turn);
  }

  // mano
  const myHand = st.hands[me] || [];
  const canPlay = myTurn && st.drawn === null;
  $('#hand').innerHTML = myHand.map((c, i) => {
    const cls = isWild(c) ? 'wild' : colorOf(c);
    const playable = (canPlay || (myTurn && st.drawn === c)) && isPlayable(c, top, st.color);
    return `<div class="card ${cls} ${playable?'play':'dim'}" data-i="${i}" data-c="${c}">${label(c)}</div>`;
  }).join('');
  $('#hand').querySelectorAll('.card.play').forEach(el => {
    el.onclick = () => onPlay(el.dataset.c);
  });

  // azioni
  const acts = [];
  if (myTurn && st.drawn === null) acts.push(`<button id="drawBtn">${t('un_draw')}</button>`);
  if (myTurn && st.drawn !== null) acts.push(`<button class="ghost" id="passBtn">${t('un_pass')}</button>`);
  if (match.status === 'active' && !st.retired.includes(me))
    acts.push(`<button class="ghost" id="giveUp">${t('un_surrender')}</button>`);
  $('#actions').innerHTML = acts.join('');
  if ($('#drawBtn')) $('#drawBtn').onclick = onDraw;
  if ($('#passBtn')) $('#passBtn').onclick = onPass;
  if ($('#giveUp')) $('#giveUp').onclick = onRetire;
}

async function commit(res) {
  await store.updateMatch(matchId, {
    state: res.state, turn: res.turn,
    status: res.ended ? 'done' : 'active',
    winner: res.ended ? res.winner : null
  });
  // punti single-writer: li scrive solo il client che compie l'azione
  if (res.ended && res.winner === me) await store.addPoints(me, 5);
}

async function onPlay(card) {
  const st = match.state;
  if (match.turn !== me || match.status !== 'active') return;
  let chosen = null;
  if (isWild(card)) { chosen = await pickColor(); if (!chosen) return; }
  const res = applyPlay(st, match.players, me, card, chosen, Math.random);
  await commit(res);
}

async function onDraw() {
  if (match.turn !== me) return;
  await commit(applyDraw(match.state, match.players, me, Math.random));
}
async function onPass() {
  if (match.turn !== me) return;
  await commit(applyPass(match.state, match.players, me));
}
async function onRetire() {
  const res = applyRetire(match.state, match.players, me, match.turn);
  // se il mio ritiro lascia un solo superstite, gli accredito i 5 punti
  await store.updateMatch(matchId, {
    state: res.state, turn: res.turn,
    status: res.ended ? 'done' : 'active',
    winner: res.ended ? res.winner : null
  });
  if (res.ended && res.winner && res.winner !== me) await store.addPoints(res.winner, 5);
}

function pickColor() {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999';
    ov.innerHTML = `<div style="background:var(--panel-2);padding:22px;border-radius:16px;text-align:center">
      <div style="font-weight:900;margin-bottom:14px">${t('un_pickColor')}</div>
      <div style="display:flex;gap:10px">
        ${['r','g','b','y'].map(c=>`<button data-c="${c}" style="width:52px;height:52px;border:none;border-radius:12px;cursor:pointer;background:${colorHex[c]}"></button>`).join('')}
      </div></div>`;
    ov.querySelectorAll('button').forEach(b => b.onclick = () => { ov.remove(); resolve(b.dataset.c); });
    ov.onclick = e => { if (e.target === ov) { ov.remove(); resolve(null); } };
    document.body.appendChild(ov);
  });
}

store.subscribeMatch(matchId, m => { match = m; render(); });
