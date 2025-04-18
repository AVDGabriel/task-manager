"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { TaskDialogProps } from "@/types/task-dialog";
import { useTaskForm } from "@/hooks/useTaskForm";
import { usePriority } from "@/context/PriorityContext";

export default function TaskDialog({
  isOpen,
  onClose,
  title: initialTitle,
  description: initialDescription,
  categoryId: initialCategoryId,
  priorityId: initialPriorityId,
  dueDate: initialDueDate,
  categories,
  onSave,
}: TaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { priorities } = usePriority();
  const {
    formData,
    errors,
    isEditMode,
    validateForm,
    handleInputChange,
    resetForm,
  } = useTaskForm({
    initialTitle,
    initialDescription,
    initialCategoryId: initialCategoryId || null,
    initialPriorityId: initialPriorityId || null,
    initialDueDate: initialDueDate || null,
    isOpen,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSave({
      title: formData.title.trim(),
      description: formData.description.trim(),
      categoryId: formData.categoryId === "none" ? null : formData.categoryId,
      priorityId: formData.priorityId,
      dueDate: formData.dueDate || null,
    });
    handleClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 bg-zinc-900 text-white p-0 rounded-lg shadow-xl backdrop:bg-black/60 open:animate-fade-in m-auto w-full max-w-[500px] border border-zinc-800"
      onClose={handleClose}
    >
      <div className="w-full">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "Edit Task" : "Create Task"}
          </h2>
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
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className={`w-full bg-zinc-800 border ${
                errors.title ? "border-red-500" : "border-zinc-700"
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
              value={formData.categoryId || "none"}
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
              value={formData.priorityId || ""}
              onChange={(e) => handleInputChange("priorityId", e.target.value)}
              className={`w-full bg-zinc-800 border ${
                errors.priority ? "border-red-500" : "border-zinc-700"
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

          <div className="space-y-2">
            <label htmlFor="dueDate" className="block text-sm text-zinc-400">
              Due Date
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                id="dueDate"
                value={formData.dueDate || ""}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              {formData.dueDate && (
                <button
                  type="button"
                  onClick={() => handleInputChange("dueDate", "")}
                  className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
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
