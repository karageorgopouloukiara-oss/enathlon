/* Tabellone Scrabble 15×15. Layout premi standard.
   T=parola tripla, D=parola doppia, t=lettera tripla, d=lettera doppia,
   *=centro (conta come parola doppia), .=normale */
const LAYOUT = [
  'T..d...T...d..T',
  '.D...t...t...D.',
  '..D...d.d...D..',
  'd..D...d...D..d',
  '....D.....D....',
  '.t...t...t...t.',
  '..d...d.d...d..',
  'T..d...*...d..T',
  '..d...d.d...d..',
  '.t...t...t...t.',
  '....D.....D....',
  'd..D...d...D..d',
  '..D...d.d...D..',
  '.D...t...t...D.',
  'T..d...T...d..T',
];

const CODE = { T:'TW', D:'DW', t:'TL', d:'DL', '*':'DW' };

export function bonusAt(r, c) {
  if (r < 0 || r > 14 || c < 0 || c > 14) return null;
  return CODE[LAYOUT[r][c]] || null;
}

/* Fonde le tessere nuove sul tabellone e restituisce tutte le parole (≥2 lettere)
   formate da almeno una tessera nuova: parola principale + incrociate.
   Ogni parola: { word, cells:[{r,c,letter,blank,isNew}] }. */
export function wordsFormed(board, placed) {
  const merged = board.map(row => row.slice());
  const isNewAt = new Set();
  for (const p of placed) {
    merged[p.r][p.c] = { letter: p.letter, blank: p.blank };
    isNewAt.add(p.r + ',' + p.c);
  }
  const cellOf = (r, c) => {
    const t = merged[r][c];
    return { r, c, letter: t.letter, blank: t.blank, isNew: isNewAt.has(r + ',' + c) };
  };
  const runKey = new Set();
  const words = [];

  const collect = (dr, dc) => {
    for (const p of placed) {
      // vai all'inizio del run in questa direzione
      let r = p.r, c = p.c;
      while (merged[r - dr] && merged[r - dr][c - dc]) { r -= dr; c -= dc; }
      const key = dr + ':' + dc + ':' + r + ':' + c;
      if (runKey.has(key)) continue;
      runKey.add(key);
      const cells = [];
      let rr = r, cc = c;
      while (merged[rr] && merged[rr][cc]) { cells.push(cellOf(rr, cc)); rr += dr; cc += dc; }
      if (cells.length >= 2 && cells.some(x => x.isNew)) {
        words.push({ word: cells.map(x => x.letter).join(''), cells });
      }
    }
  };
  collect(0, 1); // orizzontale
  collect(1, 0); // verticale
  return words;
}

/* Punteggio di una mossa. values: (letter)=>punti. Bonus solo su tessere nuove. */
export function scoreMove(board, placed, values) {
  let total = 0;
  for (const { cells } of wordsFormed(board, placed)) {
    let wordScore = 0;
    let wordMult = 1;
    for (const cell of cells) {
      const base = cell.blank ? 0 : values(cell.letter);
      let letterScore = base;
      if (cell.isNew) {
        const bonus = bonusAt(cell.r, cell.c);
        if (bonus === 'DL') letterScore = base * 2;
        else if (bonus === 'TL') letterScore = base * 3;
        else if (bonus === 'DW') wordMult *= 2;
        else if (bonus === 'TW') wordMult *= 3;
      }
      wordScore += letterScore;
    }
    total += wordScore * wordMult;
  }
  if (placed.length === 7) total += 50; // bingo
  return total;
}
