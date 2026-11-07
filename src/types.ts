export interface TaskStep {
  id: string
  taskId: string
  title: string
  completed: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Task {
  id: string
  userId: string
  title: string
  completed: boolean
  important: boolean
  inMyDay: boolean
  dueDate: string | null
  notes: string | null
  listName: string
  steps: TaskStep[]
  createdAt: string
  updatedAt: string
}

export type SmartListId = 'my-day' | 'important' | 'planned' | 'tasks' | string

export type SortMode = 'default' | 'importance' | 'dueDate' | 'alphabetical' | 'creationDate'
