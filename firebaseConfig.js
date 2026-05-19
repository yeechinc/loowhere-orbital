import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBF0eikAdb2OgZQMZ33m1y8RS4G3Wh4h88",
  authDomain: "loowhere-orbital.firebaseapp.com",
  projectId: "loowhere-orbital",
  storageBucket: "loowhere-orbital.firebasestorage.app",
  messagingSenderId: "340243250022",
  appId: "1:340243250022:web:4183dc1479348ae96666a7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);