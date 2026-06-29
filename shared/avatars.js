/* ===== Enathlon — Avatar rendering (Mii-style con testa animale) ===== */
export const ANIMALS = {
  fox:    { emoji:'🦊', label:{it:'Volpe',en:'Fox'},    paw:'#FFB74D' },
  bear:   { emoji:'🐻', label:{it:'Orso',en:'Bear'},    paw:'#A1887F' },
  owl:    { emoji:'🦉', label:{it:'Gufo',en:'Owl'},     paw:'#D7B98E' },
  cat:    { emoji:'🐱', label:{it:'Gatto',en:'Cat'},    paw:'#BDBDBD' },
  wolf:   { emoji:'🐺', label:{it:'Lupo',en:'Wolf'},    paw:'#90A4AE' },
  rabbit: { emoji:'🐰', label:{it:'Coniglio',en:'Rabbit'}, paw:'#FAFAFA' },
  panda:  { emoji:'🐼', label:{it:'Panda',en:'Panda'},  paw:'#fff' },
  frog:   { emoji:'🐸', label:{it:'Rana',en:'Frog'},    paw:'#7CB342' },
};

export const AVATAR_COLORS = ['#006894','#00A0A3','#1FC5A8','#C7FF1F','#e74c3c','#9b59b6','#f39c12','#2ecc71','#e91e63','#34495e','#795548','#ffffff'];

