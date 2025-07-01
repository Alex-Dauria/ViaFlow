// src/adminScripts/seedBase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, addDoc, Timestamp } from "firebase/firestore";

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
    await setDoc(doc(usersRef, "user-uid-2"), {
      name: "Holly",
      email: "holly@example.com",
      role: "user",
      photoURL: "",
      wallets: ["wallet1"],
    });
    await setDoc(doc(usersRef, "user-uid-3"), {
      name: "Alan",
      email: "alan@example.com",
      role: "user",
      photoURL: "",
      wallets: ["wallet3"],
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
    await setDoc(doc(walletsRef, "wallet2"), {
      name: "Personal Alex",
      currency: "USD",
      ownerId: "admin-uid-1",
      sharedWith: ["admin-uid-1"],
      icon: "👤",
    });
    await setDoc(doc(walletsRef, "wallet3"), {
      name: "Via Serena",
      currency: "CHF",
      ownerId: "user-uid-3",
      sharedWith: ["user-uid-3"],
      icon: "🚑",
    });

    // CATEGORIES
    const categoriesRef = collection(db, "categories");
    await setDoc(doc(categoriesRef, "cat1"), {
      name: "Alimentos",
      walletId: "wallet1",
      parentCategoryId: null,
    });
    await setDoc(doc(categoriesRef, "cat2"), {
      name: "Ingresos",
      walletId: "wallet1",
      parentCategoryId: null,
    });
    await setDoc(doc(categoriesRef, "cat3"), {
      name: "Transporte",
      walletId: "wallet3",
      parentCategoryId: null,
    });
    await setDoc(doc(categoriesRef, "cat4"), {
      name: "Mantenimiento",
      walletId: "wallet3",
      parentCategoryId: null,
    });
    await setDoc(doc(categoriesRef, "cat5"), {
      name: "Logística",
      walletId: "wallet3",
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

    // TRANSACTIONS
    const transactionsRef = collection(db, "transactions");
    await addDoc(transactionsRef, {
      walletId: "wallet1",
      categoryId: "cat1",
      amount: -50,
      date: Timestamp.fromDate(new Date("2025-06-25")),
      description: "Compra supermercado",
      type: "expense",
      userId: "admin-uid-1",
      currency: "USD",
    });
    await addDoc(transactionsRef, {
      walletId: "wallet1",
      categoryId: "cat2",
      amount: 1500,
      date: Timestamp.fromDate(new Date("2025-06-01")),
      description: "Sueldo mensual",
      type: "income",
      userId: "admin-uid-1",
      currency: "USD",
    });
    await addDoc(transactionsRef, {
      walletId: "wallet3",
      categoryId: "cat3",
      amount: -80,
      date: Timestamp.fromDate(new Date("2025-06-27")),
      description: "Gasolina ambulancia",
      type: "expense",
      userId: "user-uid-3",
      currency: "CHF",
    });
    await addDoc(transactionsRef, {
      walletId: "wallet3",
      categoryId: "cat4",
      amount: -150,
      date: Timestamp.fromDate(new Date("2025-06-28")),
      description: "Reparación ambulancia AMB001",
      type: "expense",
      userId: "user-uid-3",
      currency: "CHF",
    });

    // AMBULANCES
    const ambulancesRef = collection(db, "ambulances");
    await setDoc(doc(ambulancesRef, "AMB001"), {
      driver: "John Doe",
      lastServiceDate: Timestamp.fromDate(new Date("2025-06-20")),
      status: "available",
      licensePlate: "XYZ123",
    });
    await setDoc(doc(ambulancesRef, "AMB002"), {
      driver: "Jane Smith",
      lastServiceDate: Timestamp.fromDate(new Date("2025-06-15")),
      status: "in service",
      licensePlate: "ABC789",
    });

    // PROVIDERS
    const providersRef = collection(db, "providers");
    await setDoc(doc(providersRef, "prov_1"), {
      name: "Proveedor A",
      amount_owed: 2000,
      is_paid: false,
      contact: "contacto@proveedora.com",
    });
    await setDoc(doc(providersRef, "prov_2"), {
      name: "Proveedor B",
      amount_owed: 0,
      is_paid: true,
      contact: "info@proveedorb.com",
    });

    // ROUTES
    const routesRef = collection(db, "routes");
    await setDoc(doc(routesRef, "route_001"), {
      name: "Ruta Hospital A - B",
      points: ["Base Norte", "Hospital A", "Hospital B"],
      estimated_time_min: 45,
      assigned_ambulance: "AMB002",
      created_at: Timestamp.fromDate(new Date()),
    });

    // WORKERS_TRIPS
    const tripsRef = collection(db, "workers_trips");
    await setDoc(doc(tripsRef, "trip_001"), {
      workerId: "user-uid-3",
      ambulanceId: "AMB001",
      origin: "Base Norte",
      destination: "Hospital X",
      date: Timestamp.fromDate(new Date("2025-07-01")),
      duration_min: 35,
    });

    console.log("Seed base ejecutado OK.");
  } catch (error) {
    console.error("Error ejecutando seed base:", error);
  }
}

export { seedBase };
seedBase();

