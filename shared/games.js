/* ===== Enathlon — Catalogo giochi ===== */
/* status: 'ready' = pagina implementata · 'soon' = mockup, da portare */
export const GAMES = [
  { id:'tris',       icon:'⭕', key:'g_tris',       path:'games/tris/',       players:'1v1',  status:'ready', online:true },
  { id:'chess',      icon:'♟',  key:'g_chess',      path:'games/scacchi/',    players:'1v1',  status:'soon' },
  { id:'scrabble',   icon:'🔤', key:'g_scrabble',   path:'games/scrabble/',   players:'1v1',  status:'soon' },
  { id:'battleship', icon:'🚢', key:'g_battleship', path:'games/battaglia-navale/', players:'1v1', status:'ready', online:true },
  { id:'backgammon', icon:'🎲', key:'g_backgammon', path:'games/backgammon/', players:'1v1',  status:'soon' },
  { id:'hangman',    icon:'🔡', key:'g_hangman',    path:'games/impiccato/',  players:'1v1',  status:'ready', online:true },
  { id:'uno',        icon:'🟥', key:'g_uno',        path:'games/uno/',        players:'2-6',  status:'soon' },
  { id:'ludo',       icon:'🎯', key:'g_ludo',       path:'games/ludo/',       players:'2-4',  status:'soon' },
  { id:'pictionary', icon:'🎨', key:'g_pictionary', path:'games/pictionary/', players:'2-6',  status:'soon' },
];
export function gameById(id){ return GAMES.find(g => g.id === id); }
