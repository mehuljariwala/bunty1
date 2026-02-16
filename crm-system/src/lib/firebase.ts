import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBUp2ODHF6k2pVaYY26jY4cyLCbou5kxXg",
  authDomain: "meet-hub-3c03e.firebaseapp.com",
  projectId: "meet-hub-3c03e",
  storageBucket: "meet-hub-3c03e.firebasestorage.app",
  messagingSenderId: "17836504239",
  appId: "1:17836504239:web:0145ed139dafe24462d05a",
  measurementId: "G-YNNNRP88PX",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
