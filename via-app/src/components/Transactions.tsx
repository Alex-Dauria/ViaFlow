"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db } from "../adminScripts/firebaseConfig";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Definición de tipos actualizados
type TransactionType = "income" | "expense" | "transfer" | "contribution" | "group-adjust";

type Transaction = {
  id: string;
  walletId: string;
  userId: string;
  userName: string;
  type: TransactionType;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  contributor: string;
  targetContributor?: string;
  createdAt: any;
  updatedAt: any;
  timestamp: Date;
  groupId?: string;
};

type Contributor = {
  id: string;
  name: string;
  walletId: string;
  visible: boolean;
};

type CategoryType = "income" | "expense" | "contribution";

type Category = {
  id: string;
  name: string;
  type: CategoryType;
  walletId: string;
  contributionGroup?: string[];
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
  isSharedWallet: boolean;
};

// Helper functions
const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getLastDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const formatMonthYear = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());
};

const formatAmount = (amount: number) => {
  return amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
};

// Función para calcular balances por persona (ignora transacciones de grupo)
const calculateBalances = (transactions: Transaction[]) => {
  const balances: Record<string, Record<string, number>> = {};
  
  transactions.forEach(t => {
    if (t.type === "group-adjust") return;
    
    if (!balances[t.contributor]) {
      balances[t.contributor] = {};
    }
    
    if (!balances[t.contributor][t.currency]) {
      balances[t.contributor][t.currency] = 0;
    }

    if (t.type === "income") {
      balances[t.contributor][t.currency] += t.amount;
    } else if (t.type === "expense") {
      balances[t.contributor][t.currency] -= t.amount;
    } else if (t.type === "transfer" && t.targetContributor) {
      balances[t.contributor][t.currency] -= t.amount;
      if (!balances[t.targetContributor]) {
        balances[t.targetContributor] = {};
      }
      if (!balances[t.targetContributor][t.currency]) {
        balances[t.targetContributor][t.currency] = 0;
      }
      balances[t.targetContributor][t.currency] += t.amount;
    }
  });
  
  return balances;
};

// Función para calcular aportes por grupo
const calculateGroupContributions = (transactions: Transaction[], categories: Category[]) => {
  const groupData: Record<string, {
    name: string;
    members: string[];
    contributions: Record<string, Record<string, number>>;
  }> = {};
  
  transactions
    .filter(t => t.type === "contribution")
    .forEach(t => {
      const category = categories.find(c => c.name === t.category);
      if (!category || !category.contributionGroup) return;
      
      const groupId = category.id;
      const groupName = category.name;
      const groupMembers = category.contributionGroup;
      
      if (!groupData[groupId]) {
        groupData[groupId] = {
          name: groupName,
          members: [...groupMembers],
          contributions: {}
        };
      }
      
      if (!groupData[groupId].contributions[t.contributor]) {
        groupData[groupId].contributions[t.contributor] = {};
      }
      
      if (!groupData[groupId].contributions[t.contributor][t.currency]) {
        groupData[groupId].contributions[t.contributor][t.currency] = 0;
      }
      
      groupData[groupId].contributions[t.contributor][t.currency] += t.amount;
    });
  
  return groupData;
};

// Función para calcular diferencias en grupos
const calculateGroupDifferences = (groupData: ReturnType<typeof calculateGroupContributions>) => {
  const groupDifferences: Record<string, Record<string, Record<string, number>>> = {};
  
  Object.entries(groupData).forEach(([groupId, group]) => {
    groupDifferences[groupId] = {};
    
    // Calcular totales por moneda
    const currencyTotals: Record<string, number> = {};
    Object.values(group.contributions).forEach(contributions => {
      Object.entries(contributions).forEach(([currency, amount]) => {
        if (!currencyTotals[currency]) currencyTotals[currency] = 0;
        currencyTotals[currency] += amount;
      });
    });
    
    // Calcular promedio por moneda y redondear a ENTERO
    const currencyAverages: Record<string, number> = {};
    Object.entries(currencyTotals).forEach(([currency, total]) => {
      currencyAverages[currency] = Math.round(total / group.members.length);
    });
    
    // Calcular diferencias por contribuyente (usando ENTEROS)
    group.members.forEach(member => {
      groupDifferences[groupId][member] = {};
      Object.keys(currencyAverages).forEach(currency => {
        const contribution = group.contributions[member]?.[currency] || 0;
        // Calcular diferencia como ENTERO
        groupDifferences[groupId][member][currency] = Math.round(contribution) - currencyAverages[currency];
      });
    });
  });
  
  return groupDifferences;
};

