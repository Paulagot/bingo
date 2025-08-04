// src/components/Quiz/useAdminStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Admin {
  id: string;
  name: string;
  socketId?: string;
}

interface AdminStoreState {
  admins: Admin[];
  setFullAdmins: (admins: Admin[]) => void;
  resetAdmins: () => void;
}

export const useAdminStore = create<AdminStoreState>()(
  persist(
    (set) => ({
      admins: [],
      setFullAdmins: (admins) => set({ admins }),
      resetAdmins: () => set({ admins: [] }),
    }),
    {
      name: 'quiz-admins',
      version: 1,
    }
  )
);


