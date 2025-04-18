"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import TaskItem from "../task-item/TaskItem";
import { useAuth } from "@/context/AuthContext";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  category?: string;
  createdAt: any;
};

export default function TaskList() {
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !user.email) {
      setIsLoading(false);
      setError("Please sign in to view tasks");
      return;
    }

    console.log("Setting up tasks listener for user:", user.email);
    setIsLoading(true);
    
    try {
      const q = query(
        collection(db, "users", user.email, "tasks"),
        orderBy("createdAt", "desc")
      );

      const unsub = onSnapshot(q, 
        (snapshot) => {
          console.log("Received tasks update");
          const allTasks = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Task[];

          setActiveTasks(allTasks.filter((t) => !t.completed));
          setCompletedTasks(allTasks.filter((t) => t.completed));
          setError(null);
          setIsLoading(false);
        },
        (error) => {
          console.error("Detailed error fetching tasks:", error);
          setError(`Error loading tasks: ${error.message}`);
          setIsLoading(false);
        }
      );

      return () => {
        console.log("Cleaning up tasks listener");
        unsub();
      };
    } catch (err) {
      console.error("Error setting up tasks listener:", err);
      setError(`Failed to setup tasks listener: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse flex flex-col gap-4 w-full">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 bg-zinc-800/50 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-8">No tasks yet. Add your first task above!</p>
      ) : (
        <>
          <ul className="space-y-2">
            {activeTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>

          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-sm text-zinc-400 mb-2">Completed Tasks</h2>
              <ul className="space-y-2">
                {completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
