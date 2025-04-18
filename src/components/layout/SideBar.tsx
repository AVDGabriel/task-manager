"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, addDoc, doc, writeBatch, where, getDocs } from "firebase/firestore";
import { Plus, X, Menu } from "lucide-react";
import type { Category } from "@/types";
import { useCategory } from "@/context/CategoryContext";
import ConfirmDialog from "../confirm-dialog/ConfirmDialog";

export default function Sidebar() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const { selectedCategory, setSelectedCategory } = useCategory();
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

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
  }, [user]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !newCategoryName.trim()) return;

    try {
      await addDoc(collection(db, `users/${user.email}/categories`), {
        name: newCategoryName.trim(),
        color: generateRandomColor(),
      });
      setNewCategoryName("");
      setShowAddCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user?.email) return;
    
    try {
      setIsDeleting(true);
      
      // First, get all tasks with this category
      const tasksQuery = query(
        collection(db, `users/${user.email}/tasks`),
        where("categoryId", "==", categoryId)
      );

      
      const tasksSnapshot = await getDocs(tasksQuery);
      
      // Create a batch operation
      const batch = writeBatch(db);
      
      // Add all task deletions to the batch
      tasksSnapshot.docs.forEach((taskDoc) => {
        const taskRef = doc(db, `users/${user.email}/tasks/${taskDoc.id}`);
        batch.delete(taskRef);
      });
      
      // Add category deletion to the batch
      const categoryRef = doc(db, `users/${user.email}/categories/${categoryId}`);
      batch.delete(categoryRef);
      
      // Commit the batch
      await batch.commit();
      
      // If the deleted category was selected, clear the selection
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error("Error deleting category and its tasks:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const generateRandomColor = () => {
    const colors = [
      "#EF4444", // red
      "#F59E0B", // amber
      "#10B981", // emerald
      "#3B82F6", // blue
      "#8B5CF6", // violet
      "#EC4899", // pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed 
        inset-y-0 left-0
        w-64 h-screen
        bg-zinc-950 border-r border-zinc-800
        flex flex-col justify-between
        text-white
        z-50
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-zinc-800">
              <p className="text-sm text-zinc-400">Welcome</p>
              <h1 className="text-lg font-bold break-words">{user?.email}</h1>
            </div>
            <nav className="p-4 space-y-2 overflow-y-auto flex-1">
              <button 
                onClick={() => {
                  setSelectedCategory(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  selectedCategory === null ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:text-white'
                }`}
              >
                All Tasks
              </button>
              
              <div className="space-y-1">
                {categories.map((category) => (
                  <div key={category.id} className="group flex items-center">
                    <button
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                        selectedCategory === category.id ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </button>
                    <button
                      onClick={() => setCategoryToDelete(category)}
                      className="p-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isDeleting}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {showAddCategory ? (
                <form onSubmit={handleAddCategory} className="mt-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    className="w-full px-3 py-2 bg-zinc-800 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </form>
              ) : (
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Plus size={16} />
                  Add Category
                </button>
              )}
            </nav>
          </div>
          <div className="p-4">
            <button
              onClick={() => signOut(auth)}
              className="w-full p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              Logout
            </button>
          </div>

          <ConfirmDialog
            isOpen={categoryToDelete !== null}
            onClose={() => setCategoryToDelete(null)}
            onConfirm={() => {
              if (categoryToDelete) {
                handleDeleteCategory(categoryToDelete.id);
              }
            }}
            title="Delete Category"
            message={`Are you sure you want to delete the category "${categoryToDelete?.name}"?\nThis will delete all tasks in this category.`}
            confirmText={isDeleting ? "Deleting..." : "Delete"}
          />
        </div>
      </aside>
    </>
  );
}
