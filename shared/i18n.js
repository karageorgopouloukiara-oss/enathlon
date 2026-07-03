/* ===== Enathlon — i18n (IT/EN) ===== */
export const STR = {
  it: {
    // generico
    lobby: 'Lobby', back: 'Indietro', save: 'Salva', cancel: 'Annulla',
    // gate
    gateTitle: 'Accesso riservato', gateSub: 'Inserisci il codice d\'accesso che ti hanno condiviso insieme al link.', gateErr: 'Codice errato',
    // onboarding
    welcomeTitle: 'Benvenuto in Enathlon',
    welcomeSub: 'Sei entrato con un link segreto valido. Solo chi ha il link può accedere — niente sconosciuti.',
    firstAccess: 'Primo accesso — crea profilo',
    haveProfile: 'Ho già un profilo',
    chooseNick: 'Scegli il tuo nickname',
    chooseNickSub: 'Sarà il tuo nome unico in Enathlon. Ti identifica al rientro.',
    nickname: 'Nickname', next: 'Avanti',
    available: '✓ Disponibile', taken: '✕ Già in uso, scegline un altro', tooShort: 'Minimo 2 caratteri',
    setPin: 'Imposta un PIN', setPinSub: '4 cifre per proteggere il profilo e recuperarlo ovunque.',
    pin: 'PIN (4 cifre)', confirmPin: 'Conferma PIN', pinMismatch: 'I PIN non coincidono',
    createAvatar: 'Crea il tuo avatar', shirt: 'Maglietta', pants: 'Pantaloni', createProfile: 'Crea profilo',
    profileCreated: 'Profilo creato!', enterLobby: 'Entra nella sala pausa',
    rememberNote: '💡 Al prossimo accesso: nickname + PIN. Su questo dispositivo verrai riconosciuto in automatico.',
    welcomeBack: 'Bentornato', loginSub: 'Inserisci nickname e PIN per ritrovare il tuo avatar.',
    rememberMe: 'Ricordami su questo dispositivo', enter: 'Entra', badLogin: 'Nickname o PIN errati',
    // lobby
    soon: 'presto', comingSoon: 'in arrivo!',
    chooseGame: 'Scegli un gioco', players: 'Giocatori online', ongoing: 'Partite in corso',
    leaderboard: '🏆 Classifica', editAvatar: '✏️ Modifica avatar', settings: 'Impostazioni', language: 'Lingua',
    yourTurn: 'È il tuo turno', waiting: 'In attesa', resume: 'Riprendi', noOngoing: 'Nessuna partita in corso',
    challengeTo: 'Sfidalo a:', challenges: 'ti sfida!', accept: 'Accetta', decline: 'Declina',
    logout: 'Esci',
    // giochi (nomi)
    g_tris: 'Tris', g_chess: 'Scacchi', g_scrabble: 'Scrabble', g_battleship: 'Battaglia Navale',
    g_backgammon: 'Backgammon', g_hangman: 'Impiccato', g_uno: 'Uno', g_ludo: 'Ludo', g_pictionary: 'Pictionary',
    // tris
    yourTurnMsg: 'Tocca a te!', oppTurnMsg: 'Turno dell\'avversario…', youWin: '🏆 Hai vinto!',
    oppWin: 'Hai perso!', draw: 'Pareggio!', rematch: 'Rivincita', wins: 'Vittorie', vs: 'contro',
    // scrabble
    sc_play:'Conferma', sc_recall:'Ritira', sc_exchange:'Cambia', sc_pass:'Passa',
    sc_setup:'Preparazione partita…', sc_pickTile:'Seleziona una tessera dal leggio',
    sc_blankPrompt:'Quale lettera rappresenta il jolly? (A-Z)',
    sc_center:'La prima parola deve passare per il centro',
    sc_noword:'Devi formare almeno una parola', sc_invalid:'Parola non valida:',
    sc_bagEmpty:'Sacchetto vuoto', sc_pickExchange:'Seleziona una tessera da cambiare',
  },
  en: {
    lobby: 'Lobby', back: 'Back', save: 'Save', cancel: 'Cancel',
    gateTitle: 'Private access', gateSub: 'Enter the access code shared with you together with the link.', gateErr: 'Wrong code',
    welcomeTitle: 'Welcome to Enathlon',
    welcomeSub: 'You entered with a valid secret link. Only people with the link can join — no strangers.',
    firstAccess: 'First time — create profile',
    haveProfile: 'I already have a profile',
    chooseNick: 'Choose your nickname',
    chooseNickSub: 'It will be your unique name in Enathlon. It identifies you on return.',
    nickname: 'Nickname', next: 'Next',
    available: '✓ Available', taken: '✕ Already taken, pick another', tooShort: 'At least 2 characters',
    setPin: 'Set a PIN', setPinSub: '4 digits to protect your profile and recover it anywhere.',
    pin: 'PIN (4 digits)', confirmPin: 'Confirm PIN', pinMismatch: 'PINs do not match',
    createAvatar: 'Create your avatar', shirt: 'Shirt', pants: 'Pants', createProfile: 'Create profile',
    profileCreated: 'Profile created!', enterLobby: 'Enter the break room',
    rememberNote: '💡 Next time: nickname + PIN. On this device you will be recognized automatically.',
    welcomeBack: 'Welcome back', loginSub: 'Enter nickname and PIN to find your avatar.',
    rememberMe: 'Remember me on this device', enter: 'Enter', badLogin: 'Wrong nickname or PIN',
    soon: 'soon', comingSoon: 'coming soon!',
    chooseGame: 'Choose a game', players: 'Players online', ongoing: 'Ongoing games',
    leaderboard: '🏆 Leaderboard', editAvatar: '✏️ Edit avatar', settings: 'Settings', language: 'Language',
    yourTurn: 'Your turn', waiting: 'Waiting', resume: 'Resume', noOngoing: 'No ongoing games',
    challengeTo: 'Challenge to:', challenges: 'challenges you!', accept: 'Accept', decline: 'Decline',
    logout: 'Log out',
    g_tris: 'Tic-Tac-Toe', g_chess: 'Chess', g_scrabble: 'Scrabble', g_battleship: 'Battleship',
    g_backgammon: 'Backgammon', g_hangman: 'Hangman', g_uno: 'Uno', g_ludo: 'Ludo', g_pictionary: 'Pictionary',
    yourTurnMsg: 'Your turn!', oppTurnMsg: 'Opponent\'s turn…', youWin: '🏆 You won!',
    oppWin: 'You lost!', draw: 'Draw!', rematch: 'Rematch', wins: 'Wins', vs: 'vs',
    // scrabble
    sc_play:'Play', sc_recall:'Recall', sc_exchange:'Swap', sc_pass:'Pass',
    sc_setup:'Setting up game…', sc_pickTile:'Pick a tile from your rack',
    sc_blankPrompt:'Which letter does the blank stand for? (A-Z)',
    sc_center:'The first word must cross the center',
    sc_noword:'You must form at least one word', sc_invalid:'Invalid word:',
    sc_bagEmpty:'Bag is empty', sc_pickExchange:'Pick a tile to swap',
  }
};

const KEY = 'enathlon.lang';
export function getLang() { return localStorage.getItem(KEY) || 'it'; }
export function setLang(l) { localStorage.setItem(KEY, l); }
export function t(key) { const l = getLang(); return (STR[l] && STR[l][key]) || (STR.it[key]) || key; }
