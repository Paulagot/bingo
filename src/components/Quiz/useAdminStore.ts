// src/components/Quiz/useAdminStore.ts

import create from 'zustand';
import { persist } from 'zustand/middleware';

// Define Admin interface
export interface Admin {
  id: string;
  name: string;
  socketId?: string; // optional, matches your server-side model
}

// Zustand store interface
interface AdminStoreState {
  admins: Admin[];
  setAdmins: (admins: Admin[]) => void;
  addAdmin: (admin: Admin) => void;
  removeAdmin: (adminId: string) => void;
  resetAdmins: () => void;
}

// Create the store with persistence
export const useAdminStore = create<AdminStoreState>()(
  persist(
    (set) => ({
      admins: [],
      setAdmins: (admins: Admin[]) => set({ admins }),
      addAdmin: (admin: Admin) =>
        set((state) => ({ 
          admins: [...state.admins.filter(a => a.id !== admin.id), admin] 
        })),
      removeAdmin: (adminId: string) =>
        set((state) => ({
          admins: state.admins.filter((a) => a.id !== adminId),
        })),
      resetAdmins: () => {
        // Clear from localStorage too
        localStorage.removeItem('quiz-admins');
        set({ admins: [] });
      },
    }),
    {
      name: 'quiz-admins',
      version: 1,
    }
  )
);
