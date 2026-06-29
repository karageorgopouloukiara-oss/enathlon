# Enathlon 🎮

Sito leggero e sicuro per giocare a mini giochi con i colleghi durante i buchi di lavoro.

---

## Idea di base

Un portale web accessibile **solo tramite link segreto** dove i colleghi possono sfidarsi in piccoli giochi veloci — niente installazioni, niente sconosciuti.

**Obiettivi principali:**
- **Leggero** — carica in pochi secondi, funziona anche su reti aziendali lente
- **Sicuro** — accessibile solo a chi ha il link, no tracking
- **Sociale** — sfide tra colleghi, profili personalizzabili

---

## Mini giochi (ordine di sviluppo)

1. **Tris** — warm-up, logica semplice
2. **Scacchi** — con suggerimento mosse (Stockfish WASM)
3. **Scrabble** — il più complesso; dizionario **italiano + inglese** (selezionabile)
4. **Battaglia Navale** — posizionamento flotta e turni a eliminazione
5. **Backgammon** — classico gioco da tavolo con dadi
6. **L'Impiccato** — indovina la parola, con dizionario IT/EN
7. **Uno** — gioco di carte; **1v1 o multiplayer** (2-10 giocatori)
8. **Ludo** — gioco da tavolo; **1v1 o multiplayer** (2-4 giocatori, 4 colori)
9. **Pictionary** — disegna e indovina; **1v1 o multiplayer** (uno disegna, gli altri indovinano / a squadre)

I giochi 1-6 sono per natura **1 contro 1** (giochi da tavoliere/parola). I giochi 7-9 (Uno, Ludo, Pictionary) supportano **sia 1v1 sia più giocatori**: all'avvio si sceglie il numero di partecipanti / si invitano più colleghi.

Multiplayer **asincrono** in tutti i giochi: invii la mossa, il collega la vede quando rientra (stile gioco per corrispondenza). Il giocatore manda la richiesta di sfida all'altro, che accetta. *(Pictionary funziona meglio in tempo reale, ma supporta anche l'invio del disegno in differita.)*

---

## Stack tecnico (deciso)

- **Frontend + hosting:** GitHub Pages (gratis, sempre online)
- **Database:** Firebase Firestore (profili + stato partite, gratis per uso ragionevole)
- **Accesso:** link segreto con codice — chi non ce l'ha non entra
- **Chess engine:** Stockfish WASM (gira nel browser, livello regolabile)
- **Dizionari Scrabble:** file JSON locali (IT + EN)

> Multiplayer asincrono = niente server sempre acceso. (Alternativa scartata: LAN su laptop / VPS con Node+Socket.io, utili solo per real-time.)

---

## Identità visiva (brand)

Basata sulle brand guidelines **Enaon** come rimando al contesto lavorativo, **senza usarne il logo** e con modifiche per non associarsi direttamente all'azienda.

**Palette (da Enaon):**
| Nome | Hex | Uso |
|------|-----|-----|
| Bice Blue | `#006894` | colore primario |
| Light Sea Green | `#00A0A3` | secondario |
| Keppel | `#1FC5A8` | accento teal |
| Lime | `#C7FF1F` | highlight / energia gioco |
| Jet | `#333333` | testo / neutri |
| Dark blue | `#00007A` | profondità |

**Font:** Geologica (titoli), Commissioner (corpo) — come Enaon. (Placeholder attuale: Nunito.)

**Logo ENAthlON:** gioco di parole — **ENA** (greco: "uno") + **Athl**on (competizione) + **ON** (acceso). Icona ispirata alla goccia+fiamma di Enaon con scintille lime. Versione preferita: **su fondo scuro** (Bice Blue) con "Athl" corsivo lime.

---

## Concept Lobby — "Sala Pausa Caffè"

Schermata principale come una sala pausa in prospettiva 3D:
- **Distributore caffè alto** al centro (parete di fondo)
- **Orologio a muro** sopra il distributore → ora locale in tempo reale
- **Finestra** sul muro sinistro (prospettiva: lato lungo a sinistra) → meteo + giorno/notte in tempo reale in base alla posizione dell'utente (es. Atene soleggiato)
- **Sedie e tavoli** in prospettiva ai lati
- **Avatar dei colleghi** seduti/in piedi nella sala → clic su un avatar apre menù a tendina con le sfide disponibili
- **Tazza di caffè** in primo piano (senza mano) → clic sulla tazza = partite in corso

**Avatar:** stile Mii (Wii) — corpo umanoide con braccia/gambe + **testa di animaletto** scelto (es. volpe, orso, gufo...). Personalizzabili in qualsiasi momento: **colore dei vestiti** + nickname + animale. Altezza realistica (≈ altezza finestra).