export default function Transactions({ 
  walletId, 
  user, 
  defaultCurrency, 
  sharedWith,
  usersList,
  isSharedWallet
}: TransactionsProps) {
  // Estados
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [newTransaction, setNewTransaction] = useState<
    Omit<Transaction, "id" | "createdAt" | "updatedAt" | "userName" | "timestamp">
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
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>("expense");
  const [newContributor, setNewContributor] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [targetContributor, setTargetContributor] = useState("");
  const [contributionGroups, setContributionGroups] = useState<ReturnType<typeof calculateGroupContributions>>({});
  const [groupDifferences, setGroupDifferences] = useState<ReturnType<typeof calculateGroupDifferences>>({});
  const [selectedContributorsForCategory, setSelectedContributorsForCategory] = useState<string[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showGroupTransferModal, setShowGroupTransferModal] = useState(false);
  const [groupTransferData, setGroupTransferData] = useState({
    groupId: "",
    from: "",
    to: "",
    amount: 0,
    currency: "USD"
  });

  // Filtros para transacciones
  const [filters, setFilters] = useState({
    type: "",
    category: "",
    contributor: "",
    currency: "",
    startDate: getFirstDayOfMonth(new Date()) as Date | undefined,
    endDate: new Date() as Date | undefined
  });

  // Filtros para historial
  const [historyFilters, setHistoryFilters] = useState({
    type: "",
    category: "",
    contributor: "",
    currency: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  // Estado para mostrar/ocultar filtros
  const [showFilters, setShowFilters] = useState(false);
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);

  // Categorías filtradas
  const expenseCategories = useMemo(() => 
    categories.filter(c => c.type === "expense"), 
    [categories]
  );
  
  const incomeCategories = useMemo(() => 
    categories.filter(c => c.type === "income"), 
    [categories]
  );
  
  const contributionCategories = useMemo(() => 
    categories.filter(c => c.type === "contribution"), 
    [categories]
  );

  // Cargar categorías y contribuidores
  useEffect(() => {
    if (!walletId) return;

    const categoriesQuery = query(
      collection(db, "categories"),
      where("walletId", "==", walletId)
    );
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const loadedCategories: Category[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      setCategories(loadedCategories);
    });

    const contributorsQuery = query(
      collection(db, "contributors"),
      where("walletId", "==", walletId),
      where("visible", "==", true)
    );
    const unsubscribeContributors = onSnapshot(contributorsQuery, (snapshot) => {
      const loadedContributors: Contributor[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Contributor));
      setContributors(loadedContributors);
      
      if (loadedContributors.length > 0 && !newTransaction.contributor) {
        setNewTransaction(prev => ({
          ...prev,
          contributor: loadedContributors[0].name
        }));
      }
    });

    return () => {
      unsubscribeCategories();
      unsubscribeContributors();
    };
  }, [walletId]);

  // Cargar transacciones y calcular aportes
  useEffect(() => {
    if (!walletId) return;

    const q = query(
      collection(db, "transactions"),
      where("walletId", "==", walletId),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          timestamp: new Date(docData.date),
          type: docData.type as TransactionType
        } as Transaction;
      });
      setTransactions(data);
      
      if (isSharedWallet) {
        const groups = calculateGroupContributions(data, categories);
        setContributionGroups(groups);
        setGroupDifferences(calculateGroupDifferences(groups));
      }
    });

    return () => unsubscribe();
  }, [walletId, isSharedWallet, categories]);

  // Manejo de transacciones
  const handleCreateTransaction = async () => {
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
        contributor: newTransaction.contributor,
      });
      setTargetContributor("");
    } catch (error) {
      alert("Error creando transacción: " + error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("¿Seguro querés borrar esta transacción?")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
      alert("Error borrando transacción: " + error);
    }
  };

  // Manejo de categorías
  const handleCreateCategory = async () => {
    if (!newCategory.trim()) {
      alert("El nombre de la categoría no puede estar vacío");
      return;
    }

    const categoryData: any = {
      name: newCategory,
      type: newCategoryType,
      walletId: walletId
    };

    if (newCategoryType === "contribution" && selectedContributorsForCategory.length > 0) {
      categoryData.contributionGroup = selectedContributorsForCategory;
    }

    try {
      await addDoc(collection(db, "categories"), categoryData);
      setNewCategory("");
      setSelectedContributorsForCategory([]);
      setShowGroupSelector(false);
    } catch (error) {
      alert("Error creando categoría: " + error);
    }
  };

  // Manejo de contribuidores
  const handleCreateContributor = async () => {
    if (!newContributor.trim()) {
      alert("El nombre del contribuidor no puede estar vacío");
      return;
    }
    try {
      await addDoc(collection(db, "contributors"), {
        name: newContributor,
        walletId: walletId,
        visible: true
      });
      setNewContributor("");
    } catch (error) {
      alert("Error creando contribuidor: " + error);
    }
  };

  const handleDeleteContributor = async (id: string) => {
    if (!confirm("¿Seguro querés ocultar este contribuidor?")) return;
    try {
      await updateDoc(doc(db, "contributors", id), {
        visible: false
      });
    } catch (error) {
      alert("Error ocultando contribuidor: " + error);
    }
  };

  // Transferencias de grupo que ajustan los aportes
  const handleGroupTransfer = async () => {
    if (!groupTransferData.amount || groupTransferData.amount <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }
    if (!groupTransferData.from || !groupTransferData.to) {
      alert("Seleccioná un emisor y receptor");
      return;
    }

    const group = contributionGroups[groupTransferData.groupId];
    if (!group) return;

    try {
      // 1. Crear transacción de transferencia
      await addDoc(collection(db, "transactions"), {
        walletId,
        userId: user.uid,
        type: "group-adjust",
        category: "Ajuste de grupo",
        amount: groupTransferData.amount,
        currency: groupTransferData.currency,
        date: new Date().toISOString().slice(0, 10),
        description: `Transferencia para equilibrar grupo: ${group.name}`,
        contributor: groupTransferData.from,
        targetContributor: groupTransferData.to,
        userName: user.displayName || user.email || "Usuario",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        groupId: groupTransferData.groupId
      });

      // 2. Ajustar los aportes del grupo
      // Aporte del receptor (disminuye)
      await addDoc(collection(db, "transactions"), {
        walletId,
        userId: user.uid,
        type: "contribution",
        category: group.name,
        amount: -groupTransferData.amount, // Resta al que recibe
        currency: groupTransferData.currency,
        date: new Date().toISOString().slice(0, 10),
        description: `Aporte ajustado por transferencia de grupo`,
        contributor: groupTransferData.to,
        userName: user.displayName || user.email || "Usuario",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        groupId: groupTransferData.groupId
      });

      // Aporte del emisor (aumenta)
      await addDoc(collection(db, "transactions"), {
        walletId,
        userId: user.uid,
        type: "contribution",
        category: group.name,
        amount: groupTransferData.amount,
        currency: groupTransferData.currency,
        date: new Date().toISOString().slice(0, 10),
        description: `Aporte ajustado por transferencia de grupo`,
        contributor: groupTransferData.from,
        userName: user.displayName || user.email || "Usuario",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        groupId: groupTransferData.groupId
      });

      setShowGroupTransferModal(false);
    } catch (error) {
      alert("Error registrando transferencia: " + error);
    }
  };

  // Cálculo de balances (ignora transacciones de grupo)
  const allBalances = useMemo(() => calculateBalances(transactions), [transactions]);

  // Filtrar transacciones
  const filterTransactions = useCallback(() => {
    let filtered = [...transactions];

    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    if (filters.contributor) {
      filtered = filtered.filter(t => 
        t.contributor === filters.contributor || 
        t.targetContributor === filters.contributor
      );
    }
    if (filters.currency) {
      filtered = filtered.filter(t => t.currency === filters.currency);
    }
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        if (filters.startDate && transactionDate < filters.startDate) return false;
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23,59,59,999);
          if (transactionDate > endOfDay) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [transactions, filters]);

  const filteredTransactions = filterTransactions();

  // Filtrar transacciones para el historial
  const filterHistoryTransactions = useCallback(() => {
    let filtered = [...transactions];

    if (historyFilters.type) {
      filtered = filtered.filter(t => t.type === historyFilters.type);
    }
    if (historyFilters.category) {
      filtered = filtered.filter(t => t.category === historyFilters.category);
    }
    if (historyFilters.contributor) {
      filtered = filtered.filter(t => 
        t.contributor === historyFilters.contributor || 
        t.targetContributor === historyFilters.contributor
      );
    }
    if (historyFilters.currency) {
      filtered = filtered.filter(t => t.currency === historyFilters.currency);
    }
    if (historyFilters.startDate || historyFilters.endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        if (historyFilters.startDate && transactionDate < historyFilters.startDate) return false;
        if (historyFilters.endDate) {
          const endOfDay = new Date(historyFilters.endDate);
          endOfDay.setHours(23,59,59,999);
          if (transactionDate > endOfDay) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [transactions, historyFilters]);

  const filteredHistory = filterHistoryTransactions();

  // Agrupar transacciones por mes (para el historial)
  const getTransactionsByMonth = useCallback((transactions: Transaction[]) => {
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
  }, []);

  const transactionsByMonth = getTransactionsByMonth(filteredHistory);
  const months = Object.keys(transactionsByMonth).sort((a, b) => b.localeCompare(a));

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  // Renderizado de diferencias por grupo con recomendaciones mejoradas
  const renderGroupDifferences = () => {
    return Object.entries(groupDifferences).map(([groupId, groupDiffs]) => {
      const group = contributionGroups[groupId];
      if (!group) return null;

      // Comprobar si todas las diferencias son cero (ENTEROS)
      let allZero = true;
      Object.values(groupDiffs).forEach(memberDiffs => {
        Object.values(memberDiffs).forEach(diff => {
          if (diff !== 0) {
            allZero = false;
          }
        });
      });

      // Preparar datos para recomendaciones
      const recommendations: { currency: string; from: string; to: string; amount: number }[] = [];
      
      // Solo si no están todas las diferencias en cero
      if (!allZero) {
        // Primero, agrupar diferencias por moneda
        const currencyDiffs: Record<string, {positive: {member: string, amount: number}[], negative: {member: string, amount: number}[]}> = {};
        
        Object.entries(groupDiffs).forEach(([member, currencies]) => {
          Object.entries(currencies).forEach(([currency, amount]) => {
            if (!currencyDiffs[currency]) {
              currencyDiffs[currency] = { positive: [], negative: [] };
            }
            
            if (amount > 0) {
              currencyDiffs[currency].positive.push({ member, amount });
            } else if (amount < 0) {
              currencyDiffs[currency].negative.push({ member, amount: Math.abs(amount) });
            }
          });
        });
        
        // Generar recomendaciones por moneda
        Object.entries(currencyDiffs).forEach(([currency, {positive, negative}]) => {
          // Ordenar de mayor a menor
          positive.sort((a, b) => b.amount - a.amount);
          negative.sort((a, b) => b.amount - a.amount);
          
          // Emparejar diferencias
          while (positive.length > 0 && negative.length > 0) {
            const creditor = positive[0];
            const debtor = negative[0];
            const transferAmount = Math.min(creditor.amount, debtor.amount);
            
            recommendations.push({
              currency,
              from: debtor.member,
              to: creditor.member,
              amount: transferAmount
            });
            
            // Actualizar diferencias
            positive[0].amount -= transferAmount;
            negative[0].amount -= transferAmount;
            
            // Eliminar si llegan a cero
            if (positive[0].amount <= 0) positive.shift();
            if (negative[0].amount <= 0) negative.shift();
          }
        });
      }

      return (
        <div key={groupId} className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-white">{group.name}</h4>
            <button 
              onClick={() => {
                setGroupTransferData({
                  groupId,
                  from: "",
                  to: "",
                  amount: 0,
                  currency: "USD"
                });
                setShowGroupTransferModal(true);
              }}
              className="px-3 py-1 bg-blue-600 text-sm rounded hover:bg-blue-700"
            >
              Registrar Transferencia
            </button>
          </div>
          
          {/* Mostrar miembros del grupo */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-300 mb-2">Miembros del grupo:</h5>
            <div className="flex flex-wrap gap-2">
              {group.members.map(member => (
                <span key={`member-${groupId}-${member}`} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                  {member}
                </span>
              ))}
            </div>
          </div>
          
          {/* Aportes por persona */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {Object.entries(group.contributions).map(([contributor, currencies]) => (
              <div key={contributor} className="bg-gray-700 p-3 rounded border border-gray-600">
                <div className="text-sm text-gray-300">Aporte de {contributor}</div>
                {Object.entries(currencies)
                  .sort((a, b) => a[0].localeCompare(b[0])) // 👈 Orden alfabético
                  .map(([currency, amount]) => (
                    <div key={`${contributor}-${currency}`} className="text-lg font-semibold text-green-400">
                      {Math.round(amount)} {currency} {/* 👈 Sin signo + */}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          
          <div className="bg-gray-750 p-3 rounded border border-gray-600">
            <h5 className="font-medium text-white mb-2">Balance del Grupo</h5>
            
            {allZero ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-2">☯</div>
                <p className="text-green-400 font-medium">Mismos aportes realizados</p>
              </div>
            ) : (
              <>
                {/* Mostrar diferencias por usuario */}
                {group.members.map(member => {
                  const memberDiffs = groupDiffs[member] || {};
                  const positiveDiffs: {currency: string, amount: number}[] = [];
                  const negativeDiffs: {currency: string, amount: number}[] = [];
                  
                  Object.entries(memberDiffs).forEach(([currency, amount]) => {
                    if (amount > 0) {
                      positiveDiffs.push({ currency, amount });
                    } else if (amount < 0) {
                      negativeDiffs.push({ currency, amount: Math.abs(amount) });
                    }
                  });
                  
                  return (
                    <div key={`${groupId}-${member}`} className="mb-4">
                      <div className="text-sm font-medium text-gray-300">{member}:</div>
                      
                      {positiveDiffs.length > 0 && (
                        <div className="text-green-400">
                          Excedente: {positiveDiffs.map(diff => `${formatAmount(diff.amount)} ${diff.currency}`).join(", ")}
                        </div>
                      )}
                      
                      {negativeDiffs.length > 0 && (
                        <div className="text-red-400">
                          Déficit: {negativeDiffs.map(diff => `${formatAmount(diff.amount)} ${diff.currency}`).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className="mt-4">
                  <h5 className="font-medium text-white mb-2">Recomendaciones:</h5>
                  {recommendations.map((rec, index) => (
                    <div key={index} className="text-yellow-300 text-sm mb-2">
                      {rec.from} debe transferir {formatAmount(rec.amount)} {rec.currency} a {rec.to}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  // Formatear balance para mostrar
  const formatBalance = (balance: Record<string, number>) => {
    return Object.entries(balance).map(([currency, amount]) => (
      <div key={currency} className={`text-sm ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {formatAmount(amount)} {currency}
      </div>
    ));
  };

  return (
    <div className="mt-6 pt-4 border-t border-gray-700">
      {/* Sección de Aportes por Grupo */}
      {isSharedWallet && Object.keys(contributionGroups).length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-white mb-3">Aportes por Grupo</h4>
          {renderGroupDifferences()}
        </div>
      )}

      {/* Modal para transferencias de grupo */}
      {showGroupTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-white">Registrar Transferencia de Grupo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-gray-300">Emisor</label>
                <select
                  value={groupTransferData.from}
                  onChange={(e) => setGroupTransferData(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Seleccionar emisor</option>
                  {groupTransferData.groupId && contributionGroups[groupTransferData.groupId]?.members.map(member => (
                    <option key={member} value={member}>{member}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Receptor</label>
                <select
                  value={groupTransferData.to}
                  onChange={(e) => setGroupTransferData(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Seleccionar receptor</option>
                  {groupTransferData.groupId && contributionGroups[groupTransferData.groupId]?.members
                    .filter(m => m !== groupTransferData.from)
                    .map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Monto</label>
                <input
                  type="number"
                  value={groupTransferData.amount}
                  onChange={(e) => setGroupTransferData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                  min={0}
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Moneda</label>
                <select
                  value={groupTransferData.currency}
                  onChange={(e) => setGroupTransferData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="ARS">ARS</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowGroupTransferModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleGroupTransfer}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-500"
              >
                Registrar Transferencia
              </button>
            </div>
          </div>
        </div>
      )}

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
            
            <div className="mt-4">
              <h5 className="text-sm font-medium mb-2 text-gray-300">Contribuidores Activos</h5>
              <div className="bg-gray-700 p-3 rounded max-h-40 overflow-y-auto">
                {contributors.map(c => (
                  <div key={c.id} className="flex justify-between items-center py-1">
                    <span className="text-gray-300">{c.name}</span>
                    <button
                      onClick={() => handleDeleteContributor(c.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      Ocultar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balances (no afectados por filtros) */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="font-medium text-white mb-3">Balances Generales</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-750 p-4 rounded">
            <h5 className="font-medium text-white mb-2">Balance Total</h5>
            <div>
              {Object.entries(allBalances).map(([contributor, balances]) => (
                <div key={contributor} className="mb-3">
                  <div className="text-sm font-medium text-gray-300">{contributor}</div>
                  <div className="mt-1">
                    {formatBalance(balances)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-750 p-4 rounded">
            <h5 className="font-medium text-white mb-2">Balance del Mes Actual</h5>
            <div>
              {Object.entries(
                calculateBalances(
                  transactions.filter(t => {
                    const tDate = new Date(t.date);
                    const firstDay = getFirstDayOfMonth(new Date());
                    const lastDay = new Date();
                    return tDate >= firstDay && tDate <= lastDay;
                  })
                )
              ).map(([contributor, balances]) => (
                <div key={contributor} className="mb-3">
                  <div className="text-sm font-medium text-gray-300">{contributor}</div>
                  <div className="mt-1">
                    {formatBalance(balances)}
                  </div>
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
                const newType = e.target.value as TransactionType;
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
              <option value="contribution">Aporte</option>
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
                ) : newTransaction.type === "expense" ? (
                  expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))
                ) : (
                  contributionCategories.map(cat => (
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

      {/* Transacciones */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-white">Transacciones</h4>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
          >
            {showFilters ? "Ocultar Filtros" : "Filtrar"}
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="font-medium text-white mb-3">Filtros</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-300">Tipo</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todos</option>
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                  <option value="transfer">Transferencia</option>
                  <option value="contribution">Aporte</option>
                  <option value="group-adjust">Ajuste de Grupo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Categoría</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Contribuyente</label>
                <select
                  value={filters.contributor}
                  onChange={(e) => setFilters(prev => ({ ...prev, contributor: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todos</option>
                  {contributors.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Moneda</label>
                <select
                  value={filters.currency}
                  onChange={(e) => setFilters(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todas</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="ARS">ARS</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Desde</label>
                <DatePicker
                  selected={filters.startDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, startDate: date || undefined }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Hasta</label>
                <DatePicker
                  selected={filters.endDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, endDate: date || undefined }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                />
              </div>
            </div>
            
            <button
              onClick={() => {
                setFilters({
                  type: "",
                  category: "",
                  contributor: "",
                  currency: "",
                  startDate: getFirstDayOfMonth(new Date()),
                  endDate: new Date()
                });
              }}
              className="mt-4 px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
            >
              Limpiar Filtros
            </button>
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <p className="text-gray-400 italic">No hay transacciones</p>
        ) : (
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
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {new Date(t.date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {t.type === 'income' ? 'Ingreso' : 
                       t.type === 'expense' ? 'Egreso' : 
                       t.type === 'transfer' ? 'Transferencia' : 
                       t.type === 'contribution' ? 'Aporte' : 'Ajuste Grupo'}
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
                      t.type === 'expense' ? 'text-red-400' : 
                      t.type === 'contribution' ? 'text-blue-400' : 
                      t.type === 'group-adjust' ? 'text-purple-400' : 'text-yellow-400'
                    }`}>
                      {t.type === 'income' ? '+' : 
                       t.type === 'expense' ? '-' : 
                       t.type === 'contribution' ? '↗' : 
                       t.type === 'group-adjust' ? '⇄' : '↔'} 
                      {formatAmount(t.amount)} {t.currency}
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
        )}
      </div>

      {/* Historial de transacciones */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-white">Historial de Transacciones</h4>
          <button
            onClick={() => setShowHistoryFilters(!showHistoryFilters)}
            className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
          >
            {showHistoryFilters ? "Ocultar Filtros" : "Filtrar"}
          </button>
        </div>

        {showHistoryFilters && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="font-medium text-white mb-3">Filtros de Historial</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-300">Tipo</label>
                <select
                  value={historyFilters.type}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todos</option>
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                  <option value="transfer">Transferencia</option>
                  <option value="contribution">Aporte</option>
                  <option value="group-adjust">Ajuste de Grupo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Categoría</label>
                <select
                  value={historyFilters.category}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todas</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Contribuyente</label>
                <select
                  value={historyFilters.contributor}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, contributor: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todos</option>
                  {contributors.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Moneda</label>
                <select
                  value={historyFilters.currency}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                >
                  <option value="">Todas</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="ARS">ARS</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Desde</label>
                <DatePicker
                  selected={historyFilters.startDate}
                  onChange={(date) => setHistoryFilters(prev => ({ ...prev, startDate: date || undefined }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1 text-gray-300">Hasta</label>
                <DatePicker
                  selected={historyFilters.endDate}
                  onChange={(date) => setHistoryFilters(prev => ({ ...prev, endDate: date || undefined }))}
                  className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                />
              </div>
            </div>
            
            <button
              onClick={() => {
                setHistoryFilters({
                  type: "",
                  category: "",
                  contributor: "",
                  currency: "",
                  startDate: undefined,
                  endDate: undefined
                });
              }}
              className="mt-4 px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
            >
              Limpiar Filtros
            </button>
          </div>
        )}

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
                                  {new Date(t.date).toLocaleDateString('es-ES')}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {t.type === 'income' ? 'Ingreso' : 
                                   t.type === 'expense' ? 'Egreso' : 
                                   t.type === 'transfer' ? 'Transferencia' : 
                                   t.type === 'contribution' ? 'Aporte' : 'Ajuste Grupo'}
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
                                  t.type === 'expense' ? 'text-red-400' : 
                                  t.type === 'contribution' ? 'text-blue-400' : 
                                  t.type === 'group-adjust' ? 'text-purple-400' : 'text-yellow-400'
                                }`}>
                                  {t.type === 'income' ? '+' : 
                                   t.type === 'expense' ? '-' : 
                                   t.type === 'contribution' ? '↗' : 
                                   t.type === 'group-adjust' ? '⇄' : '↔'} 
                                  {formatAmount(t.amount)} {t.currency}
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