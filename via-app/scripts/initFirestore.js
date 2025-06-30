import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

// Config Firebase (copialo de tu firebaseConfig)
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function crearDatosIniciales() {
  try {
    const walletsRef = collection(db, "wallets");
    await setDoc(doc(walletsRef, "holly-alex"), {
      name: "Holly & Alex",
      balance: 0,
      currency: "USD",
      icon: "👫"
    });
    console.log("Wallet 'holly-alex' creada");

    await setDoc(doc(walletsRef, "via-vento"), {
      name: "Via Vento Project",
      balance: 0,
      currency: "EUR",
      icon: "🚀"
    });
    console.log("Wallet 'via-vento' creada");

    const categoriesRef = collection(db, "categories");
    await setDoc(doc(categoriesRef, "food"), {
      name: "Food",
      icon: "🍔"
    });
    console.log("Categoría 'food' creada");

    await setDoc(doc(categoriesRef, "transport"), {
      name: "Transport",
      icon: "🚗"
    });
    console.log("Categoría 'transport' creada");

    console.log("Datos iniciales creados exitosamente.");
  } catch (error) {
    console.error("Error creando datos:", error);
  }
}

crearDatosIniciales();
