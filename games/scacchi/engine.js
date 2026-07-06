/* ===== Enathlon — Scacchi: motore di legalità mosse (logica pura) =====
   Scacchiera = array piatto di 64. Codifica FEN: maiuscolo=Bianco, minuscolo=Nero,
   ''=vuota. Indice r*8+c, r=0 = traversa 8 (alto), r=7 = traversa 1 (basso). */

export const WHITE = 'w', BLACK = 'b';

export function colorOf(piece){ if(!piece) return null; return piece === piece.toUpperCase() ? 'w' : 'b'; }
export function typeOf(piece){ return piece ? piece.toLowerCase() : null; }

const onBoard = (r,c) => r>=0 && r<8 && c>=0 && c<8;
const idx = (r,c) => r*8 + c;
const rc  = (i) => [Math.floor(i/8), i%8];

export function initialBoard(){
  const back = ['r','n','b','q','k','b','n','r'];
  const b = new Array(64).fill('');
  for (let c=0;c<8;c++){
    b[c]      = back[c];                 // r=0: pezzi neri
    b[8+c]    = 'p';                      // r=1: pedoni neri
    b[48+c]   = 'P';                      // r=6: pedoni bianchi
    b[56+c]   = back[c].toUpperCase();    // r=7: pezzi bianchi
  }
  return b;
}

export function applyMove(state, move){
  const board = state.board.slice();
  const castling = { ...state.castling };
  let epTarget = null;
  const piece = board[move.from];
  const color = colorOf(piece);
  const [fr, fc] = rc(move.from);
  const [tr, tc] = rc(move.to);

  board[move.to] = piece;
  board[move.from] = '';

  if (move.flag === 'ep') board[idx(fr, tc)] = '';                 // rimuove il pedone superato
  if (move.flag === 'double') epTarget = idx((fr+tr)/2, fc);       // casella saltata
  if (move.promotion) board[move.to] = color==='w' ? move.promotion.toUpperCase() : move.promotion;
  if (move.flag === 'castleK'){ board[idx(tr,5)] = board[idx(tr,7)]; board[idx(tr,7)] = ''; }
  if (move.flag === 'castleQ'){ board[idx(tr,3)] = board[idx(tr,0)]; board[idx(tr,0)] = ''; }

  if (typeOf(piece) === 'k'){
    if (color==='w'){ castling.wK=false; castling.wQ=false; } else { castling.bK=false; castling.bQ=false; }
  }
  // torre mossa dalla casella d'origine, o torre catturata sulla casella d'origine
  for (const s of [move.from, move.to]){
    if (s===63) castling.wK=false;
    if (s===56) castling.wQ=false;
    if (s===7)  castling.bK=false;
    if (s===0)  castling.bQ=false;
  }
  return { board, castling, epTarget };
}

export function isSquareAttacked(board, target, byColor){
  const [tr, tc] = rc(target);
  // pedoni: un pedone di byColor che attacca 'target' sta a (tr + pd, tc ± 1)
  const pd = byColor==='w' ? 1 : -1;
  for (const dc of [-1,1]){
    const r=tr+pd, c=tc+dc;
    if (onBoard(r,c)){ const p=board[idx(r,c)]; if(p && colorOf(p)===byColor && typeOf(p)==='p') return true; }
  }
  // cavalli
  const KN=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr,dc] of KN){ const r=tr+dr,c=tc+dc; if(onBoard(r,c)){ const p=board[idx(r,c)]; if(p&&colorOf(p)===byColor&&typeOf(p)==='n') return true; } }
  // re
  for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++){ if(!dr&&!dc) continue; const r=tr+dr,c=tc+dc; if(onBoard(r,c)){ const p=board[idx(r,c)]; if(p&&colorOf(p)===byColor&&typeOf(p)==='k') return true; } }
  // raggi ortogonali (torre/donna)
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
    let r=tr+dr,c=tc+dc;
    while(onBoard(r,c)){ const p=board[idx(r,c)]; if(p){ if(colorOf(p)===byColor&&(typeOf(p)==='r'||typeOf(p)==='q')) return true; break; } r+=dr;c+=dc; }
  }
  // raggi diagonali (alfiere/donna)
  for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
    let r=tr+dr,c=tc+dc;
    while(onBoard(r,c)){ const p=board[idx(r,c)]; if(p){ if(colorOf(p)===byColor&&(typeOf(p)==='b'||typeOf(p)==='q')) return true; break; } r+=dr;c+=dc; }
  }
  return false;
}

function findKing(board, color){ return board.indexOf(color==='w' ? 'K' : 'k'); }

