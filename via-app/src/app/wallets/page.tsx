"use client";

import React, { useEffect, useState } from "react";
import { db, auth } from "../../adminScripts/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";


interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

export default function WalletsList() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function fetchWallets() {
      const querySnapshot = await getDocs(collection(db, "wallets"));
      const walletsData: Wallet[] = [];
      querySnapshot.forEach((doc) => {
        walletsData.push({ id: doc.id, ...(doc.data() as any) });
      });
      setWallets(walletsData);
    }

    fetchWallets();
  }, [user]);

  if (loading) return <div>Cargando usuario...</div>;
  if (!user) return <div>Debes loguearte para ver las wallets.</div>;

  return (
    <div>
      <h1>Mis Wallets</h1>
      {wallets.length === 0 ? (
        <p>No hay wallets cargadas.</p>
      ) : (
        <ul>
          {wallets.map((w) => (
            <li key={w.id}>
              {w.name} - {w.balance} {w.currency}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
