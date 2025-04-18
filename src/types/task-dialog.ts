import type { Category } from "./index";

export interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  categoryId?: string | null;
  priorityId?: string | null;
  dueDate?: string | null;
  categories: Category[];
  onSave: (data: TaskFormData) => void;
}

export interface TaskFormData {
  title: string;
  description: string;
  categoryId?: string | null;
  priorityId: string;
  dueDate?: string | null;
}

export interface FormErrors {
  title?: string;
  priority?: string;
} 