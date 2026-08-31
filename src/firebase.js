// Firebase initialization for PaintShip Phone (OTP) Authentication.
// All values come from Vite environment variables (VITE_FIREBASE_*).
import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

// Prevent re-initialization on Vite HMR (Hot Module Replacement)
export const app = firebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

export const auth = firebaseConfigured ? getAuth(app) : null;
export const db = firebaseConfigured ? getFirestore(app) : null;
export const storage = firebaseConfigured ? getStorage(app) : null;

if (db) {
  if (import.meta.env.DEV) {
    console.log("[firebase] Firestore db ready. Collection: projects");
    console.log("[Firebase Config Check] Project ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
  }
} else {
  if (import.meta.env.DEV) {
    console.warn("[firebase] Firestore db is NULL — VITE_FIREBASE_* env vars may be missing.");
    console.warn("[Firebase Config Check] Project ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
  }
}

// Firebase Auth persistence
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    if (import.meta.env.DEV) console.warn("Firebase Auth persistence error:", err);
  });
}