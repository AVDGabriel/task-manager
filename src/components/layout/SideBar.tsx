"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { signOut } from "firebase/auth";

export default function Sidebar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  return (
    <aside className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between text-white">
      <div>
        <div className="p-4 border-b border-zinc-800">
          <p className="text-sm text-zinc-400">Welcome</p>
          <h1 className="text-lg font-bold break-words">{user?.email}</h1>
        </div>
        <nav className="p-4">
          <button className="w-full text-left text-zinc-300 hover:text-white">
            All
          </button>
        </nav>
      </div>
      <div className="p-4">
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
