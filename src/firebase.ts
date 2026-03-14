import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvok1zx0yaC2K9JJYVxxheydEBVx5y1gU",
  authDomain: "dailynews-8fc04.firebaseapp.com",
  projectId: "dailynews-8fc04",
  storageBucket: "dailynews-8fc04.firebasestorage.app",
  messagingSenderId: "751891317320",
  appId: "1:751891317320:web:a47c95c403072cc5cd8e7d",
  measurementId: "G-WLYWNE561T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
