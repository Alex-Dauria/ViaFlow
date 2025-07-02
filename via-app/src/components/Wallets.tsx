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
  "💰", // dinero
  "🏦", // banco
  "💳", // tarjeta
  "👜", // bolso
  "🚗", // auto
  "🚑", // ambulancia
  "🏥", // hospital
  "🍽️", // comida
  "🏡", // casa
  "✈️", // viajes
  "📦", // logística
  "📊", // finanzas
  "🛠️", // herramientas
  "🧾", // recibos
  "🧍", // persona
];


export default function Wallets({ user }: WalletsProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletCurrency, setNewWalletCurrency] = useState("USD");
  const [newWalletIcon, setNewWalletIcon] = useState(ICONS[0]);

  const [usersList, setUsersList] = useState<AppUser[]>([]);

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
  };

  function ShareDropdown({ walletId, sharedWith, onChange }: ShareDropdownProps) {
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
        style={{
          position: "relative",
          userSelect: "none",
          marginTop: 8,
          maxWidth: 400,
        }}
      >
        <div
          onClick={() => setOpen(!open)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
            backgroundColor: "#fff",
            fontSize: 14,
            color: "#222222",
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          Compartido con: <b>{selectedNames}</b>
          <span style={{ float: "right" }}>{open ? "▲" : "▼"}</span>
        </div>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              maxHeight: 200,
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 4,
              backgroundColor: "#fff",
              zIndex: 1000,
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              fontSize: 14,
              color: "#222222",
            }}
            role="listbox"
          >
            {usersList.map((user) => (
              <label
                key={user.uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                  userSelect: "none",
                  color: "#222222",
                }}
              >
                <input
                  type="checkbox"
                  checked={sharedWith.includes(user.uid)}
                  onChange={() => toggleUser(user.uid)}
                  style={{ marginRight: 8 }}
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
    <div
      style={{
        maxWidth: 700,
        margin: "2rem auto",
        fontFamily: "Arial, sans-serif",
        color: "#222222",
      }}
    >
      <h2 style={{ marginBottom: 20 }}>
        Wallets de {user.displayName || user.email}
      </h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Nombre de nueva wallet"
          value={newWalletName}
          onChange={(e) => setNewWalletName(e.target.value)}
          style={{
            marginRight: 8,
            padding: 6,
            fontSize: 14,
            borderRadius: 4,
            border: "1px solid #ccc",
            width: 200,
            color: "#222222",
          }}
        />
        <select
          value={newWalletCurrency}
          onChange={(e) => setNewWalletCurrency(e.target.value)}
          style={{
            marginRight: 8,
            padding: 6,
            fontSize: 14,
            borderRadius: 4,
            border: "1px solid #ccc",
            color: "#222222",
          }}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="ARS">ARS</option>
          <option value="CHF">CHF</option>
        </select>

        {/* Selector íconos */}
        <select
          value={newWalletIcon}
          onChange={(e) => setNewWalletIcon(e.target.value)}
          style={{
            marginRight: 8,
            padding: 6,
            fontSize: 18,
            borderRadius: 4,
            border: "1px solid #ccc",
            color: "#222222",
            width: 60,
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "#fff",
          }}
        >
          {ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>

        <button
          onClick={handleCreateWallet}
          style={{
            padding: "7px 15px",
            fontSize: 14,
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
          }}
        >
          Crear Wallet
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {wallets.map((w) => (
          <li
            key={w.id}
            style={{
              marginBottom: 12,
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 6,
              backgroundColor: "#f9f9f9",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 24 }}>{w.icon}</span>
              <input
                value={w.name}
                onChange={(e) =>
                  handleUpdateWallet(w.id, "name", e.target.value)
                }
                style={{
                  fontSize: 16,
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  flexGrow: 1,
                  color: "#222222",
                }}
              />
              <select
                value={w.currency}
                onChange={(e) =>
                  handleUpdateWallet(w.id, "currency", e.target.value)
                }
                style={{
                  marginLeft: 10,
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  color: "#222222",
                }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
                <option value="CHF">CHF</option>
              </select>

              <select
                value={w.icon}
                onChange={(e) =>
                  handleUpdateWallet(w.id, "icon", e.target.value)
                }
                style={{
                  marginLeft: 10,
                  padding: 6,
                  fontSize: 18,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  width: 60,
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  color: "#222222",
                }}
              >
                {ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleDeleteWallet(w.id, w.createdBy)}
                style={{
                  marginLeft: 12,
                  padding: "6px 12px",
                  backgroundColor: "#dc3545",
                  border: "none",
                  borderRadius: 4,
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Borrar
              </button>
            </div>

            <ShareDropdown
              walletId={w.id}
              sharedWith={w.sharedWith}
              onChange={(uids) => handleUpdateWallet(w.id, "sharedWith", uids)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
