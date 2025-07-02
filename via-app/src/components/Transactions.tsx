"use client";

import React, { useEffect, useState } from "react";
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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../adminScripts/firebaseConfig";

type Transaction = {
  id: string;
  walletId: string;
  userId: string;
  userName: string;
  type: "income" | "expense" | "transfer";
  category: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  contributor: string; // Nombre del aportante
  targetContributor?: string; // Para transferencias
  createdAt: string;
  updatedAt: string;
};

type Contributor = {
  id: string;
  name: string;
  walletId: string;
};

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  walletId: string;
};

type AppUser = {
  uid: string;
  name?: string | null;
  email?: string | null;
};

type TransactionsProps = {
  walletId: string;
  user: User;
  defaultCurrency: string;
  sharedWith: string[];
  usersList: AppUser[];
};

// Función para obtener el primer día del mes
const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
};

// Función para obtener el último día del mes
const getLastDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
};

// Formatear fecha a "Mes Año"
const formatMonthYear = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
};

export default function Transactions({ 
  walletId, 
  user, 
  defaultCurrency, 
  sharedWith,
  usersList 
}: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [newTransaction, setNewTransaction] = useState<
    Omit<Transaction, "id" | "createdAt" | "updatedAt" | "userName">
  >({
    walletId,
    userId: user.uid,
    type: "expense",
    category: "",
    amount: 0,
    currency: defaultCurrency,
    date: new Date().toISOString().slice(0, 10),
    description: "",
    contributor: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("expense");
  const [newContributor, setNewContributor] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [targetContributor, setTargetContributor] = useState(""); // Para transferencias

  // Obtener el primer y último día del mes seleccionado
  const selectedMonthDate = new Date(selectedMonth + '-01');
  const firstDayOfMonth = getFirstDayOfMonth(selectedMonthDate);
  const lastDayOfMonth = getLastDayOfMonth(selectedMonthDate);

  // Cargar categorías y contribuidores
  useEffect(() => {
    const fetchData = async () => {
      // Cargar categorías
      const categoriesQuery = query(
        collection(db, "categories"),
        where("walletId", "==", walletId)
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const loadedCategories: Category[] = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      setCategories(loadedCategories);

      // Cargar contribuidores
      const contributorsQuery = query(
        collection(db, "contributors"),
        where("walletId", "==", walletId)
      );
      const contributorsSnapshot = await getDocs(contributorsQuery);
      const loadedContributors: Contributor[] = contributorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Contributor));
      setContributors(loadedContributors);

      // Establecer primer contribuidor por defecto si existe
      if (loadedContributors.length > 0 && !newTransaction.contributor) {
        setNewTransaction(prev => ({
          ...prev,
          contributor: loadedContributors[0].name
        }));
      }
    };
    
    fetchData();
  }, [walletId]);

  // Cargar transacciones
  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      where("walletId", "==", walletId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
      setTransactions(data);
    });

    return () => unsubscribe();
  }, [walletId]);

  // Crear transacción
  async function handleCreateTransaction() {
    if (!walletId) {
      alert("Seleccioná una wallet antes de agregar una transacción");
      return;
    }
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }
    if (newTransaction.type !== "transfer" && !newTransaction.category) {
      alert("Seleccioná una categoría");
      return;
    }
    if (!newTransaction.contributor) {
      alert("Seleccioná un aportante");
      return;
    }
    if (newTransaction.type === "transfer" && !targetContributor) {
      alert("Seleccioná un destinatario para la transferencia");
      return;
    }

    try {
      const transactionData: any = {
        ...newTransaction,
        walletId,
        userName: user.displayName || user.email || "Usuario",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (newTransaction.type === "transfer") {
        transactionData.targetContributor = targetContributor;
      }

      await addDoc(collection(db, "transactions"), transactionData);

      // Reset form
      setNewTransaction({
        walletId,
        userId: user.uid,
        type: "expense",
        category: "",
        amount: 0,
        currency: defaultCurrency,
        date: new Date().toISOString().slice(0, 10),
        description: "",
        contributor: newTransaction.contributor // Mantener el mismo contribuidor
      });
      setTargetContributor("");
    } catch (error) {
      alert("Error creando transacción: " + error);
    }
  }

  // Borrar transacción
  async function handleDeleteTransaction(id: string) {
    if (!confirm("¿Seguro querés borrar esta transacción?")) return;

    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
      alert("Error borrando transacción: " + error);
    }
  }

  // Crear nueva categoría
  async function handleCreateCategory() {
    if (!newCategory.trim()) {
      alert("El nombre de la categoría no puede estar vacío");
      return;
    }

    try {
      await addDoc(collection(db, "categories"), {
        name: newCategory,
        type: newCategoryType,
        walletId: walletId
      });
      setNewCategory("");
    } catch (error) {
      alert("Error creando categoría: " + error);
    }
  }

  // Crear nuevo contribuidor
  async function handleCreateContributor() {
    if (!newContributor.trim()) {
      alert("El nombre del contribuidor no puede estar vacío");
      return;
    }

    try {
      await addDoc(collection(db, "contributors"), {
        name: newContributor,
        walletId: walletId
      });
      setNewContributor("");
    } catch (error) {
      alert("Error creando contribuidor: " + error);
    }
  }

  // Calcular balances
  const calculateBalances = () => {
    const balances: Record<string, number> = {}; // { [contributor]: balance }

    // Inicializar contribuidores con balance 0
    contributors.forEach(c => {
      balances[c.name] = 0;
    });

    transactions.forEach(t => {
      if (t.type === "income") {
        // Ingresos suman al contribuidor
        balances[t.contributor] = (balances[t.contributor] || 0) + t.amount;
      } else if (t.type === "expense") {
        // Gastos restan al contribuidor
        balances[t.contributor] = (balances[t.contributor] || 0) - t.amount;
      } else if (t.type === "transfer" && t.targetContributor) {
        // Transferencias: resta del origen, suma al destino
        balances[t.contributor] = (balances[t.contributor] || 0) - t.amount;
        balances[t.targetContributor] = (balances[t.targetContributor] || 0) + t.amount;
      }
    });

    return balances;
  };

  // Obtener transacciones agrupadas por mes
  const getTransactionsByMonth = () => {
    const grouped: Record<string, Transaction[]> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      
      grouped[monthKey].push(t);
    });
    
    return grouped;
  };

  // Alternar la expansión de un mes
  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  const balances = calculateBalances();
  const transactionsByMonth = getTransactionsByMonth();
  const months = Object.keys(transactionsByMonth).sort((a, b) => b.localeCompare(a));
  const expenseCategories = categories.filter(c => c.type === "expense");
  const incomeCategories = categories.filter(c => c.type === "income");

  return (
    <div className="mt-6 pt-4 border-t border-gray-700">
      <h3 className="text-lg font-medium mb-4 text-white">Transacciones</h3>
      
      {/* Gestión de contribuidores */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="font-medium mb-3 text-white">Administrar Contribuidores</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium mb-2 text-gray-300">Nuevo Contribuidor</h5>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Nombre del contribuidor"
                value={newContributor}
                onChange={(e) => setNewContributor(e.target.value)}
                className="p-2 border border-gray-600 rounded text-sm flex-grow bg-gray-700 text-white"
              />
              <button
                onClick={handleCreateContributor}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Crear
              </button>
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium mb-2 text-gray-300">Balances</h5>
            <div className="bg-gray-700 p-3 rounded">
              {contributors.map(contributor => (
                <div key={contributor.id} className="flex justify-between text-sm py-1">
                  <span className="text-gray-300">{contributor.name}</span>
                  <span className={balances[contributor.name] >= 0 ? "text-green-400" : "text-red-400"}>
                    {balances[contributor.name] >= 0 ? '+' : ''}{balances[contributor.name]?.toFixed(2) || '0.00'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de transacción */}
      <div className="mb-6 p-4 border border-gray-700 rounded-lg bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Tipo</label>
            <select
              value={newTransaction.type}
              onChange={(e) => {
                const newType = e.target.value as "income" | "expense" | "transfer";
                setNewTransaction(prev => ({
                  ...prev,
                  type: newType,
                  category: newType === "transfer" ? "" : prev.category
                }));
              }}
              className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            >
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Contribuidor</label>
            <select
              value={newTransaction.contributor}
              onChange={(e) => setNewTransaction(prev => ({
                ...prev,
                contributor: e.target.value
              }))}
              className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            >
              <option value="">Seleccionar contribuidor</option>
              {contributors.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          
          {newTransaction.type === "transfer" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Destinatario</label>
              <select
                value={targetContributor}
                onChange={(e) => setTargetContributor(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
              >
                <option value="">Seleccionar destinatario</option>
                {contributors
                  .filter(c => c.name !== newTransaction.contributor)
                  .map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>
          )}
          
          {newTransaction.type !== "transfer" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Categoría</label>
              <select
                value={newTransaction.category}
                onChange={(e) => setNewTransaction(prev => ({
                  ...prev,
                  category: e.target.value
                }))}
                className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
              >
                <option value="">Seleccionar categoría</option>
                {newTransaction.type === "income" ? (
                  incomeCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))
                ) : (
                  expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Monto</label>
            <input
              type="number"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction(prev => ({
                ...prev,
                amount: Number(e.target.value)
              }))}
              className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
              min={0}
              step="0.01"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Moneda</label>
            <select
              value={newTransaction.currency}
              onChange={(e) => setNewTransaction(prev => ({
                ...prev,
                currency: e.target.value
              }))}
              className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="ARS">ARS</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Fecha</label>
            <input
              type="date"
              value={newTransaction.date}
              onChange={(e) => setNewTransaction(prev => ({
                ...prev,
                date: e.target.value
              }))}
              className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-300">Descripción</label>
            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={newTransaction.description || ""}
              onChange={(e) => setNewTransaction(prev => ({
                ...prev,
                description: e.target.value
              }))}
              className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
            />
          </div>
        </div>
        
        <button
          onClick={handleCreateTransaction}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
        >
          Agregar Transacción
        </button>
      </div>

      {/* Gestión de categorías */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="font-medium mb-3 text-white">Administrar Categorías</h4>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex-grow">
            <h5 className="text-sm font-medium mb-2 text-gray-300">Nueva Categoría</h5>
            <div className="flex flex-wrap gap-2">
              <select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value as "income" | "expense")}
                className="p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
              >
                <option value="income">Ingreso</option>
                <option value="expense">Egreso</option>
              </select>
              <input
                type="text"
                placeholder="Nombre de categoría"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="p-2 border border-gray-600 rounded text-sm flex-grow bg-gray-700 text-white"
              />
              <button
                onClick={handleCreateCategory}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de transacciones por mes */}
      <div>
        <h4 className="font-medium mb-3 text-white">Historial de Transacciones</h4>
        
        {months.length === 0 ? (
          <p className="text-gray-400 italic">No hay transacciones registradas</p>
        ) : (
          <div className="space-y-6">
            {months.map(month => {
              const monthDate = new Date(month + '-01');
              const monthName = formatMonthYear(monthDate.toISOString());
              const isExpanded = expandedMonths[month];
              
              return (
                <div key={month} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div 
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-700"
                    onClick={() => toggleMonth(month)}
                  >
                    <div>
                      <h5 className="font-medium text-white">{monthName}</h5>
                      <p className="text-sm text-gray-400">
                        {transactionsByMonth[month].length} transacciones
                      </p>
                    </div>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">
                      {isExpanded ? "Ocultar" : "Ver detalle"}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-700">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-750">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Categoría</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contribuidor</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Destinatario</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Monto</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {transactionsByMonth[month].map(t => (
                              <tr key={t.id} className="hover:bg-gray-750">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {t.date}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {t.type === 'income' ? 'Ingreso' : 
                                   t.type === 'expense' ? 'Egreso' : 'Transferencia'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {t.category || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {t.contributor}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {t.targetContributor || '-'}
                                </td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                                  t.type === 'income' ? 'text-green-400' : 
                                  t.type === 'expense' ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                  {t.type === 'income' ? '+' : 
                                   t.type === 'expense' ? '-' : '↔'} 
                                  {t.amount} {t.currency}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate">
                                  {t.description || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  <button
                                    onClick={() => handleDeleteTransaction(t.id)}
                                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                  >
                                    Borrar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}