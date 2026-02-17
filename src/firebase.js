import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // שורה חדשה: ייבוא בסיס הנתונים

const firebaseConfig = {
  apiKey: "AIzaSyCo8q2JdfB2vZaPdwcCjT_i4zyUFLzrydI",
  authDomain: "let-s-learn-english-855d7.firebaseapp.com",
  projectId: "let-s-learn-english-855d7",
  storageBucket: "let-s-learn-english-855d7.firebasestorage.app",
  messagingSenderId: "185893050722",
  appId: "1:185893050722:web:9d297833e21df75d13343b",
  measurementId: "G-L6N87E3B0J"
};

// אתחול Firebase
const app = initializeApp(firebaseConfig);

// ייצוא ה-Database כדי ש-AppContext יוכל להשתמש בו
export const db = getFirestore(app);