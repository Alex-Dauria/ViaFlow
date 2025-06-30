import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, Timestamp } from "firebase/firestore";

// Configuración Firebase
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
const db = getFirestore(app);

async function seedBase() {
  try {
    // USERS
    const usersRef = collection(db, "users");
    await setDoc(doc(usersRef, "admin-uid-1"), {
      name: "Alex",
      email: "alex@example.com",
      role: "admin",
      photoURL: "",
      wallets: ["wallet1", "wallet2", "wallet3"],
    });
    // WALLETS
    const walletsRef = collection(db, "wallets");
    await setDoc(doc(walletsRef, "wallet1"), {
      name: "Holly & Alex",
      currency: "USD",
      ownerId: "admin-uid-1",
      sharedWith: ["admin-uid-1", "user-uid-2"],
      icon: "👫",
    });
    // CATEGORIES
    const categoriesRef = collection(db, "categories");
    await setDoc(doc(categoriesRef, "cat1"), {
      name: "Alimentos",
      walletId: "wallet1",
      parentCategoryId: null,
    });
    // BUDGETS
    const budgetsRef = collection(db, "budgets");
    await setDoc(doc(budgetsRef, "budget1"), {
      walletId: "wallet1",
      categoryId: "cat1",
      amount: 500,
      periodStart: Timestamp.fromDate(new Date("2025-07-01")),
      periodEnd: Timestamp.fromDate(new Date("2025-07-31")),
    });
    console.log("Seed base ejecutado OK.");
  } catch (error) {
    console.error("Error ejecutando seed base:", error);
  }
}

export { seedBase };
