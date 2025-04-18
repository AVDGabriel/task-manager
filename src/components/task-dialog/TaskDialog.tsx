"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Category, Priority } from "@/types";
import { usePriority } from "@/context/PriorityContext";

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  categoryId?: string | null;
  priorityId?: string | null;
  categories: Category[];
  onSave: (data: {
    title: string;
    description: string;
    categoryId?: string | null;
    priorityId: string;
  }) => void;
}

interface FormData {
  title: string;
  description: string;
  categoryId: string;
  priorityId: string;
}

interface FormErrors {
  title?: string;
  priority?: string;
}

export default function TaskDialog({
  isOpen,
  onClose,
  title: initialTitle,
  description: initialDescription,
  categoryId: initialCategoryId,
  priorityId: initialPriorityId,
  categories,
  onSave,
}: TaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { priorities } = usePriority();
  const isEditMode = initialTitle !== "";
  const [formData, setFormData] = useState<FormData>({
    title: initialTitle,
    description: initialDescription,
    categoryId: initialCategoryId || "none",
    priorityId: initialPriorityId || "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  console.log("TaskDialog rendered", {
    isOpen,
    initialTitle,
    initialDescription,
    initialCategoryId,
    initialPriorityId,
    categories,
    priorities,
    formData,
  });

  // Initialize form data when component mounts or when initial values change
  useEffect(() => {
    console.log("Initializing form data", {
      initialTitle,
      initialDescription,
      initialCategoryId,
      initialPriorityId,
      priorities,
    });
    setFormData({
      title: initialTitle,
      description: initialDescription,
      categoryId: initialCategoryId || "none",
      priorityId: initialPriorityId || "",
    });
  }, [initialTitle, initialDescription, initialCategoryId, initialPriorityId, priorities]);

  // Set default priority when dialog opens or priorities load
  useEffect(() => {
    console.log("Setting default priority", {
      isOpen,
      priorities,
      initialPriorityId,
      formData,
    });
    if (isOpen && priorities.length > 0 && !formData.priorityId) {
      if (initialPriorityId) {
        setFormData(prev => ({ ...prev, priorityId: initialPriorityId }));
      } else {
        const lowPriority = priorities.find(p => p.name.toLowerCase() === "low");
        console.log("Found low priority:", lowPriority);
        if (lowPriority) {
          setFormData(prev => ({ ...prev, priorityId: lowPriority.id }));
        }
      }
    }
  }, [isOpen, priorities, initialPriorityId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      setErrors({});
    } else {
      dialog.close();
      // Reset form data when dialog closes, but preserve values in edit mode
      setFormData({
        title: isEditMode ? initialTitle : "",
        description: isEditMode ? initialDescription : "",
        categoryId: initialCategoryId || "none",
        priorityId: isEditMode ? initialPriorityId || "" : "",
      });
      setErrors({});
    }
  }, [isOpen, initialCategoryId, initialTitle, initialDescription, initialPriorityId, isEditMode]);

  const handleClose = () => {
    // Reset form data when manually closing, but preserve values in edit mode
    setFormData({
      title: isEditMode ? initialTitle : "",
      description: isEditMode ? initialDescription : "",
      categoryId: initialCategoryId || "none",
      priorityId: isEditMode ? initialPriorityId || "" : "",
    });
    setErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.priorityId || formData.priorityId === "none") {
      newErrors.priority = "Priority is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSave({ 
      title: formData.title.trim(), 
      description: formData.description.trim(), 
      categoryId: formData.categoryId === "none" ? null : formData.categoryId,
      priorityId: formData.priorityId
    });
    handleClose();
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 bg-zinc-900 text-white p-0 rounded-lg shadow-xl backdrop:bg-black/60 open:animate-fade-in m-auto w-full max-w-[500px] border border-zinc-800"
      onClose={handleClose}
    >
      <div className="w-full">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-semibold">{isEditMode ? "Edit Task" : "Create Task"}</h2>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm text-zinc-400">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className={`w-full bg-zinc-800 border ${
                errors.title ? 'border-red-500' : 'border-zinc-700'
              } rounded px-3 py-2 focus:outline-none focus:border-blue-500`}
              autoFocus
            />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm text-zinc-400">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm text-zinc-400">
              Category
            </label>
            <select
              id="category"
              value={formData.categoryId}
              onChange={(e) => handleInputChange("categoryId", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="none">No Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="block text-sm text-zinc-400">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              id="priority"
              value={formData.priorityId}
              onChange={(e) => handleInputChange("priorityId", e.target.value)}
              className={`w-full bg-zinc-800 border ${
                errors.priority ? 'border-red-500' : 'border-zinc-700'
              } rounded px-3 py-2 focus:outline-none focus:border-blue-500`}
            >
              <option value="">Select Priority</option>
              {priorities
                .sort((a, b) => a.level - b.level)
                .map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
              ))}
            </select>
            {errors.priority && (
              <p className="text-red-500 text-sm">{errors.priority}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white rounded bg-blue-500 hover:bg-blue-600 transition-colors"
            >
              {isEditMode ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
