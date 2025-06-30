import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from './firebaseConfig.js';


export async function deleteCollection(collectionName) {
  const collRef = collection(db, collectionName);
  const snapshot = await getDocs(collRef);

  if (snapshot.empty) {
    console.log(`No hay documentos en la colección ${collectionName} para borrar.`);
    return;
  }

  const promises = [];
  snapshot.forEach((docSnapshot) => {
    promises.push(deleteDoc(doc(db, collectionName, docSnapshot.id)));
  });

  await Promise.all(promises);
  console.log(`Colección ${collectionName} borrada (${snapshot.size} documentos).`);
}
