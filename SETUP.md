# Enathlon — Setup per farlo testare ai colleghi

Due parti: **A) Firebase** (dati condivisi tra dispositivi) e **B) GitHub Pages** (il link da condividere).
Tempo totale ~15 minuti. Tutto gratis.

> Vuoi solo provarlo da solo sul tuo PC? Salta tutto: apri una shell nella cartella
> `Enathlon` ed esegui `python3 -m http.server 8000`, poi vai su `http://localhost:8000`.
> Funziona già (dati salvati solo su quel browser).

---

## Parte A — Firebase (multiplayer condiviso)

### 1. Crea il progetto
1. Vai su https://console.firebase.google.com → **Aggiungi progetto**.
2. Nome: `enathlon` → avanti → puoi **disattivare** Google Analytics → **Crea progetto**.

### 2. Crea l'app Web e copia la config
1. Nella dashboard del progetto, clicca l'icona **`</>`** (Web).
2. Soprannome app: `enathlon-web` → **Registra app**.
3. Comparirà un blocco `const firebaseConfig = { ... }`. **Copia** quell'oggetto.

### 3. Incolla la config nel sito
Apri `shared/config.js` e sostituisci la riga `export const FIREBASE_CONFIG = null;` con:
```js
export const FIREBASE_CONFIG = {
  apiKey: "AIza...",            // ← i TUOI valori
  authDomain: "enathlon-xxxx.firebaseapp.com",
  projectId: "enathlon-xxxx",
  storageBucket: "enathlon-xxxx.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxx"
};
```
Cambia anche `ACCESS_CODE` con un codice tuo (è quello che darai ai colleghi).

### 4. Attiva Firestore
1. Menu a sinistra → **Firestore Database** → **Crea database**.
2. Località: `eur3` (Europa) → **Avanti**.
3. Avvia in **modalità di produzione** → **Crea**.

### 5. Regole di sicurezza
1. Firestore → scheda **Regole**.
2. Cancella tutto e incolla il contenuto del file **`firestore.rules`** (in questa cartella).
3. **Pubblica**.

✅ Fatto: ora i profili, le partite e le sfide sono condivisi tra tutti i dispositivi.

---

## Parte B — GitHub Pages (il link da condividere)

### 1. Crea il repository
1. Su https://github.com → **New repository** → nome `enathlon` → **Create**.
2. Carica i file della cartella `Enathlon` (drag-and-drop su "uploading an existing file",
   oppure con git):
   ```bash
   cd Enathlon
   git init && git add . && git commit -m "Enathlon"
   git branch -M main
   git remote add origin https://github.com/TUONOME/enathlon.git
   git push -u origin main
   ```

### 2. Attiva Pages
1. Repo → **Settings** → **Pages**.
2. **Source**: Deploy from a branch → Branch: `main` / `(root)` → **Save**.
3. Dopo ~1 minuto comparirà il link:
   `https://TUONOME.github.io/enathlon/`

### 3. Condividi coi colleghi
Manda loro **due cose**:
- il **link** `https://TUONOME.github.io/enathlon/`
- il **codice d'accesso** (quello in `ACCESS_CODE`)

In alternativa puoi mandare un link già sbloccato:
`https://TUONOME.github.io/enathlon/?k=IL_TUO_CODICE`

---

## Note
- **Dominio già usato in Firebase:** Authentication → Settings → Authorized domains:
  aggiungi `TUONOME.github.io` (serve solo se in futuro attivi il login Firebase).
- **Aggiornare il sito:** ri-carica i file / fai `git push`; Pages si aggiorna da solo.
- **Reset di un test in locale:** console del browser → `localStorage.clear()`.
- **Backend attivo:** in console del browser digita `localStorage` non serve — l'app usa
  Firebase appena `FIREBASE_CONFIG` non è `null`.
