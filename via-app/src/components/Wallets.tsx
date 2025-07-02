"use client";

import React, { useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../adminScripts/firebaseConfig";
import Transactions from "./Transactions";

type Wallet = {
  id: string;
  name: string;
  currency: string;
  icon: string;
  createdBy: string;
  sharedWith: string[];
};

type AppUser = {
  uid: string;
  name?: string | null;
  email?: string | null;
};

type WalletsProps = {
  user: User;
};

const ICONS = [
  "💰", "🏦", "💳", "👜", "🚗", "🚑", "🏥", "🍽️", "🏡", "✈️", "📦", "📊", "🛠️", "🧾", "🧍",
];

export default function Wallets({ user }: WalletsProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletCurrency, setNewWalletCurrency] = useState("USD");
  const [newWalletIcon, setNewWalletIcon] = useState(ICONS[0]);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "wallets"),
      where("sharedWith", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Wallet[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Wallet);
      });
      setWallets(data);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const loadedUsers: AppUser[] = [];
      usersSnapshot.forEach((doc) => {
        if (doc.id !== user.uid) {
          const data = doc.data();
          loadedUsers.push({
            uid: doc.id,
            name: data.name || null,
            email: data.email || null,
          });
        }
      });
      setUsersList(loadedUsers);
    };
    fetchUsers();
  }, [user]);

  async function handleCreateWallet() {
    if (!newWalletName.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }

    try {
      await addDoc(collection(db, "wallets"), {
        name: newWalletName,
        currency: newWalletCurrency,
        icon: newWalletIcon,
        createdBy: user.uid,
        sharedWith: [user.uid],
      });
      setNewWalletName("");
      setNewWalletCurrency("USD");
      setNewWalletIcon(ICONS[0]);
    } catch (error) {
      alert("Error creando wallet: " + error);
    }
  }

  async function handleUpdateWallet(
    id: string,
    field: "name" | "currency" | "sharedWith" | "icon",
    value: any
  ) {
    if ((field === "name" || field === "icon") && !value.trim()) {
      alert("El campo no puede estar vacío");
      return;
    }
    const walletRef = doc(db, "wallets", id);
    try {
      await updateDoc(walletRef, { [field]: value });
    } catch (error) {
      alert(`Error actualizando wallet (${field}): ` + error);
    }
  }

  async function handleDeleteWallet(id: string, createdBy: string) {
    if (createdBy !== user.uid) {
      alert("Solo el creador puede borrar esta wallet");
      return;
    }
    if (!confirm("¿Seguro querés borrar esta wallet?")) return;

    try {
      await deleteDoc(doc(db, "wallets", id));
    } catch (error) {
      alert("Error borrando wallet: " + error);
    }
  }

  type ShareDropdownProps = {
    walletId: string;
    sharedWith: string[];
    onChange: (uids: string[]) => void;
    usersList: AppUser[];
  };

  function ShareDropdown({ walletId, sharedWith, onChange, usersList }: ShareDropdownProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    function toggleUser(uid: string) {
      if (sharedWith.includes(uid)) {
        onChange(sharedWith.filter((u) => u !== uid));
      } else {
        onChange([...sharedWith, uid]);
      }
    }

    const selectedNames = usersList
      .filter((u) => sharedWith.includes(u.uid))
      .map((u) => u.name || u.email || u.uid)
      .join(", ") || "Nadie";

    return (
      <div
        ref={dropdownRef}
        className="relative select-none mt-2 max-w-md"
      >
        <div
          onClick={() => setOpen(!open)}
          className="py-2 px-3 border border-gray-600 rounded cursor-pointer bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          Compartido con: <b className="text-white">{selectedNames}</b>
          <span className="float-right">{open ? "▲" : "▼"}</span>
        </div>

        {open && (
          <div
            className="absolute top-full mt-1 left-0 right-0 max-h-52 overflow-y-auto border border-gray-600 rounded bg-gray-700 z-50 shadow-xl text-sm"
            role="listbox"
          >
            {usersList.map((user) => (
              <label
                key={user.uid}
                className="flex items-center py-1.5 px-3 cursor-pointer border-b border-gray-600 select-none hover:bg-gray-600 text-gray-200"
              >
                <input
                  type="checkbox"
                  checked={sharedWith.includes(user.uid)}
                  onChange={() => toggleUser(user.uid)}
                  className="mr-2 accent-blue-500"
                />
                {user.name || user.email || user.uid}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-5 text-white">
        Wallets de {user.displayName || user.email}
      </h2>

      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Nombre</label>
          <input
            placeholder="Nombre de nueva wallet"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            className="p-2 border border-gray-600 rounded text-sm w-48 bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Moneda</label>
          <select
            value={newWalletCurrency}
            onChange={(e) => setNewWalletCurrency(e.target.value)}
            className="p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="USD" className="bg-gray-700">USD</option>
            <option value="EUR" className="bg-gray-700">EUR</option>
            <option value="ARS" className="bg-gray-700">ARS</option>
            <option value="CHF" className="bg-gray-700">CHF</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Ícono</label>
          <select
            value={newWalletIcon}
            onChange={(e) => setNewWalletIcon(e.target.value)}
            className="p-1 border border-gray-600 rounded text-lg w-14 text-center cursor-pointer bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ICONS.map((icon) => (
              <option key={icon} value={icon} className="bg-gray-700">
                {icon}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCreateWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors h-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          Crear Wallet
        </button>
      </div>

      <ul className="space-y-3">
        {wallets.map((w) => (
          <li
            key={w.id}
            className="p-4 border border-gray-700 rounded-lg bg-gray-800 shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span 
                className="text-2xl cursor-pointer hover:scale-110 transition-transform"
                onClick={() => setSelectedWalletId(w.id === selectedWalletId ? null : w.id)}
                title={w.id === selectedWalletId ? "Ocultar transacciones" : "Ver transacciones"}
              >
                {w.icon}
              </span>
              
              <input
                value={w.name}
                onChange={(e) => handleUpdateWallet(w.id, "name", e.target.value)}
                className="p-2 border border-gray-600 rounded text-base flex-grow min-w-[150px] bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <select
                value={w.currency}
                onChange={(e) => handleUpdateWallet(w.id, "currency", e.target.value)}
                className="p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD" className="bg-gray-700">USD</option>
                <option value="EUR" className="bg-gray-700">EUR</option>
                <option value="ARS" className="bg-gray-700">ARS</option>
                <option value="CHF" className="bg-gray-700">CHF</option>
              </select>

              <select
                value={w.icon}
                onChange={(e) => handleUpdateWallet(w.id, "icon", e.target.value)}
                className="p-1 border border-gray-600 rounded text-lg w-14 text-center cursor-pointer bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ICONS.map((icon) => (
                  <option key={icon} value={icon} className="bg-gray-700">
                    {icon}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleDeleteWallet(w.id, w.createdBy)}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                Borrar
              </button>
            </div>

            <ShareDropdown
              walletId={w.id}
              sharedWith={w.sharedWith}
              onChange={(uids) => handleUpdateWallet(w.id, "sharedWith", uids)}
              usersList={usersList}
            />

            {w.id === selectedWalletId && (
              <div className="mt-4">
                <Transactions 
                  walletId={w.id} 
                  user={user} 
                  defaultCurrency={w.currency}
                  sharedWith={w.sharedWith}
                  usersList={usersList}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}