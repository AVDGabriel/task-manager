import React, { useState, useEffect, useMemo } from 'react'
import {
  Sun,
  Star,
  Calendar,
  CheckSquare,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  X,
  Search,
  ArrowUpDown,
  Menu,
  Folder,
} from 'lucide-react'
import { getMFEBus } from '@avdgabriel/mfe-bus'
import { Task, TaskStep, SmartListId, SortMode } from './types'
import './index.css'

// Resolve MFE bus instance (supports both shared @avdgabriel/mfe-bus and legacy window.__MFE_BUS__)
function resolveBus(): any {
  try {
    const bus = getMFEBus()
    if (bus) return bus
  } catch {
    // Fallback
  }
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.__MFE_BUS__) {
      // @ts-ignore
      return window.__MFE_BUS__
    }
  } catch {
    // Standalone fallback
  }
  return null
}

interface TaskManagerProps {
  apiBaseUrl?: string
  initialUserId?: string
  initialTasks?: Task[]
  /**
   * Provided by the host: returns a fresh Firebase ID token for the signed-in user.
   * The host API derives the owner from this token only; without it (e.g. standalone)
   * every API call is rejected and the demo/offline mode is used.
   */
  getAuthToken?: () => Promise<string | null>
}

const DEFAULT_DEMO_TASKS: Task[] = [
  {
    id: 'demo-task-1',
    userId: 'demo-user',
    title: 'Review Rsbuild Module Federation configuration',
    completed: false,
    important: true,
    inMyDay: true,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    notes: 'Ensure port 3002 is exposed with CORS headers and mf-manifest.json',
    listName: 'Tasks',
    steps: [
      { id: 'step-1-1', taskId: 'demo-task-1', title: 'Check singleton react sharing', completed: true },
      { id: 'step-1-2', taskId: 'demo-task-1', title: 'Verify dist output assetPrefix', completed: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-task-2',
    userId: 'demo-user',
    title: 'Design Microsoft To-Do Fluent aesthetic UI',
    completed: true,
    important: true,
    inMyDay: true,
    dueDate: new Date().toISOString(),
    notes: 'Circular checkboxes, smart lists (My Day, Important, Planned), subtasks drawer.',
    listName: 'Tasks',
    steps: [
      { id: 'step-2-1', taskId: 'demo-task-2', title: 'Implement sidebar smart lists', completed: true },
      { id: 'step-2-2', taskId: 'demo-task-2', title: 'Add quick-add input bar', completed: true },
      { id: 'step-2-3', taskId: 'demo-task-2', title: 'Create subtasks detail drawer', completed: true },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-task-3',
    userId: 'demo-user',
    title: 'Connect shared PostgreSQL task database',
    completed: false,
    important: false,
    inMyDay: false,
    dueDate: new Date(Date.now() + 172800000).toISOString(),
    notes: 'Store user tasks under auth:user from mfe-bus in postgres tasks table.',
    listName: 'Work',
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const DEFAULT_CUSTOM_LISTS = ['Work', 'Personal']

export const TaskManager: React.FC<TaskManagerProps> = ({
  apiBaseUrl = '',
  initialUserId,
  initialTasks,
  getAuthToken,
}) => {
  const mfeBus = useMemo(() => resolveBus(), [])

  // Every API call carries the host-issued ID token; the server ignores client-sent user ids.
  const apiFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const token = getAuthToken ? await getAuthToken().catch(() => null) : null
    const headers = new Headers(init.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(url, { ...init, headers })
  }

  // Theme state synced with personal website (mfe-bus + document.documentElement)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const busTheme = mfeBus?.getState?.('theme')
      if (busTheme === 'light' || busTheme === 'dark') return busTheme
      if (typeof document !== 'undefined') {
        if (document.documentElement.classList.contains('light')) return 'light'
        if (document.documentElement.classList.contains('dark')) return 'dark'
      }
      if (typeof window !== 'undefined') {
        const storedTheme = window.localStorage.getItem('theme')
        if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
      }
    } catch {}
    return 'dark'
  })

  // Current authenticated user (from host mfe-bus or prop)
  const [userId, setUserId] = useState<string>(() => {
    if (initialUserId) return initialUserId
    try {
      const stateUser = mfeBus?.getState?.('auth:user')
      if (stateUser?.id || stateUser?.email) {
        return stateUser.id || stateUser.email
      }
    } catch {}
    return ''
  })
  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      const stateUser = mfeBus?.getState?.('auth:user')
      if (stateUser?.name || stateUser?.email) {
        return stateUser.name || stateUser.email
      }
    } catch {}
    return ''
  })
  const [tasks, setTasks] = useState<Task[]>(initialTasks || [])
  const [customLists, setCustomLists] = useState<string[]>(DEFAULT_CUSTOM_LISTS)
  const [activeList, setActiveList] = useState<SmartListId>('my-day')
  const [newListName, setNewListName] = useState('')
  const [isAddingList, setIsAddingList] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [completedOpen, setCompletedOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [loading, setLoading] = useState(false)
  const [isOnlineBackend, setIsOnlineBackend] = useState(false)

  // Quick-Add bar state
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDueDate, setQuickDueDate] = useState<string>('')
  const [quickImportant, setQuickImportant] = useState(false)
  const [quickInMyDay, setQuickInMyDay] = useState(false)
  const [quickAddFocused, setQuickAddFocused] = useState(false)

  // Step input in drawer
  const [newStepTitle, setNewStepTitle] = useState('')

  // Selected task ref
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId],
  )

  // Subscribe to mfe-bus theme & auth + HTML class observer
  useEffect(() => {
    const unsubscribers: Array<() => void> = []

    const applyUser = (user: any) => {
      if (user?.id || user?.email) {
        setUserId(user.id || user.email)
        setUserEmail(user.name || user.email || 'User')
      } else if (user === null) {
        setUserId(initialUserId || '')
        setUserEmail('')
      }
    }

    try {
      if (mfeBus) {
        if (typeof mfeBus.subscribeState === 'function') {
          unsubscribers.push(
            mfeBus.subscribeState('auth:user', (u: any) => applyUser(u)),
          )
          unsubscribers.push(
            mfeBus.subscribeState('theme', (t: any) => {
              if (t === 'light' || t === 'dark') setTheme(t)
            }),
          )
        } else if (typeof mfeBus.getState === 'function') {
          const stateUser = mfeBus.getState('auth:user')
          if (stateUser) applyUser(stateUser)
          const stateTheme = mfeBus.getState('theme')
          if (stateTheme === 'light' || stateTheme === 'dark') setTheme(stateTheme)
        }

        if (typeof mfeBus.on === 'function') {
          unsubscribers.push(
            mfeBus.on('auth:user', (u: any) => applyUser(u)),
          )
          unsubscribers.push(
            mfeBus.on('auth:changed', (payload: any) => {
              applyUser(payload?.user ?? null)
            }),
          )
          unsubscribers.push(
            mfeBus.on('theme:changed', (payload: any) => {
              if (payload?.theme === 'light' || payload?.theme === 'dark') {
                setTheme(payload.theme)
              }
            }),
          )
        }
      }
    } catch {
      // Fallback
    }

    // Also observe document.documentElement class changes (next-themes toggles .dark / .light on <html>)
    let observer: MutationObserver | null = null
    if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
      const checkHtmlTheme = () => {
        const htmlEl = document.documentElement
        if (htmlEl.classList.contains('dark')) {
          setTheme('dark')
        } else if (htmlEl.classList.contains('light')) {
          setTheme('light')
        }
      }
      observer = new MutationObserver(checkHtmlTheme)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub()
        } catch {}
      })
      if (observer) observer.disconnect()
    }
  }, [mfeBus, initialUserId])

  // Load custom lists helper
  const loadStoredLists = (activeUserId: string): string[] | null => {
    try {
      const storedLists = localStorage.getItem(`task_lists_${activeUserId}`)
      if (storedLists) {
        const parsed = JSON.parse(storedLists)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return null
  }

  const saveListsLocally = (nextLists: string[]) => {
    const activeUserId = userId || 'demo-user'
    setCustomLists(nextLists)
    try {
      localStorage.setItem(`task_lists_${activeUserId}`, JSON.stringify(nextLists))
    } catch {}
  }

  // Load tasks when userId or apiBaseUrl changes
  useEffect(() => {
    if (!userId) return

    const storedCustomLists = loadStoredLists(userId)
    if (storedCustomLists) {
      setCustomLists(storedCustomLists)
    }

    if (initialTasks && initialTasks.length > 0) return

    async function fetchTasks() {
      setLoading(true)
      try {
        const endpoint = `${apiBaseUrl}/api/tasks?userId=${encodeURIComponent(userId)}`
        const res = await apiFetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.tasks)) {
            setTasks(data.tasks)
            setIsOnlineBackend(true)

            // Extract custom lists from tasks and merge with stored lists
            const taskLists = new Set<string>()
            data.tasks.forEach((t: Task) => {
              if (t.listName && t.listName !== 'Tasks') taskLists.add(t.listName)
            })
            const baseLists = loadStoredLists(userId) ?? DEFAULT_CUSTOM_LISTS
            const mergedLists = Array.from(new Set([...baseLists, ...Array.from(taskLists)]))
            setCustomLists(mergedLists)
            setLoading(false)
            return
          }
        }
      } catch {
        // Fallback to local storage
      }

      // Offline / standalone storage
      try {
        const stored = localStorage.getItem(`tasks_${userId}`)
        if (stored) {
          setTasks(JSON.parse(stored))
        } else {
          setTasks([])
        }
      } catch {
        setTasks([])
      }
      setIsOnlineBackend(false)
      setLoading(false)
    }

    fetchTasks()
  }, [userId, apiBaseUrl, initialTasks])

  // Sync to localStorage when offline
  const saveTasksLocally = (newTasks: Task[]) => {
    const activeUserId = userId || 'demo-user'
    setTasks(newTasks)
    try {
      localStorage.setItem(`tasks_${activeUserId}`, JSON.stringify(newTasks))
    } catch {}
  }

  // Delete Custom List
  const handleDeleteList = async (listNameToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    const nextLists = customLists.filter((name) => name !== listNameToDelete)
    saveListsLocally(nextLists)

    // Remove tasks belonging to the deleted list
    const tasksToDelete = tasks.filter((t) => t.listName === listNameToDelete)
    const remainingTasks = tasks.filter((t) => t.listName !== listNameToDelete)
    saveTasksLocally(remainingTasks)

    if (selectedTask && selectedTask.listName === listNameToDelete) {
      setSelectedTaskId(null)
    }

    if (activeList === listNameToDelete) {
      setActiveList('my-day')
    }

    const activeUserId = userId || 'demo-user'
    try {
      await apiFetch(
        `${apiBaseUrl}/api/tasks?userId=${encodeURIComponent(activeUserId)}&listName=${encodeURIComponent(listNameToDelete)}`,
        { method: 'DELETE' },
      )
    } catch {
      // Fallback: delete individual tasks if needed
      for (const t of tasksToDelete) {
        apiFetch(`${apiBaseUrl}/api/tasks?id=${encodeURIComponent(t.id)}`, {
          method: 'DELETE',
        }).catch(() => {})
      }
    }
  }

  // Create Task
  const handleCreateTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!quickTitle.trim()) return

    const activeUserId = userId || 'demo-user'
    const listForNewTask =
      activeList === 'my-day' || activeList === 'important' || activeList === 'planned'
        ? 'Tasks'
        : activeList

    const shouldBeInMyDay = activeList === 'my-day' || quickInMyDay
    const shouldBeImportant = activeList === 'important' || quickImportant
    const finalDueDate =
      activeList === 'planned' && !quickDueDate
        ? new Date(Date.now() + 86400000).toISOString()
        : quickDueDate || null

    const optimisticId = `task-${Date.now()}`
    const newTask: Task = {
      id: optimisticId,
      userId: activeUserId,
      title: quickTitle.trim(),
      completed: false,
      important: shouldBeImportant,
      inMyDay: shouldBeInMyDay,
      dueDate: finalDueDate,
      notes: '',
      listName: listForNewTask,
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [newTask, ...tasks]
    saveTasksLocally(updated)
    setQuickTitle('')
    setQuickDueDate('')
    setQuickImportant(false)
    setQuickInMyDay(false)

    // Call API if available
    try {
      const res = await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          title: newTask.title,
          listName: newTask.listName,
          important: newTask.important,
          inMyDay: newTask.inMyDay,
          dueDate: newTask.dueDate,
          notes: newTask.notes,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.task) {
          setTasks((curr) => curr.map((t) => (t.id === optimisticId ? data.task : t)))
        }
      }
    } catch {
      // Keep optimistic
    }
  }

  // Toggle Task Completion
  const handleToggleComplete = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const nextCompleted = !task.completed
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, completed: nextCompleted, updatedAt: new Date().toISOString() }
        : t,
    )
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, completed: nextCompleted }),
      })
    } catch {}
  }

  // Toggle Important
  const handleToggleImportant = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const nextImportant = !task.important
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, important: nextImportant, updatedAt: new Date().toISOString() }
        : t,
    )
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, important: nextImportant }),
      })
    } catch {}
  }

  // Toggle In My Day
  const handleToggleMyDay = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const nextInMyDay = !task.inMyDay
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, inMyDay: nextInMyDay, updatedAt: new Date().toISOString() }
        : t,
    )
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, inMyDay: nextInMyDay }),
      })
    } catch {}
  }

  // Update Task Title
  const handleUpdateTitle = async (taskId: string, title: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, title } : t))
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, title }),
      })
    } catch {}
  }

  // Update Notes
  const handleUpdateNotes = async (taskId: string, notes: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, notes } : t))
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, notes }),
      })
    } catch {}
  }

  // Update Due Date
  const handleUpdateDueDate = async (taskId: string, dueDate: string | null) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, dueDate } : t))
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, dueDate }),
      })
    } catch {}
  }

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId)
    saveTasksLocally(updated)
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null)
    }

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      })
    } catch {}
  }

  // Add Step
  const handleAddStep = async (taskId: string, stepTitle: string) => {
    if (!stepTitle.trim()) return

    const newStep: TaskStep = {
      id: `step-${Date.now()}`,
      taskId,
      title: stepTitle.trim(),
      completed: false,
    }

    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, steps: [...(t.steps || []), newStep] } : t,
    )
    saveTasksLocally(updated)
    setNewStepTitle('')

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, addStep: stepTitle.trim() }),
      })
    } catch {}
  }

  // Toggle Step Completion
  const handleToggleStep = async (taskId: string, stepId: string) => {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t
      const nextSteps = (t.steps || []).map((s) =>
        s.id === stepId ? { ...s, completed: !s.completed } : s,
      )
      return { ...t, steps: nextSteps }
    })
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, toggleStepId: stepId }),
      })
    } catch {}
  }

  // Delete Step
  const handleDeleteStep = async (taskId: string, stepId: string) => {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t
      return { ...t, steps: (t.steps || []).filter((s) => s.id !== stepId) }
    })
    saveTasksLocally(updated)

    try {
      await apiFetch(`${apiBaseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, deleteStepId: stepId }),
      })
    } catch {}
  }

  // Filter & Sort tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search query filter
      if (
        searchQuery &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(t.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Smart list filters
      if (activeList === 'my-day') return t.inMyDay
      if (activeList === 'important') return t.important
      if (activeList === 'planned') return Boolean(t.dueDate)
      if (activeList === 'tasks') return true

      // Custom list filter
      return t.listName === activeList
    })
  }, [tasks, activeList, searchQuery])

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks]
    if (sortMode === 'importance') {
      return list.sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0))
    }
    if (sortMode === 'dueDate') {
      return list.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    }
    if (sortMode === 'alphabetical') {
      return list.sort((a, b) => a.title.localeCompare(b.title))
    }
    if (sortMode === 'creationDate') {
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
    return list
  }, [filteredTasks, sortMode])

  const uncompletedTasks = useMemo(
    () => sortedTasks.filter((t) => !t.completed),
    [sortedTasks],
  )
  const completedTasks = useMemo(
    () => sortedTasks.filter((t) => t.completed),
    [sortedTasks],
  )

  // Smart List item counts
  const counts = useMemo(() => {
    return {
      myDay: tasks.filter((t) => t.inMyDay && !t.completed).length,
      important: tasks.filter((t) => t.important && !t.completed).length,
      planned: tasks.filter((t) => Boolean(t.dueDate) && !t.completed).length,
      tasks: tasks.filter((t) => !t.completed).length,
    }
  }, [tasks])

  const isCustomActiveList =
    activeList !== 'my-day' &&
    activeList !== 'important' &&
    activeList !== 'planned' &&
    activeList !== 'tasks'

  // Active list title & theme icon
  const listMeta = useMemo(() => {
    switch (activeList) {
      case 'my-day':
        return {
          title: 'My Day',
          icon: <Sun className="w-6 h-6 text-amber-500 dark:text-amber-400 shrink-0" />,
          subtitle: new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }).format(new Date()),
        }
      case 'important':
        return {
          title: 'Important',
          icon: <Star className="w-6 h-6 text-teal-600 dark:text-teal-400 fill-teal-600 dark:fill-teal-400 shrink-0" />,
          subtitle: 'Prioritized items',
        }
      case 'planned':
        return {
          title: 'Planned',
          icon: <Calendar className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0" />,
          subtitle: 'Tasks with due dates',
        }
      case 'tasks':
        return {
          title: 'Tasks',
          icon: <CheckSquare className="w-6 h-6 text-teal-600 dark:text-teal-500 shrink-0" />,
          subtitle: 'All personal tasks',
        }
      default:
        return {
          title: activeList,
          icon: <Folder className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0" />,
          subtitle: 'Custom task list',
        }
    }
  }, [activeList])

  return (
    <div className={theme === 'dark' ? 'mfe-task-manager dark h-full w-full' : 'mfe-task-manager h-full w-full'}>
      <div className="flex h-full min-h-[700px] w-full bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 overflow-hidden font-sans rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-xl ring-1 ring-zinc-900/5 dark:ring-white/10 transition-colors">
        {/* 1. SIDEBAR */}
        <aside
          className={`${
            sidebarOpen ? 'w-64 md:w-72' : 'w-0'
          } transition-all duration-300 ease-in-out shrink-0 bg-zinc-50/90 dark:bg-zinc-900/90 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between overflow-hidden`}
        >
          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            {/* User Account / Status */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 dark:border-teal-400/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                    {userEmail || 'Personal To-Do'}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isOnlineBackend ? 'bg-teal-500 dark:bg-teal-400' : 'bg-amber-500 dark:bg-amber-400'
                      }`}
                    />
                    <span className="truncate">
                      {isOnlineBackend ? 'Postgres Synced' : 'Local Workspace'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Lists */}
            <nav className="space-y-1">
              <button
                onClick={() => setActiveList('my-day')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeList === 'my-day'
                    ? 'bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>My Day</span>
                </div>
                {counts.myDay > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {counts.myDay}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveList('important')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeList === 'important'
                    ? 'bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-teal-600 dark:text-teal-400 fill-teal-500/20 dark:fill-teal-400/20 shrink-0" />
                  <span>Important</span>
                </div>
                {counts.important > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {counts.important}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveList('planned')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeList === 'planned'
                    ? 'bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>Planned</span>
                </div>
                {counts.planned > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {counts.planned}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveList('tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeList === 'tasks'
                    ? 'bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-500 shrink-0" />
                  <span>Tasks</span>
                </div>
                {counts.tasks > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {counts.tasks}
                  </span>
                )}
              </button>
            </nav>

            {/* Custom Lists Section */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-2">
                <span>Lists</span>
                <button
                  onClick={() => setIsAddingList(true)}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  title="Add new list"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {isAddingList && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const trimmed = newListName.trim()
                    if (trimmed) {
                      const nextLists = Array.from(new Set([...customLists, trimmed]))
                      saveListsLocally(nextLists)
                      setActiveList(trimmed)
                      setNewListName('')
                      setIsAddingList(false)
                    }
                  }}
                  className="flex items-center gap-1.5 px-2"
                >
                  <input
                    type="text"
                    placeholder="List name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    autoFocus
                    className="w-full bg-white dark:bg-zinc-800/80 text-xs px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddingList(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              )}

              <div className="space-y-1">
                {customLists.map((name) => {
                  const count = tasks.filter(
                    (t) => t.listName === name && !t.completed,
                  ).length
                  return (
                    <div
                      key={name}
                      onClick={() => setActiveList(name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveList(name)
                        }
                      }}
                      className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        activeList === name
                          ? 'bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 font-semibold'
                          : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate min-w-0">
                        <Folder className="w-4 h-4 text-zinc-400 dark:text-zinc-400 shrink-0" />
                        <span className="truncate">{name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {count > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {count}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteList(name, e)}
                          title={`Delete list ${name}`}
                          aria-label={`Delete list ${name}`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* 2. MAIN TASK VIEW */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-hidden transition-colors">
          {/* Top Control Bar */}
          <div className="p-4 md:p-6 pb-2 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors shrink-0"
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  {listMeta.icon}
                  <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight truncate">
                    {listMeta.title}
                  </h1>
                  {isCustomActiveList && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteList(activeList, e)}
                      title={`Delete list ${activeList}`}
                      aria-label={`Delete list ${activeList}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {listMeta.subtitle}
                </p>
              </div>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative hidden sm:block">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-900/80 text-xs text-zinc-800 dark:text-zinc-200 pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-teal-500 w-44 focus:w-60 transition-all placeholder-zinc-400 dark:placeholder-zinc-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-2 pr-6 appearance-none focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="default">Sort: Default</option>
                  <option value="importance">Sort: Importance</option>
                  <option value="dueDate">Sort: Due Date</option>
                  <option value="alphabetical">Sort: Alphabetical</option>
                  <option value="creationDate">Sort: Creation Date</option>
                </select>
                <ArrowUpDown className="w-3 h-3 absolute right-2 top-3 pointer-events-none text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Task Scroll Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Quick Add Bar (Microsoft To-Do Fluent Style) */}
            <div
              className={`transition-all rounded-xl border bg-zinc-50/70 dark:bg-zinc-900/90 shadow-sm ${
                quickAddFocused
                  ? 'border-teal-500/70 ring-1 ring-teal-500/30 bg-white dark:bg-zinc-900'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/80'
              }`}
            >
              <form onSubmit={handleCreateTask} className="p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCreateTask()}
                    className="text-zinc-400 dark:text-zinc-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Add a task"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onFocus={() => setQuickAddFocused(true)}
                    className="w-full bg-transparent text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                {/* Quick Actions tray shown when typing or focused */}
                {quickAddFocused && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Due date picker */}
                      <input
                        type="date"
                        value={quickDueDate}
                        onChange={(e) => setQuickDueDate(e.target.value)}
                        className="bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                      />

                      {/* Quick In My Day */}
                      <button
                        type="button"
                        onClick={() => setQuickInMyDay((v) => !v)}
                        className={`px-2.5 py-1 rounded flex items-center gap-1.5 border transition-colors ${
                          quickInMyDay
                            ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 dark:border-amber-500/50'
                            : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 shrink-0" />
                        <span>My Day</span>
                      </button>

                      {/* Quick Important */}
                      <button
                        type="button"
                        onClick={() => setQuickImportant((v) => !v)}
                        className={`px-2.5 py-1 rounded flex items-center gap-1.5 border transition-colors ${
                          quickImportant
                            ? 'bg-teal-500/15 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border-teal-500/40 dark:border-teal-500/50'
                            : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 shrink-0" />
                        <span>Important</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickTitle('')
                          setQuickAddFocused(false)
                        }}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!quickTitle.trim()}
                        className="bg-teal-500 hover:bg-teal-600 dark:hover:bg-teal-400 disabled:opacity-40 text-white dark:text-zinc-950 font-semibold px-3 py-1 rounded transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Uncompleted Task List */}
            <div className="space-y-1.5">
              {uncompletedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTaskId === task.id
                      ? 'bg-teal-500/5 dark:bg-zinc-900 border-teal-500/50 shadow-sm ring-1 ring-teal-500/20'
                      : 'bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Fluent Circular Checkbox */}
                    <button
                      onClick={(e) => handleToggleComplete(task.id, e)}
                      className="w-5 h-5 rounded-full border border-zinc-400 dark:border-zinc-500 hover:border-teal-500 dark:hover:border-teal-400 flex items-center justify-center transition-all group-hover:scale-105 shrink-0"
                      title="Mark as completed"
                    >
                      <Check className="w-3 h-3 text-transparent group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors" />
                    </button>

                    {/* Task Title & Metadata Chips */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-zinc-800 dark:text-zinc-100 font-medium truncate">
                        {task.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {task.inMyDay && (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <Sun className="w-3 h-3 shrink-0" />
                            <span>My Day</span>
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="inline-flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </span>
                        )}
                        {task.steps && task.steps.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            {task.steps.filter((s) => s.completed).length} of{' '}
                            {task.steps.length} steps
                          </span>
                        )}
                        {activeList !== task.listName && task.listName && (
                          <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 truncate">
                            <span>•</span>
                            <span className="truncate">{task.listName}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Star Priority Toggle */}
                  <button
                    onClick={(e) => handleToggleImportant(task.id, e)}
                    className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors shrink-0 ml-2"
                    title="Toggle important"
                  >
                    <Star
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        task.important
                          ? 'text-teal-500 dark:text-teal-400 fill-teal-500 dark:fill-teal-400'
                          : 'text-zinc-400 dark:text-zinc-500 hover:text-teal-500 dark:hover:text-teal-400'
                      }`}
                    />
                  </button>
                </div>
              ))}

              {uncompletedTasks.length === 0 && (
                <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-sm">
                  No active tasks in this view. Add one above!
                </div>
              )}
            </div>

            {/* Completed Accordion */}
            {completedTasks.length > 0 && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/60">
                <button
                  onClick={() => setCompletedOpen((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 mb-2 transition-colors"
                >
                  {completedOpen ? (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  )}
                  <span>Completed ({completedTasks.length})</span>
                </button>

                {completedOpen && (
                  <div className="space-y-1.5 opacity-75">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="group flex items-center justify-between p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-zinc-900/30 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <button
                            onClick={(e) => handleToggleComplete(task.id, e)}
                            className="w-5 h-5 rounded-full bg-teal-500 border border-teal-500 flex items-center justify-center transition-all animate-check-pop shrink-0"
                            title="Mark incomplete"
                          >
                            <Check className="w-3 h-3 text-white dark:text-zinc-950 stroke-[3]" />
                          </button>
                          <span className="text-sm text-zinc-400 dark:text-zinc-400 line-through truncate flex-1">
                            {task.title}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleToggleImportant(task.id, e)}
                          className="p-1 text-zinc-400 dark:text-zinc-600 hover:text-teal-500 dark:hover:text-teal-400 transition-colors ml-2 shrink-0"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              task.important
                                ? 'text-teal-500 dark:text-teal-400 fill-teal-500 dark:fill-teal-400'
                                : 'text-zinc-400 dark:text-zinc-600'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* 3. TASK DETAIL DRAWER */}
        {selectedTask && (
          <aside className="w-80 md:w-96 shrink-0 bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between overflow-hidden shadow-2xl transition-all">
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Header: Checkbox + Title + Star + Close */}
              <div className="flex items-start justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(selectedTask.id)}
                    className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      selectedTask.completed
                        ? 'bg-teal-500 border-teal-500 text-white dark:text-zinc-950 animate-check-pop'
                        : 'border-zinc-400 dark:border-zinc-500 hover:border-teal-500 dark:hover:border-teal-400'
                    }`}
                  >
                    {selectedTask.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) =>
                      handleUpdateTitle(selectedTask.id, e.target.value)
                    }
                    className="w-full bg-transparent text-base font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-b focus:border-teal-500 pb-0.5"
                  />
                </div>

                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => handleToggleImportant(selectedTask.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-500 dark:hover:text-teal-400"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        selectedTask.important
                          ? 'text-teal-500 dark:text-teal-400 fill-teal-500 dark:fill-teal-400'
                          : 'text-zinc-400'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setSelectedTaskId(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
                    title="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subtasks / Steps Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Steps
                </div>
                <div className="space-y-1.5">
                  {(selectedTask.steps || []).map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          onClick={() =>
                            handleToggleStep(selectedTask.id, step.id)
                          }
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                            step.completed
                              ? 'bg-teal-500 border-teal-500 text-white dark:text-zinc-950'
                              : 'border-zinc-400 dark:border-zinc-500 hover:border-teal-500 dark:hover:border-teal-400'
                          }`}
                        >
                          {step.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        <span
                          className={`text-xs truncate ${
                            step.completed
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-700 dark:text-zinc-200'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteStep(selectedTask.id, step.id)
                        }
                        className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 p-1 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add Step input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddStep(selectedTask.id, newStepTitle)
                    }}
                    className="flex items-center gap-2 pt-1"
                  >
                    <Plus className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    <input
                      type="text"
                      placeholder="Next step"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      className="w-full bg-transparent text-xs text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none"
                    />
                    {newStepTitle && (
                      <button
                        type="submit"
                        className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline shrink-0"
                      >
                        Add
                      </button>
                    )}
                  </form>
                </div>
              </div>

              {/* Quick Action Tiles (Microsoft To-Do style cards) */}
              <div className="space-y-2">
                {/* Add to My Day Tile */}
                <button
                  onClick={() => handleToggleMyDay(selectedTask.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-colors ${
                    selectedTask.inMyDay
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300'
                      : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>
                      {selectedTask.inMyDay ? 'Added to My Day' : 'Add to My Day'}
                    </span>
                  </div>
                  {selectedTask.inMyDay && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>

                {/* Due Date Tile */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>Due Date</span>
                    </div>
                    {selectedTask.dueDate && (
                      <button
                        onClick={() => handleUpdateDueDate(selectedTask.id, null)}
                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={
                      selectedTask.dueDate
                        ? new Date(selectedTask.dueDate).toISOString().slice(0, 10)
                        : ''
                    }
                    onChange={(e) =>
                      handleUpdateDueDate(
                        selectedTask.id,
                        e.target.value ? new Date(e.target.value).toISOString() : null,
                      )
                    }
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Category / List Picker */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>List:</span>
                  </div>
                  <select
                    value={selectedTask.listName}
                    onChange={(e) => {
                      const nextList = e.target.value
                      const updated = tasks.map((t) =>
                        t.id === selectedTask.id ? { ...t, listName: nextList } : t,
                      )
                      saveTasksLocally(updated)
                      apiFetch(`${apiBaseUrl}/api/tasks`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: selectedTask.id, listName: nextList }),
                      }).catch(() => {})
                    }}
                    className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Tasks">Tasks</option>
                    {customLists.map((cl) => (
                      <option key={cl} value={cl}>
                        {cl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Notes
                </div>
                <textarea
                  rows={5}
                  placeholder="Add notes..."
                  value={selectedTask.notes || ''}
                  onChange={(e) =>
                    handleUpdateNotes(selectedTask.id, e.target.value)
                  }
                  className="w-full bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Created{' '}
                {new Date(selectedTask.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded transition-colors flex items-center gap-1"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default TaskManager
