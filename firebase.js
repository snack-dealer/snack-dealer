
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyARsz0aQlIgq3hxQ-YSEBQKmA3y5PSXymY",
  authDomain: "snack-dealer.firebaseapp.com",
  projectId: "snack-dealer",
  storageBucket: "snack-dealer.firebasestorage.app",
  messagingSenderId: "472019478403",
  appId: "1:472019478403:web:2e98bf6690da0d076e78b6",
  measurementId: "G-SENWQD8FSP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
