import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useAppData = create(
  devtools(
    persist(
      (set, get) => ({
        // Estados principales
        wallets: [],
        users: [],
        categories: [],
        transactions: [],
        budgets: [],

        // Inicializar con datos (puede ser llamado una vez al cargar)
        initializeData: (data) => {
          set({
            wallets: data.wallets || [],
            users: data.users || [],
            categories: data.categories || [],
            transactions: data.transactions || [],
            budgets: data.budgets || [],
          });
        },

        // --- Wallets ---
        addWallet: (wallet) =>
          set((state) => ({ wallets: [...state.wallets, wallet] })),
        updateWallet: (id, updates) =>
          set((state) => ({
            wallets: state.wallets.map((w) =>
              w.id === id ? { ...w, ...updates } : w
            ),
          })),
        removeWallet: (id) =>
          set((state) => ({
            wallets: state.wallets.filter((w) => w.id !== id),
          })),

        // --- Users ---
        addUser: (user) => set((state) => ({ users: [...state.users, user] })),
        updateUser: (id, updates) =>
          set((state) => ({
            users: state.users.map((u) =>
              u.id === id ? { ...u, ...updates } : u
            ),
          })),
        removeUser: (id) =>
          set((state) => ({
            users: state.users.filter((u) => u.id !== id),
          })),

        // --- Categories ---
        addCategory: (category) =>
          set((state) => ({ categories: [...state.categories, category] })),
        updateCategory: (id, updates) =>
          set((state) => ({
            categories: state.categories.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          })),
        removeCategory: (id) =>
          set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
          })),

        // --- Transactions ---
        addTransaction: (transaction) =>
          set((state) => ({
            transactions: [...state.transactions, transaction],
          })),
        updateTransaction: (id, updates) =>
          set((state) => ({
            transactions: state.transactions.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          })),
        removeTransaction: (id) =>
          set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id),
          })),

        // --- Budgets ---
        addBudget: (budget) =>
          set((state) => ({ budgets: [...state.budgets, budget] })),
        updateBudget: (id, updates) =>
          set((state) => ({
            budgets: state.budgets.map((b) =>
              b.id === id ? { ...b, ...updates } : b
            ),
          })),
        removeBudget: (id) =>
          set((state) => ({
            budgets: state.budgets.filter((b) => b.id !== id),
          })),
      }),
      {
        name: 'viaflow-appdata', // nombre único para persistencia localStorage
        getStorage: () => localStorage, // usar localStorage
      }
    )
  )
);
