"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, writeBatch, doc, where, QueryConstraint, FirestoreError } from "firebase/firestore";
import TaskItem from "../task-item/TaskItem";
import { useAuth } from "@/context/AuthContext";
import { useCategory } from "@/context/CategoryContext";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { Task } from "@/types";

interface CompletedTasksProps {
  tasks: Task[];
  showCategory: boolean;
}

function CompletedTasks({ tasks, showCategory }: CompletedTasksProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const { user } = useAuth();

  const deleteAllCompleted = async () => {
    if (!user?.email || tasks.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      tasks.forEach((task) => {
        const taskRef = doc(db, `users/${user.email}/tasks/${task.id}`);
        batch.delete(taskRef);
      });

      await batch.commit();
    } catch (error) {
      console.error("Failed to delete completed tasks:", error);
    }
  };

  if (tasks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-2"
        >
          {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Completed ({tasks.length})
        </button>
        <button
          onClick={deleteAllCompleted}
          className="flex items-center gap-2 text-zinc-400"
        >
          <Trash2 size={16} />
          Delete All Completed
        </button>
      </div>
      
      {showCompleted && (
        <div className="space-y-2 list-none">
          {tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              showCategory={showCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { selectedCategory } = useCategory();

  useEffect(() => {
    if (authLoading) return;

    if (!user?.email) {
      setIsLoading(false);
      setError("Please sign in to view tasks");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    
    if (selectedCategory) {
      constraints.push(where("categoryId", "==", selectedCategory));
    }

    const q = query(
      collection(db, "users", user.email, "tasks"),
      ...constraints
    );

    const unsub = onSnapshot(
      q, 
      (snapshot) => {
        const allTasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          categoryId: doc.data().categoryId
        })) as Task[];

        setTasks(allTasks);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error('Error fetching tasks:', error);
        setError(error.code === 'failed-precondition' 
          ? "The database index is being created. This might take a few minutes. Please try again soon."
          : "Error loading tasks"
        );
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [user, authLoading, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-zinc-400">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <p className="text-center text-zinc-400">No tasks yet</p>
      ) : (
        <>
          <div className="space-y-2 list-none">
            {activeTasks.map((task) => (
              <TaskItem 
                key={task.id} 
                task={task} 
                showCategory={selectedCategory === null}
              />
            ))}
          </div>

          <CompletedTasks 
            tasks={completedTasks}
            showCategory={selectedCategory === null}
          />
        </>
      )}
    </div>
  );
}
