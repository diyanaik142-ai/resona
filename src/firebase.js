import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
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

// For multi-account system: create/retrieve isolated Firebase Apps
export const getAccountAuth = (email) => {
  if (!email || email === 'admin') return auth;
  const safeName = `resona_acc_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const apps = getApps();
  let accountApp = apps.find(a => a.name === safeName);
  if (!accountApp) {
    accountApp = initializeApp(firebaseConfig, safeName);
  }
  return getAuth(accountApp);
};

export { auth, storage };
