"use client";

import Sidebar from "@/components/layout/SideBar";
import TaskInput from "@/components/task-input/TaskInput";
import TaskList from "@/components/task-list/TaskList";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/login");
      else setUser(user);
    });
    return unsubscribe;
  }, [router]);

  return (
    <div className="flex bg-zinc-900 min-h-screen text-white">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center px-8">
        <div className="w-full max-w-2xl py-6">
          <h1 className="text-2xl font-bold mb-4">All Tasks</h1>
          <TaskList />
        </div>
        <TaskInput />
      </main>
    </div>
  );
}
