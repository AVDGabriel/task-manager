export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Priority {
  id: string;
  name: string;
  color: string;
  level: number;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: any;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
  createdAt: any;
  categoryId: string | null;
  priorityId: string | null;
  dueDate?: string | null;
  comments?: Comment[];
} 