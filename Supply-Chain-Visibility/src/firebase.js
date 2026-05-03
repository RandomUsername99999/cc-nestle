import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// INSTRUCTIONS: Replace this object with your actual Firebase project configuration
// You can find this in your Firebase Console -> Project Settings -> General -> Your Apps
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Safety check to prevent app-wide crash if firebase is unconfigured
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let database;
if (isConfigured) {
    const app = initializeApp(firebaseConfig);
    database = getDatabase(app);
} else {
    console.warn("Firebase is not configured. Real-time tracking will be unavailable.");
    database = { ref: () => ({ onValue: () => () => {} }) }; // No-op fallback
}

export { database };
export const db = database;
