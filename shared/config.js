/* =========================================================================
   Enathlon — Configurazione
   ------------------------------------------------------------------------
   1) ACCESS_CODE: codice segreto che i colleghi inseriscono al primo accesso
      (oltre ad avere il link). Puoi cambiarlo quando vuoi.
      Si può anche passare nell'URL:  .../index.html?k=IL_TUO_CODICE

   2) FIREBASE_CONFIG: config del progetto Firebase (attiva il multiplayer
      condiviso). Le chiavi web Firebase sono pubbliche per design: la
      sicurezza dei dati è garantita dalle regole in firestore.rules.
   ========================================================================= */

export const ACCESS_CODE = 'enathlon2026';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBdIkDSoHramUU1Ee84_Zlv682DILnueM0",
  authDomain: "enathlon-5e0d3.firebaseapp.com",
  projectId: "enathlon-5e0d3",
  storageBucket: "enathlon-5e0d3.firebasestorage.app",
  messagingSenderId: "425498999165",
  appId: "1:425498999165:web:7299294eb14c4a8fa9b414"
};