export function isInCheck(board, color){
  const k = findKing(board, color);
  if (k < 0) return false;
  return isSquareAttacked(board, k, color==='w' ? 'b' : 'w');
}

const KNIGHT = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING   = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DIAG   = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ORTH   = [[-1,0],[1,0],[0,-1],[0,1]];

function stepMoves(board, color, from, r, c, offsets, moves){
  for (const [dr,dc] of offsets){
    const nr=r+dr, nc=c+dc; if(!onBoard(nr,nc)) continue;
    const q = board[idx(nr,nc)];
    if (!q || colorOf(q)!==color) moves.push({ from, to: idx(nr,nc) });
  }
}

function slideMoves(board, color, from, r, c, dirs, moves){
  for (const [dr,dc] of dirs){
    let nr=r+dr, nc=c+dc;
    while (onBoard(nr,nc)){
      const q = board[idx(nr,nc)];
      if (!q){ moves.push({ from, to: idx(nr,nc) }); }
      else { if (colorOf(q)!==color) moves.push({ from, to: idx(nr,nc) }); break; }
      nr+=dr; nc+=dc;
    }
  }
}

function addPawnMove(from, to, isPromo, moves){
  if (isPromo){ for (const pr of ['q','r','b','n']) moves.push({ from, to, promotion: pr }); }
  else moves.push({ from, to });
}

function pawnMoves(state, color, from, r, c, moves){
  const board = state.board;
  const dir = color==='w' ? -1 : 1;
  const startRank = color==='w' ? 6 : 1;
  const promoRank = color==='w' ? 0 : 7;
  const one = r + dir;
  if (onBoard(one,c) && !board[idx(one,c)]){
    addPawnMove(from, idx(one,c), one===promoRank, moves);
    if (r===startRank){ const two=r+2*dir; if(!board[idx(two,c)]) moves.push({ from, to: idx(two,c), flag:'double' }); }
  }
  for (const dc of [-1,1]){
    const nc=c+dc; if(!onBoard(one,nc)) continue;
    const to = idx(one,nc); const q = board[to];
    if (q && colorOf(q)!==color) addPawnMove(from, to, one===promoRank, moves);
    else if (state.epTarget!=null && to===state.epTarget) moves.push({ from, to, flag:'ep' });
  }
}

function castleMoves(state, color, from, r, moves){
  const board = state.board;
  const enemy = color==='w' ? 'b' : 'w';
  const homeK = color==='w' ? 60 : 4;
  if (from !== homeK) return;
  if (isSquareAttacked(board, homeK, enemy)) return;              // re sotto scacco: niente arrocco
  const canK = color==='w' ? state.castling.wK : state.castling.bK;
  const canQ = color==='w' ? state.castling.wQ : state.castling.bQ;
  if (canK && !board[idx(r,5)] && !board[idx(r,6)] &&
      !isSquareAttacked(board, idx(r,5), enemy) && !isSquareAttacked(board, idx(r,6), enemy)){
    moves.push({ from, to: idx(r,6), flag:'castleK' });
  }
  if (canQ && !board[idx(r,1)] && !board[idx(r,2)] && !board[idx(r,3)] &&
      !isSquareAttacked(board, idx(r,2), enemy) && !isSquareAttacked(board, idx(r,3), enemy)){
    moves.push({ from, to: idx(r,2), flag:'castleQ' });
  }
}

export function pseudoMoves(state, color){
  const board = state.board;
  const moves = [];
  for (let i=0;i<64;i++){
    const p = board[i]; if(!p || colorOf(p)!==color) continue;
    const t = typeOf(p); const [r,c] = rc(i);
    if (t==='p') pawnMoves(state, color, i, r, c, moves);
    else if (t==='n') stepMoves(board, color, i, r, c, KNIGHT, moves);
    else if (t==='k'){ stepMoves(board, color, i, r, c, KING, moves); castleMoves(state, color, i, r, moves); }
    else if (t==='b') slideMoves(board, color, i, r, c, DIAG, moves);
    else if (t==='r') slideMoves(board, color, i, r, c, ORTH, moves);
    else if (t==='q') slideMoves(board, color, i, r, c, DIAG.concat(ORTH), moves);
  }
  return moves;
}

export function legalMoves(state, color){
  return pseudoMoves(state, color).filter(m => {
    const next = applyMove(state, m);
    return !isInCheck(next.board, color);
  });
}

export function movesFrom(state, index){
  const p = state.board[index]; if(!p) return [];
  return legalMoves(state, colorOf(p)).filter(m => m.from === index);
}

export function gameStatus(state, colorToMove){
  if (legalMoves(state, colorToMove).length > 0) return 'ongoing';
  return isInCheck(state.board, colorToMove) ? 'checkmate' : 'stalemate';
}
