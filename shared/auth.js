/* ===== Enathlon — Identità (Nickname + PIN) ===== */
import * as store from './store.js';

/* PIN mai salvato in chiaro: hash SHA-256 con sale = nickname normalizzato. */
async function hashPin(nick, pin) {
  const data = new TextEncoder().encode('enathlon:' + nick.trim().toLowerCase() + ':' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function isNickAvailable(nick) {
  if (!nick || nick.trim().length < 2) return false;
  return store.nickAvailable(nick);
}

export async function register({ nick, pin, animal, shirt, pants, remember = true }) {
  const pinHash = await hashPin(nick, pin);
  const profile = await store.createPlayer({ nick, pinHash, animal, shirt, pants });
  if (remember) store.setSession(nick);
  return profile;
}

export async function login({ nick, pin, remember = true }) {
  const p = await store.getPlayer(nick);
  if (!p) return null;
  const pinHash = await hashPin(nick, pin);
  if (pinHash !== p.pinHash) return null;
  if (remember) store.setSession(nick);
  return p;
}

export async function current() { return store.currentProfile(); }
export function logout() { store.clearSession(); }
