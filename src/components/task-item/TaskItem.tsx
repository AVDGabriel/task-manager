"use client";

import { doc, updateDoc, deleteDoc, collection, onSnapshot, query } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { Pencil, Trash2, Tag, Flag } from "lucide-react";
import TaskDialog from "../task-dialog/TaskDialog";
import type { Task, Category, Priority } from "@/types";
import { usePriority } from "@/context/PriorityContext";

interface TaskItemProps {
  task: Task;
  showCategory?: boolean;
}

export default function TaskItem({ task, showCategory = false }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { priorities } = usePriority();
  const user = auth.currentUser;
  
  useEffect(() => {
    if (!user?.email) return;

    const q = query(collection(db, `users/${user.email}/categories`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(categoriesData);
    });

    return () => unsubscribe();
  }, [user?.email]);
  
  if (!user?.email) return null;

  const ref = doc(db, "users", user.email, "tasks", task.id);

  const toggleCompleted = () => {
    updateDoc(ref, { completed: !task.completed });
  };

  const handleEdit = async (data: { title: string; description: string; categoryId?: string | null; priorityId: string }) => {
    const updateData: Record<string, any> = {
      title: data.title,
      description: data.description || null,
      categoryId: data.categoryId === "none" ? null : data.categoryId,
      priorityId: data.priorityId
    };

    try {
      await updateDoc(ref, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDelete = () => {
    deleteDoc(ref);
  };

  const category = categories.find(c => c.id === task.categoryId);
  const priority = priorities.find(p => p.id === task.priorityId);

  return (
    <>
      <div className="w-full bg-zinc-800 p-3 rounded">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={toggleCompleted}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {category && (
                <span
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${!showCategory && 'hidden'}`}
                  style={{ backgroundColor: category.color }}
                />
              )}
              <p className={`truncate ${task.completed ? "line-through text-zinc-400" : ""}`}>
                {task.title}
              </p>
              {showCategory && category && (
                <span className="flex-shrink-0 text-sm text-zinc-400 flex items-center gap-1">
                  <Tag size={12} />
                  {category.name}
                </span>
              )}
              {priority && (
                <span 
                  className="flex-shrink-0 text-sm flex items-center gap-1 px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${priority.color}20`,
                    color: priority.color 
                  }}
                >
                  <Flag size={12} />
                  {priority.name}
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-zinc-400 truncate">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => setIsEditing(true)}
              className="text-zinc-400 p-1 hover:text-zinc-300"
              disabled={task.completed}
              style={{ opacity: task.completed ? 0.5 : 1 }}
            >
              <Pencil size={16} />
            </button>
            <button 
              onClick={handleDelete}
              className="text-zinc-400 p-1 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <TaskDialog
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={task.title}
        description={task.description || ""}
        categoryId={task.categoryId}
        priorityId={task.priorityId}
        categories={categories}
        onSave={handleEdit}
      />
    </>
  );
}
