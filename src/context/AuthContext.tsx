"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initializeUserData = async (email: string) => {
    try {
      console.log("Initializing user data for:", email);
      
      const userRef = doc(db, "users", email);
      await setDoc(userRef, {
        email: email,
        createdAt: new Date().toISOString(),
      });
      
      console.log("User document created");
      
      const prioritiesRef = collection(db, `users/${email}/priorities`);
      const defaultPriorities = [
        { name: "High", color: "#ef4444", level: 1 }, // red
        { name: "Medium", color: "#eab308", level: 2 }, // yellow
        { name: "Low", color: "#22c55e", level: 3 }, // green
      ];

      const batch = writeBatch(db);
      defaultPriorities.forEach((priority) => {
        const newDocRef = doc(prioritiesRef);
        batch.set(newDocRef, priority);
      });
      await batch.commit();
      
      console.log("Default priorities created");
    } catch (error) {
      console.error("Error initializing user data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user.email) {
        await initializeUserData(userCredential.user.email);
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setUser(null);
      await signOut(auth);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
