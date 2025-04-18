import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";

export default function TaskInput() {
  const [title, setTitle] = useState("");

  const handleAddTask = async () => {
    if (!title.trim()) return;

    const user = auth.currentUser;
    if (!user || !user.email) return;

    await addDoc(collection(db, "users", user.email!, "tasks"), {
      title: title.trim(),
      completed: false,
      createdAt: serverTimestamp(),
    });

    setTitle("");
  };

  return (
    <div className="w-full max-w-2xl px-8 pb-6">
      <div className="flex items-center space-x-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 bg-zinc-800 p-3 rounded text-white outline-none"
        />
        <button
          onClick={handleAddTask}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}
