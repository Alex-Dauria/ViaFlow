import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGofgyKFz3m2CgB-gW1YiHDSqkn0IjlFc",
  authDomain: "via-flow-project.firebaseapp.com",
  projectId: "via-flow-project",
  storageBucket: "via-flow-project.firebasestorage.app",
  messagingSenderId: "518393401831",
  appId: "1:518393401831:web:4f0e606bba57ffc7016d42",
  measurementId: "G-P2345Z9RYF",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function seedTransactions() {
  const transactions = [
    {
      walletId: "defaultWallet",
      category: "Food",
      subcategory: "Groceries",
      amount: -50,
      date: Timestamp.fromDate(new Date("2025-06-25")),
      description: "Compra supermercado",
      type: "expense",
      userId: "user1",
      currency: "USD",
    },
    {
      walletId: "hollyAlex",
      category: "Income",
      subcategory: "Salary",
      amount: 1500,
      date: Timestamp.fromDate(new Date("2025-06-01")),
      description: "Sueldo mensual",
      type: "income",
      userId: "alex",
      currency: "USD",
    },
    {
      walletId: "viaSerena",
      category: "Transport",
      subcategory: "Fuel",
      amount: -80,
      date: Timestamp.fromDate(new Date("2025-06-27")),
      description: "Gasolina ambulancia",
      type: "expense",
      userId: "alan",
      currency: "CHF",
    },
    // Agregá más si querés
  ];

  for (const tx of transactions) {
    try {
      const docRef = await addDoc(collection(db, "transactions"), tx);
      console.log(`Transacción creada con ID: ${docRef.id}`);
    } catch (error) {
      console.error("Error creando transacción:", error);
    }
  }
}
