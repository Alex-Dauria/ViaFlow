"use client"; // Esto es clave para Next.js 13+

import React, { useEffect, useState } from "react";
import { auth } from "../adminScripts/firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const provider = new GoogleAuthProvider();
const firestore = getFirestore(); // Ajusta si tu import está distinto

export default function Login() {
  const [user, setUser] = useState<User | null>(null);

  // Función para chequear y crear usuario en Firestore si no existe
  async function checkAndCreateUserInFirestore(currentUser: User) {
    try {
      const userDocRef = doc(firestore, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: currentUser.uid,
          email: currentUser.email || "",
          name: currentUser.displayName || "",
          role: "user",
          createdAt: serverTimestamp(),
          photoURL: currentUser.photoURL || "",
          wallets: [],
        });
        console.log("Usuario creado en Firestore con rol 'user'");
      } else {
        // Actualizamos lastLogin cada vez que el usuario vuelve a loguearse
        await setDoc(
          userDocRef,
          { lastLogin: serverTimestamp() },
          { merge: true }
        );
        console.log("Usuario ya existe, lastLogin actualizado");
      }
    } catch (error) {
      console.error("Error verificando/creando usuario en Firestore:", error);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await checkAndCreateUserInFirestore(currentUser);
      }
    });

    return () => unsubscribe(); // Limpia el listener al desmontar
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      alert("Login exitoso");
    } catch (error) {
      alert("Error en login: " + error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logout exitoso");
    } catch (error) {
      alert("Error en logout: " + error);
    }
  };

  if (user) {
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <p>¡Hola, {user.displayName || user.email}!</p>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <button onClick={handleLogin}>Login con Google</button>
    </div>
  );
}
