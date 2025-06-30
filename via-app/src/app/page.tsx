"use client";

import React, { useEffect, useState } from "react";
import Login from "../components/Login";
import { auth } from "../adminScripts/firebaseConfig";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

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
      {/* Acá irán los módulos de tu app */}
    </div>
  );
}
