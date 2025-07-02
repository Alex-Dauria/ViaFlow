"use client";

import React, { useEffect, useState } from "react";
import Login from "../components/Login";
import Wallets from "../components/Wallets";  // <-- agregué esto
import { auth } from "../adminScripts/firebaseConfig";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Al cerrar sesión, onAuthStateChanged detectará el cambio y mostrará el login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Necesitás loguearte para entrar</h1>
        <Login />
      </div>
    );
  }

  return (
    <div>
      <h1>Bienvenido, {user.displayName || user.email}!</h1>
      <button onClick={handleLogout}>Cerrar sesión</button>

      {/* Acá muestro el módulo Wallets con el user */}
      <Wallets user={user} />
    </div>
  );
}