- **Pareti bianche**. Ai lati del distributore due **poster**: uno "TIRO A SEGNO" (bersaglio) e uno finto annuncio pubblicitario.
- **Easter egg freccette:** cliccando il poster del bersaglio il protagonista (prima persona) lancia un proiettile che si conficca ogni volta in un punto diverso. Arma selezionabile: **freccette / ascia / coltelli**.
- **Selettore lingua IT / EN** in alto a destra: traduce sia la scenografia (es. caffè→coffee, Atene→Athens) sia i menù dei giochi (Scacchi→Chess, Tris→Tic-Tac-Toe). Da estendere a tutta l'app.
- **Pulsante svuota bersaglio** (🧹) per rimuovere tutti i proiettili conficcati.
- **Macchina del caffè interattiva:** cliccando Espresso / Lungo / Americano parte l'animazione di erogazione e la tazza in primo piano cambia bevanda (colore/crema diversi).

Ogni gioco ha la **sua pagina dedicata**.

### Editor avatar (personalizzazione)
Interfaccia dedicata con **anteprima dal vivo**:
- **Nickname** (max 16 caratteri)
- **Animaletto** tra 8 opzioni: volpe, orso, gufo, gatto, lupo, coniglio, panda, rana (ognuno con orecchie/muso/occhi propri)
- **Colore maglietta** e **colore pantaloni** (palette brand Enaon + colori extra)
- **Salva profilo** (persiste su Firebase)
- **Bilingue IT / EN** (toggle in alto a destra; traduce etichette, nomi animali, pulsanti)

### Identità utente (Nickname + PIN)
Accesso senza password tradizionale, basato su **nickname univoco + PIN a 4 cifre**:
- Profilo salvato su Firebase: `players/{nicknameNormalizzato}` → `{ nickname, pinHash, avatar:{animal, shirt, pants}, createdAt }`
- **Primo accesso:** scegli nickname (con check disponibilità) + PIN + avatar.
- **Rientro:** nickname + PIN → carica quel profilo. Funziona su qualsiasi dispositivo.
- **"Quale avatar è mio":** il documento del nickname con cui ti sei autenticato; i colleghi sono altri documenti nickname. Nickname unici ⇒ nessun conflitto.
- **PIN mai in chiaro** (hash lato client/Firebase, con rate-limit sui tentativi).
- Opzione **"Ricordami su questo dispositivo"**: salva solo il nickname in `localStorage` per saltare il PIN al rientro abituale; il PIN resta il metodo di recupero universale.

### Onboarding (mockup realizzato)
Flusso multi-step: **Benvenuto** (link segreto valido) → **Nickname** (check disponibilità live) → **PIN** (+ conferma) → **Avatar** (anteprima live) → **Profilo creato** → entra in lobby. Percorso alternativo **"Ho già un profilo"** = login nickname + PIN con "ricordami". Bilingue IT/EN.

