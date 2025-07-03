"use client";

import React, { useEffect } from "react";
import { auth } from "../adminScripts/firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { doc, getDoc, setDoc, serverTimestamp, getFirestore } from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";

const provider = new GoogleAuthProvider();
const firestore = getFirestore();

export default function Login() {
  // Crea usuario en Firestore si no existe
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
        console.log("Usuario creado en Firestore");
      } else {
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
        console.log("Usuario ya existe, lastLogin actualizado");
      }
    } catch (error) {
      console.error("Error creando/verificando usuario:", error);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await checkAndCreateUserInFirestore(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      alert("Login exitoso");
    } catch (error) {
      alert("Error en login: " + error);
    }
  };

  return (
    <div className="flex justify-center mt-4">
      <button
        onClick={handleLogin}
        className="flex items-center gap-3 px-6 py-3 bg-white text-gray-800 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition duration-200 ease-in-out cursor-pointer"
      >
        <FcGoogle size={24} />
        <span className="font-medium text-base">Iniciar sesión con Google</span>
      </button>
    </div>
  );
}
