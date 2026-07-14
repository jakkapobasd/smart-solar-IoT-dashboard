// firebase-config.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  // ก๊อบปี้ก้อน firebaseConfig จากหน้า console มาวางตรงนี้
  apiKey: "AIzaSyCZSz9neCR4RVBhERT2SBwycSvzl1oLgW0",
  authDomain: "lekisealert.firebaseapp.com",
  databaseURL: "https://lekisealert-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lekisealert",
  // ...
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);