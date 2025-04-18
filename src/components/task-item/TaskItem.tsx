"use client";

import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function TaskItem({ task }: { task: any }) {
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(task.title);

  const user = auth.currentUser;
  const ref = doc(db, "users", user!.uid, "tasks", task.id);

  const toggleCompleted = () => {
    updateDoc(ref, { completed: !task.completed });
  };

  const handleUpdate = async () => {
    if (newTitle.trim() === "") return;
    await updateDoc(ref, { title: newTitle.trim() });
    setEditing(false);
  };

  const handleDelete = () => {
    deleteDoc(ref);
  };

  return (
    <li className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded group">
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={toggleCompleted}
          className="accent-blue-500"
        />
        {editing ? (
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            autoFocus
            className="bg-transparent outline-none text-white border-b border-zinc-600"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`text-sm ${
              task.completed ? "line-through text-zinc-400" : ""
            }`}
          >
            {task.title}
          </span>
        )}
      </div>
      <button
        onClick={handleDelete}
        className="text-zinc-400 hover:text-red-400 hidden group-hover:block"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