function head(animal) {
  switch (animal) {
    case 'fox': return `<polygon points="34,24 25,8 44,22" fill="#E67E22"/><polygon points="66,24 75,8 56,22" fill="#E67E22"/><polygon points="35,22 30,13 42,21" fill="#5D4037"/><polygon points="65,22 70,13 58,21" fill="#5D4037"/><circle cx="50" cy="40" r="24" fill="#FFB74D"/><path d="M30 42 Q50 70 70 42 Q60 58 50 58 Q40 58 30 42Z" fill="#FFF3E0"/><circle cx="42" cy="38" r="2.8" fill="#3a2a1a"/><circle cx="58" cy="38" r="2.8" fill="#3a2a1a"/><ellipse cx="50" cy="48" rx="3.4" ry="2.4" fill="#333"/>`;
    case 'bear': return `<circle cx="32" cy="22" r="9" fill="#8D6E63"/><circle cx="68" cy="22" r="9" fill="#8D6E63"/><circle cx="32" cy="22" r="4.5" fill="#C8A98E"/><circle cx="68" cy="22" r="4.5" fill="#C8A98E"/><circle cx="50" cy="40" r="24" fill="#A1887F"/><ellipse cx="50" cy="50" rx="12" ry="9" fill="#D7CCC8"/><circle cx="42" cy="38" r="2.8" fill="#2a211c"/><circle cx="58" cy="38" r="2.8" fill="#2a211c"/><ellipse cx="50" cy="46" rx="3.6" ry="2.6" fill="#2a211c"/>`;
    case 'owl': return `<polygon points="34,20 29,4 44,18" fill="#6D4C41"/><polygon points="66,20 71,4 56,18" fill="#6D4C41"/><circle cx="50" cy="40" r="24" fill="#D7B98E"/><circle cx="41" cy="40" r="10" fill="#fff" stroke="#B89B6E" stroke-width="1.5"/><circle cx="59" cy="40" r="10" fill="#fff" stroke="#B89B6E" stroke-width="1.5"/><circle cx="41" cy="41" r="5" fill="#333"/><circle cx="59" cy="41" r="5" fill="#333"/><polygon points="50,46 45,52 55,52" fill="#F39C12"/>`;
    case 'cat': return `<polygon points="34,24 27,7 45,21" fill="#9E9E9E"/><polygon points="66,24 73,7 55,21" fill="#9E9E9E"/><polygon points="35,21 32,12 43,20" fill="#F48FB1"/><polygon points="65,21 68,12 57,20" fill="#F48FB1"/><circle cx="50" cy="40" r="24" fill="#BDBDBD"/><circle cx="42" cy="39" r="2.8" fill="#2e2e2e"/><circle cx="58" cy="39" r="2.8" fill="#2e2e2e"/><polygon points="50,46 47,49 53,49" fill="#F48FB1"/>`;
    case 'wolf': return `<polygon points="34,24 27,7 45,21" fill="#607D8B"/><polygon points="66,24 73,7 55,21" fill="#607D8B"/><circle cx="50" cy="40" r="24" fill="#90A4AE"/><path d="M34 44 Q50 64 66 44 Q58 56 50 56 Q42 56 34 44Z" fill="#CFD8DC"/><circle cx="42" cy="38" r="2.8" fill="#263238"/><circle cx="58" cy="38" r="2.8" fill="#263238"/><ellipse cx="50" cy="48" rx="3.4" ry="2.4" fill="#1a2327"/>`;
    case 'rabbit': return `<ellipse cx="42" cy="14" rx="6" ry="18" fill="#FAFAFA" stroke="#e0e0e0" stroke-width="1"/><ellipse cx="58" cy="14" rx="6" ry="18" fill="#FAFAFA" stroke="#e0e0e0" stroke-width="1"/><ellipse cx="42" cy="14" rx="2.6" ry="12" fill="#F8BBD0"/><ellipse cx="58" cy="14" rx="2.6" ry="12" fill="#F8BBD0"/><circle cx="50" cy="42" r="23" fill="#FAFAFA" stroke="#ececec" stroke-width="1"/><circle cx="42" cy="40" r="2.8" fill="#5a4a4a"/><circle cx="58" cy="40" r="2.8" fill="#5a4a4a"/><ellipse cx="50" cy="47" rx="2.6" ry="1.8" fill="#F48FB1"/>`;
    case 'panda': return `<circle cx="31" cy="21" r="9" fill="#2b2b2b"/><circle cx="69" cy="21" r="9" fill="#2b2b2b"/><circle cx="50" cy="40" r="24" fill="#fff" stroke="#e6e6e6" stroke-width="1"/><ellipse cx="41" cy="40" rx="6" ry="8" fill="#2b2b2b" transform="rotate(-20,41,40)"/><ellipse cx="59" cy="40" rx="6" ry="8" fill="#2b2b2b" transform="rotate(20,59,40)"/><circle cx="41" cy="40" r="2.4" fill="#fff"/><circle cx="59" cy="40" r="2.4" fill="#fff"/><ellipse cx="50" cy="50" rx="3.2" ry="2.2" fill="#2b2b2b"/>`;
    case 'frog': return `<circle cx="38" cy="22" r="10" fill="#8BC34A" stroke="#689F38" stroke-width="1"/><circle cx="62" cy="22" r="10" fill="#8BC34A" stroke="#689F38" stroke-width="1"/><circle cx="38" cy="22" r="4.5" fill="#fff"/><circle cx="62" cy="22" r="4.5" fill="#fff"/><circle cx="38" cy="23" r="2.4" fill="#222"/><circle cx="62" cy="23" r="2.4" fill="#222"/><circle cx="50" cy="44" r="22" fill="#7CB342"/><path d="M34 48 Q50 60 66 48" stroke="#4f7a26" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    default: return head('fox');
  }
}

/** Restituisce l'SVG completo dell'avatar (corpo + testa). viewBox 0 0 100 175 */
export function avatarSVG(profile) {
  const a = ANIMALS[profile.animal] || ANIMALS.fox;
  const shirt = profile.shirt || '#006894';
  const pants = profile.pants || '#004f70';
  const body = `<rect x="37" y="108" width="11" height="42" rx="5" fill="${pants}"/><rect x="52" y="108" width="11" height="42" rx="5" fill="${pants}"/><ellipse cx="42" cy="152" rx="9" ry="5" fill="#333"/><ellipse cx="58" cy="152" rx="9" ry="5" fill="#333"/><rect x="16" y="70" width="19" height="11" rx="5.5" fill="${shirt}"/><rect x="65" y="70" width="19" height="11" rx="5.5" fill="${shirt}"/><circle cx="15" cy="75.5" r="6" fill="${a.paw}" stroke="rgba(0,0,0,0.12)" stroke-width="1"/><circle cx="85" cy="75.5" r="6" fill="${a.paw}" stroke="rgba(0,0,0,0.12)" stroke-width="1"/><rect x="31" y="64" width="38" height="48" rx="13" fill="${shirt}"/><circle cx="50" cy="84" r="4" fill="rgba(255,255,255,0.25)"/>`;
  return `<svg viewBox="0 0 100 175" xmlns="http://www.w3.org/2000/svg">${body}${head(profile.animal)}</svg>`;
}
