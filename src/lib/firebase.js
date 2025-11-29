import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Remplacez ceci par VOS vraies clés Firebase (à trouver dans la console Firebase)
// Pour l'instant, en mode démo, on simule ou on utilise les variables d'environnement
const firebaseConfig = {
  apiKey:
    process.env.REACT_APP_FIREBASE_API_KEY ||
    "AIzaSyBxGgrGbvTerrhylVNMMnwYdZN1-rd68r8",
  authDomain: "facturation-c415d.firebaseapp.com",
  projectId: "facturation-c415d",
  storageBucket: "facturation-c415d.firebasestorage.app",
  messagingSenderId: "945272114804",
  appId: "1:945272114804:web:a8dc623ffdba4bf5efcb2",
};

// Initialisation sécurisée
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase init error", error);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "2j-habitat-gestion";
