"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import TaskItem from "../task-item/TaskItem";

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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    const q = query(
      collection(db, "users", user.email, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

      setActiveTasks(allTasks.filter((t) => !t.completed));
      setCompletedTasks(allTasks.filter((t) => t.completed));
    });

    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
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
    </div>
  );
}
