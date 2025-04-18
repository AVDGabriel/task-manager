import { useState, useEffect } from 'react';
import type { TaskFormData, FormErrors } from '@/types/task-dialog';
import { usePriority } from '@/context/PriorityContext';

interface UseTaskFormProps {
  initialTitle: string;
  initialDescription: string;
  initialCategoryId: string | null;
  initialPriorityId: string | null;
  initialDueDate: string | null;
  isOpen: boolean;
}

export function useTaskForm({
  initialTitle,
  initialDescription,
  initialCategoryId,
  initialPriorityId,
  initialDueDate,
  isOpen,
}: UseTaskFormProps) {
  const { priorities } = usePriority();
  const isEditMode = initialTitle !== "";
  const [formData, setFormData] = useState<TaskFormData>({
    title: initialTitle,
    description: initialDescription,
    categoryId: initialCategoryId || "none",
    priorityId: initialPriorityId || "",
    dueDate: initialDueDate || "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Initialize form data when component mounts or when initial values change
  useEffect(() => {
    setFormData({
      title: initialTitle,
      description: initialDescription,
      categoryId: initialCategoryId || "none",
      priorityId: initialPriorityId || "",
      dueDate: initialDueDate || "",
    });
  }, [initialTitle, initialDescription, initialCategoryId, initialPriorityId, initialDueDate]);

  // Set default priority when dialog opens or priorities load
  useEffect(() => {
    if (isOpen && priorities.length > 0 && !formData.priorityId) {
      if (initialPriorityId) {
        setFormData((prev) => ({ ...prev, priorityId: initialPriorityId }));
      } else {
        const lowPriority = priorities.find((p) => p.name.toLowerCase() === "low");
        if (lowPriority) {
          setFormData((prev) => ({ ...prev, priorityId: lowPriority.id }));
        }
      }
    }
  }, [isOpen, priorities, initialPriorityId, formData.priorityId]);

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

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: isEditMode ? initialTitle : "",
      description: isEditMode ? initialDescription : "",
      categoryId: initialCategoryId || "none",
      priorityId: isEditMode ? initialPriorityId || "" : "",
      dueDate: isEditMode ? initialDueDate || "" : "",
    });
    setErrors({});
  };

  return {
    formData,
    errors,
    isEditMode,
    validateForm,
    handleInputChange,
    resetForm,
  };
} 