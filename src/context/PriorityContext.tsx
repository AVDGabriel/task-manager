"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { Priority } from "@/types";

interface PriorityContextType {
  priorities: Priority[];
  selectedPriority: string | null;
  setSelectedPriority: (priorityId: string | null) => void;
}

const PriorityContext = createContext<PriorityContextType>({
  priorities: [],
  selectedPriority: null,
  setSelectedPriority: () => {},
});

export function PriorityProvider({ children }: { children: ReactNode }) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  useEffect(() => {
    console.log("PriorityContext: Setting up auth state listener");
    let unsubscribePriorities: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("PriorityContext: Auth state changed", { user });

      // Clean up previous listener if it exists
      if (unsubscribePriorities) {
        console.log("PriorityContext: Cleaning up previous priorities listener");
        unsubscribePriorities();
      }

      if (!user?.email) {
        console.log("PriorityContext: No user email found, clearing priorities");
        setPriorities([]);
        return;
      }

      console.log("PriorityContext: Setting up priorities listener for user", user.email);
      const q = query(collection(db, `users/${user.email}/priorities`));
      unsubscribePriorities = onSnapshot(q, (snapshot) => {
        const prioritiesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Priority[];
        console.log("PriorityContext: Received priorities update", prioritiesData);
        setPriorities(prioritiesData);
      }, (error) => {
        console.error("PriorityContext: Error listening to priorities:", error);
      });
    });

    return () => {
      console.log("PriorityContext: Cleaning up auth state listener");
      unsubscribeAuth();
      if (unsubscribePriorities) {
        console.log("PriorityContext: Cleaning up priorities listener");
        unsubscribePriorities();
      }
    };
  }, []);

  return (
    <PriorityContext.Provider
      value={{
        priorities,
        selectedPriority,
        setSelectedPriority,
      }}
    >
      {children}
    </PriorityContext.Provider>
  );
}

export const usePriority = () => useContext(PriorityContext); 