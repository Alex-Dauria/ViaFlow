"use client"; // Esto es clave para Next.js 13+

import React, { useEffect, useState } from "react";
import { auth } from "../adminScripts/firebaseConfig";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

const provider = new GoogleAuthProvider();

export default function Login() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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

