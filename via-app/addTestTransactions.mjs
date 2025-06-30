import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Leer el JSON del service account sin usar import json assert
const serviceAccountPath = resolve("./serviceAccountKey.json");
const serviceAccountJSON = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

// Inicializar Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccountJSON),
});

const db = getFirestore();

async function addTestTransactions() {
  try {
    const transactions = [
      {
        date: new Date("2025-06-01"),
        amount: 120,
        category: "Comida",
        subcategory: "Almuerzo",
        wallet: "Holly & Alex",
        description: "Almuerzo en restaurante",
        type: "egreso",
        user: "alex@example.com",
        currency: "ARS",
        color: "rojo",
      },
      {
        date: new Date("2025-06-05"),
        amount: 5000,
        category: "Sueldo",
        subcategory: "Trabajo",
        wallet: "Holly & Alex",
        description: "Pago mensual",
        type: "ingreso",
        user: "alex@example.com",
        currency: "ARS",
        color: "verde",
      },
      {
        date: new Date("2025-06-10"),
        amount: 300,
        category: "Transporte",
        subcategory: "Taxi",
        wallet: "Via Vento",
        description: "Taxi al aeropuerto",
        type: "egreso",
        user: "holly@example.com",
        currency: "USD",
        color: "rojo",
      },
      {
        date: new Date("2025-06-15"),
        amount: 150,
        category: "Regalos",
        subcategory: "Cumpleaños",
        wallet: "Via Vento",
        description: "Regalo para amigo",
        type: "egreso",
        user: "holly@example.com",
        currency: "USD",
        color: "rojo",
      },
    ];

    for (const tx of transactions) {
      await db.collection("transactions").add(tx);
      console.log(`Transacción agregada: ${tx.description} - ${tx.amount}`);
    }
    console.log("Todas las transacciones de prueba fueron agregadas.");
  } catch (error) {
    console.error("Error agregando transacciones: ", error);
  }
}

addTestTransactions();
