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

/* 3) EMAILJS: notifiche email "tocca a te" (il sito è statico, quindi l'invio
   passa da EmailJS, chiamato dal browser). Lascia null per DISATTIVARE — tutto
   il resto funziona lo stesso, semplicemente non parte nessuna email.
   Per attivarlo:
     1. crea un account gratuito su emailjs.com
     2. aggiungi un "Email Service" (collega la tua email) → copia il Service ID
     3. crea un "Email Template" con destinatario {{to_email}} e nel corpo le
        variabili {{to_name}}, {{game}}, {{link}} → copia il Template ID
     4. in Account → copia la "Public Key"
     5. incolla i tre codici qui sotto e togli il commento. */
export const EMAILJS = null;
// export const EMAILJS = { serviceId: 'service_xxx', templateId: 'template_xxx', publicKey: 'xxxxxxxxxxxxxx' };
