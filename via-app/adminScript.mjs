import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Leer credenciales
  const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
  const data = await fs.readFile(serviceAccountPath, "utf8");
  const serviceAccount = JSON.parse(data);

  // Inicializar Firebase Admin
  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();

  // Colección wallets - wallets iniciales
  const wallets = [
    { id: "holly_alex", name: "Holly & Alex", currency: "USD" },
    { id: "via_vento", name: "Via Vento Project", currency: "EUR" },
    { id: "via_serena", name: "Via Serena", currency: "CHF" },
  ];

  for (const wallet of wallets) {
    await db.collection("wallets").doc(wallet.id).set({
      name: wallet.name,
      currency: wallet.currency,
      createdAt: new Date(),
    });
  }

  // Colección categories - categorías y subcategorías iniciales
  const categories = [
    {
      id: "income",
      name: "Ingresos",
      subcategories: ["Salario", "Inversiones", "Regalos"],
    },
    {
      id: "expenses",
      name: "Gastos",
      subcategories: ["Comida", "Transporte", "Entretenimiento", "Salud"],
    },
    {
      id: "budgets",
      name: "Presupuestos",
      subcategories: ["Ahorro", "Vacaciones", "Proyectos"],
    },
  ];

  for (const category of categories) {
    await db.collection("categories").doc(category.id).set({
      name: category.name,
      subcategories: category.subcategories,
      createdAt: new Date(),
    });
  }

  // Colección users - usuarios ejemplo con roles y wallets compartidas
  const users = [
    {
      id: "alex",
      name: "Alex Dauria",
      email: "alex@example.com",
      roles: { holly_alex: "admin", via_serena: "admin" },
    },
    {
      id: "holly",
      name: "Holly",
      email: "holly@example.com",
      roles: { holly_alex: "editor" },
    },
    {
      id: "alan",
      name: "Alan",
      email: "alan@example.com",
      roles: { via_serena: "editor" },
    },
  ];

  for (const user of users) {
    await db.collection("users").doc(user.id).set({
      name: user.name,
      email: user.email,
      roles: user.roles,
      createdAt: new Date(),
    });
  }

  // Ejemplo presupuestos en wallets
  await db.collection("budgets").doc("budget1").set({
    walletId: "holly_alex",
    name: "Ahorro para viaje",
    targetAmount: 1000,
    progress: 200,
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-12-31"),
  });

  console.log("Datos iniciales precargados correctamente");
}

main().catch((e) => {
  console.error("Error al cargar datos iniciales:", e);
});
