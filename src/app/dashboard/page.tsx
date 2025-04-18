"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, serverTimestamp, getDocs, writeBatch, doc, runTransaction } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useCategory } from "@/context/CategoryContext";
import Sidebar from "@/components/layout/SideBar";
import TaskList from "@/components/task-list/TaskList";
import TaskInput from "@/components/task-input/TaskInput";
import TaskDialog from "@/components/task-dialog/TaskDialog";
import { Plus } from "lucide-react";
import type { Category } from "@/types";
import { useToast } from "@/hooks/useToast";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedCategory } = useCategory();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const { handleError, showSuccess } = useToast();

  // Handle authentication state
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Only set up Firestore listeners if we have an authenticated user
  useEffect(() => {
    if (authLoading || !user?.email) return;

    const q = collection(db, `users/${user.email}/categories`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(categoriesData);
    }, (error) => {
      console.error("Categories listener error:", error);
      if (error.code === "permission-denied") {
        // If we get a permission error, the user might be logged out
        setCategories([]);
      }
    });

    return () => {
      // Clean up listener and state when component unmounts or user changes
      unsubscribe();
      setCategories([]);
    };
  }, [user?.email, authLoading]);

  // Handle category name updates
  useEffect(() => {
    if (authLoading || !user?.email || !selectedCategory) {
      setCategoryName(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, `users/${user.email}/categories/${selectedCategory}`),
      (doc) => {
        if (doc.exists()) {
          const category = doc.data() as Category;
          setCategoryName(category.name);
        }
      },
      (error) => {
        console.error("Category listener error:", error);
        if (error.code === "permission-denied") {
          setCategoryName(null);
        }
      }
    );

    return () => {
      unsubscribe();
      setCategoryName(null);
    };
  }, [user?.email, selectedCategory, authLoading]);

  // Only render content if we have an authenticated user
  if (authLoading) {
    return <div className="flex bg-zinc-900 min-h-screen text-white items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const handleCreateTask = async (data: { title: string; description: string; categoryId?: string | null; priorityId?: string | null; dueDate?: string | null }) => {
    if (!user?.email) return;

    try {
      await addDoc(collection(db, "users", user.email, "tasks"), {
        title: data.title,
        description: data.description || null,
        completed: false,
        createdAt: serverTimestamp(),
        categoryId: data.categoryId === "none" ? null : data.categoryId,
        priorityId: data.priorityId === "none" ? null : data.priorityId,
        dueDate: data.dueDate || null,
        comments: [],
      });
      setIsCreateDialogOpen(false);
      showSuccess('Task created successfully');
    } catch (error) {
      handleError(error, 'Error creating task');
    }
  };

  return (
    <div className="flex bg-zinc-900 min-h-screen text-white">
      <Sidebar />
      <main className="flex-1 flex flex-col lg:ml-64">
        <div className="w-full px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">
                {categoryName ? `${categoryName} Tasks` : 'All Tasks'}
              </h1>
              {/* Mobile add task button */}
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="lg:hidden p-2 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                aria-label="Add task"
              >
                <Plus size={20} />
              </button>
            </div>
            {/* Desktop add task button */}
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded transition-colors"
            >
              <Plus size={20} />
              Add Task
            </button>
          </div>
          <TaskList />
        </div>
      </main>

      <TaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title=""
        description=""
        categoryId={selectedCategory}
        priorityId={null}
        categories={categories}
        onSave={handleCreateTask}
      />
    </div>
  );
}
