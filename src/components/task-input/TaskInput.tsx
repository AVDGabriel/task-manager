"use client";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useCategory } from "@/context/CategoryContext";
import { usePriority } from "@/context/PriorityContext";
import { useToast } from "@/hooks/useToast";

export default function TaskInput() {
  const [title, setTitle] = useState("");
  const { selectedCategory } = useCategory();
  const { priorities } = usePriority();
  const { handleError, showSuccess } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const user = auth.currentUser;
    if (!user?.email) return;

    // Find the default low priority
    const lowPriority = priorities.find(p => p.name.toLowerCase() === "low");
    const defaultPriorityId = lowPriority?.id || null;

    try {
      await addDoc(collection(db, "users", user.email, "tasks"), {
        title: title.trim(),
        completed: false,
        createdAt: serverTimestamp(),
        categoryId: selectedCategory || null,
        priorityId: defaultPriorityId,
      });

      setTitle("");
      showSuccess('Task created successfully');
    } catch (error) {
      handleError(error, 'Error creating task');
    }
  };

  return (
    <div className="w-full px-8 pb-6">
      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <input
          id="new-task"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Add a task${selectedCategory ? ' to this category' : ''}...`}
          className="flex-1 bg-zinc-800 p-3 rounded text-white outline-none"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className={`px-6 py-2 rounded text-white ${
            title.trim() 
              ? 'bg-blue-600 hover:bg-blue-500' 
              : 'bg-zinc-700 cursor-not-allowed'
          }`}
        >
          Add
        </button>
      </form>
    </div>
  );
}
