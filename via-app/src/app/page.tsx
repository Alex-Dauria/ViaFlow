"use client";

import React, { useEffect, useState } from "react";
import Login from "../components/Login";
import { auth } from "../adminScripts/firebaseConfig";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import Wallets from "../components/Wallets";

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
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
          <h1 className="text-2xl font-bold text-center mb-6 text-white">
            Necesitás loguearte para entrar
          </h1>
          <Login />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-white">
          Bienvenido, {user.displayName || user.email}!
        </h1>
        <Wallets user={user} />
      </div>
    </div>
  );
}