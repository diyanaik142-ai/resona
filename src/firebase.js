import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAEdWR4rY3OGKY7V-RQefAmNrjAb0Nckgg",
  authDomain: "resona-13.firebaseapp.com",
  projectId: "resona-13",
  storageBucket: "resona-13.firebasestorage.app",
  messagingSenderId: "953282841798",
  appId: "1:953282841798:web:41397670bdb173b5ad1bc7",
  measurementId: "G-4P1LENDBS6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, storage };
