import { seedBase } from './src/adminScripts/seedBase.js';
import { seedTransactions } from './src/adminScripts/seedTransactions.js';
import { deleteCollection } from './src/adminScripts/deleteCollections.js';

async function main() {
  console.log("Borrando colecciones...");

  // Borra las colecciones que quieras limpiar antes de seedear
  await deleteCollection('users');
  await deleteCollection('wallets');
  await deleteCollection('categories');
  await deleteCollection('budgets');
  await deleteCollection('transactions'); // si existe esta colección

  console.log("Sembrando base de datos...");
  await seedBase();

  console.log("Sembrando transacciones...");
  await seedTransactions();

  console.log("Setup completado!");
}

main().catch(err => {
  console.error("Error en setup:", err);
});