**Accesso all'editor:**
- **Primo accesso (onboarding obbligatorio):** chi apre il link segreto senza avatar → editor a tutto schermo prima di entrare in lobby.
- **Modifiche successive:** **ingranaggio ⚙️ in alto a destra**, sempre presente. Apre una **tendina opzioni** con: selettore **lingua IT/EN** e **✏️ Modifica avatar** (apre l'editor in finestra modale sopra la lobby). Lingua unificata lobby+editor. Al rientro, profilo riconosciuto dal browser → dritto in lobby.
  - *(Lo specchio tematico nella sala resta un'idea opzionale, ma il punto d'accesso ufficiale è l'ingranaggio.)*

Mockup interattivi realizzati e iterati (v9): logo su fondo scuro, lobby in prospettiva con pareti bianche, finestra con prospettiva corretta, avatar ancorati e ridimensionati, sola tazza in primo piano, poster bersaglio + finto annuncio, mini-gioco lancio armi, selettore lingua IT/EN, macchina caffè interattiva, distributore e tavoli appoggiati al pavimento con ombre di contatto.

---

## Struttura del progetto (in costruzione)

```
Enathlon/
├── README.md
├── index.html              # Onboarding (Nickname+PIN) + Lobby  ✅
├── avatar.html             # Editor avatar (modifica profilo)   ✅
├── shared/
│   ├── theme.css           # tema brand (palette Enaon, Nunito) ✅
│   ├── i18n.js             # stringhe IT/EN                      ✅
│   ├── avatars.js          # animali + rendering SVG avatar      ✅
│   ├── games.js            # catalogo 9 giochi                   ✅
│   ├── store.js            # data layer (localStorage → Firebase)✅
│   ├── auth.js             # identità Nickname + PIN (hash SHA-256) ✅
│   └── main.js             # controller onboarding + lobby       ✅
└── games/
    ├── tris/               # ✅ giocabile (vs AI), punti persistenti
    ├── scacchi/  scrabble/  battaglia-navale/  backgammon/
    ├── impiccato/  uno/  ludo/  pictionary/   (da portare dai mockup)
```

## Come eseguire (sviluppo)

Il sito è statico (HTML + JS ES-modules). Serve un server locale (i moduli non funzionano da `file://`):

```bash
cd Enathlon
python3 -m http.server 8000
# apri http://localhost:8000
```

**Stato backend:** attualmente i dati (profili, punti, partite) sono su **localStorage**
dietro l'interfaccia `shared/store.js`. Per passare a **Firebase Firestore** basta
riscrivere solo quel file mantenendo le stesse funzioni (è già `async`).

**Deploy:** push su GitHub → GitHub Pages serve la cartella così com'è.

---

## Stato del progetto

| Data | Milestone |
|------|-----------|
| 2026-06-26 | Cartella creata, README inizializzato, idea definita |
| 2026-06-26 | Definiti giochi (tris/scacchi/scrabble), stack (GitHub Pages + Firebase), accesso via link segreto |
| 2026-06-26 | Concept logo ENAthlON + mockup lobby "sala pausa" iterati (v3) |
| 2026-06-26 | Lobby v9: pareti bianche, finestra/avatar/tazza sistemati, poster bersaglio + finto annuncio, lancio armi, IT/EN, macchina caffè animata, arredi a terra |
| 2026-06-26 | Lobby v11/v12: orologio sopra il distributore, ingranaggio ⚙️ in alto a destra con tendina (lingua + modifica avatar in modale) |
| 2026-06-26 | Editor avatar bilingue (8 animali, colori maglietta/pantaloni, anteprima live, salva) |
| 2026-06-26 | Mockup giochi completati e bilingui: Tris, Scacchi (con 💡 suggerimento mosse), Scrabble (tabellone 15×15 con bonus, leggio, punteggi) |
| 2026-06-26 | Mockup Battaglia Navale: 2 griglie 10×10, posizionamento flotta (auto/re-roll), turni a eliminazione, AI hunt/target, IT/EN |
| 2026-06-26 | Battaglia Navale v2: posizionamento manuale navi con rotazione e anteprima verde/rosso, ✕ sui colpi, nave in fiamme 🔥 quando affondata |
| 2026-06-26 | Battaglia Navale v4: caselle a dimensione fissa (fix visibilità griglia), un solo colpo a turno (anche dopo un colpo a segno) |
| 2026-06-26 | Mockup Uno: lobby pre-partita (2-6 giocatori, 1v1 o multiplayer), carte speciali, jolly con scelta colore, avversari animati, IT/EN |
| 2026-06-26 | Mockup Pictionary: lobby (2-6), scelta parola tra 3 (IT/EN), canvas disegno con strumenti, doodle AI animata, chat indovinelli, timer + punteggio (vince chi indovina prima) |
| 2026-06-26 | Mockup Ludo: lobby (2-4), tabellone a croce, dado, uscita col 6, catture, caselle sicure, corridoi di casa, AI, IT/EN — **tutti e 9 i giochi completati** |
| 2026-06-26 | Sfide integrate in lobby (v13): bolla sfida sopra l'avatar (accetta/declina), clic su collega = invii sfida, tazza apre tendina partite in corso, badge contatore "tuo turno" sulla tazza |
| 2026-06-26 | Lobby v14: il menù sfida elenca tutti e 9 i giochi (lista scorrevole) |
| 2026-06-29 | Identità definita: Nickname + PIN (profili Firebase per nickname); mockup onboarding multi-step (benvenuto → nickname → PIN → avatar → entra) + login, bilingue |
| 2026-06-29 | Lobby v15: poster Classifica sul muro destro (podio 🥇🥈🥉, nickname + punti, ordinata), bilingue — fase di design completata |
| 2026-06-29 | **Inizio codice reale**: scaffold (theme/i18n/avatars/games/store/auth/main), onboarding Nickname+PIN, lobby funzionante (griglia 9 giochi, classifica, partite in corso), editor avatar, **Tris giocabile vs AI** con punti persistenti. Verificato in locale, zero errori console. |
| 2026-06-29 | **Lobby scenografica reale** (lobby.html): sala pausa data-driven — colleghi=giocatori registrati con menù sfida 9 giochi, classifica/partite in corso/badge dallo store, bolla sfide in arrivo, ingranaggio (lingua/avatar/logout), caffè+orologio+armi. Verificata live. |
| 2026-06-29 | **Firebase + condivisione**: store.js a doppio backend (Firestore+realtime onSnapshot / fallback localStorage), gate codice d'accesso, regole `firestore.rules`, `.nojekyll`, guida `SETUP.md` (Firebase + GitHub Pages). Verificato gate+lobby in locale. |
| 2026-06-26 | Fix Scrabble: l'avversario ora posa le tessere sul tabellone (evidenziate) |
| 2026-06-26 | Mockup Backgammon: tavoliere 24 punte, dadi, cattura/barra/bear-off, avversario con mosse animate, IT/EN |
| 2026-06-26 | Mockup Impiccato (stile Wordle): P1 imposta parola, P2 indovina; tentativi = lunghezza+1; verde/giallo/grigio; impiccato animato a ogni errore; IT/EN |

---

## Decisioni aperte

- Quali animali offrire come avatar? (volpe, orso, gufo + ?)
- Notifica "è il tuo turno" (email / notifica browser)?
- Nickname libero o serve un minimo di identificazione?
- Refinement finale logo e lobby prima di passare al codice
