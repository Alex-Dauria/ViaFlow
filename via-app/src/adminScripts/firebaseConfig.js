import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGofgyKFz3m2CgB-gW1YiHDSqkn0IjlFc",
  authDomain: "via-flow-project.firebaseapp.com",
  projectId: "via-flow-project",
  storageBucket: "via-flow-project.firebasestorage.app",
  messagingSenderId: "518393401831",
  appId: "1:518393401831:web:4f0e606bba57ffc7016d42",
  measurementId: "G-P2345Z9RYF"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;
