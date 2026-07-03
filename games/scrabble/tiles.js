/* Dati tessere per lingua: [lettera, quantità, valore]. Blank = ' ' (0 punti). */

export const TILES = {
  en: [
    [' ', 2, 0],
    ['E',12,1],['A',9,1],['I',9,1],['O',8,1],['N',6,1],['R',6,1],['T',6,1],
    ['L',4,1],['S',4,1],['U',4,1],
    ['D',4,2],['G',3,2],
    ['B',2,3],['C',2,3],['M',2,3],['P',2,3],
    ['F',2,4],['H',2,4],['V',2,4],['W',2,4],['Y',2,4],
    ['K',1,5],
    ['J',1,8],['X',1,8],
    ['Q',1,10],['Z',1,10],
  ],
  // PROVVISORIO — VERIFICARE con fonte ufficiale (vedi spec §"Distribuzione IT").
  // Set base senza J K W X Y. NB: quantità e valori qui sotto sono un abbozzo
  // NON verificato — vanno corretti sul set ufficiale italiano (anche il totale
  // tessere, che nello Scrabble IT non è necessariamente 100).
  it: [
    [' ', 2, 0],
    ['A',14,1],['E',11,1],['I',12,1],['O',13,1],['U',5,1],
    ['C',6,2],['R',6,2],['S',6,2],['T',6,2],
    ['L',5,3],['M',5,3],['N',5,3],['B',3,3],['D',3,3],['F',3,3],['P',3,3],['V',3,3],
    ['G',2,5],['H',2,5],['Z',2,5],
    ['Q',1,8],
  ],
};

function table(lang) {
  const t = TILES[lang];
  if (!t) throw new Error(`lingua sconosciuta: ${lang}`);
  return t;
}

/* Array di lettere (con ripetizioni), ordine deterministico. Mescolare a parte. */
export function buildBag(lang) {
  const bag = [];
  for (const [letter, qty] of table(lang)) {
    for (let i = 0; i < qty; i++) bag.push(letter);
  }
  return bag;
}

export function letterValue(lang, letter) {
  const row = table(lang).find(r => r[0] === letter.toUpperCase());
  return row ? row[2] : 0;
}

export function remainingPenalty(lang, rack) {
  return rack.reduce((sum, l) => sum + letterValue(lang, l), 0);
}
