import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TaskManager } from './TaskManager'
import { Task } from './types'

const MOCK_TASKS: Task[] = [
  {
    id: 'test-task-1',
    userId: 'test-user',
    title: 'Review Rsbuild Module Federation configuration',
    completed: false,
    important: true,
    inMyDay: true,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    notes: 'Ensure port 3002 is exposed with CORS headers and mf-manifest.json',
    listName: 'Tasks',
    steps: [
      { id: 's1', taskId: 'test-task-1', title: 'Check singleton react sharing', completed: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'test-task-2',
    userId: 'test-user',
    title: 'Connect shared PostgreSQL task database',
    completed: false,
    important: false,
    inMyDay: false,
    dueDate: new Date(Date.now() + 172800000).toISOString(),
    notes: 'Store user tasks under auth:user from mfe-bus in postgres tasks table.',
    listName: 'Tasks',
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('TaskManager Fluent MFE Remote', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      }),
    ) as any
  })

  it('renders sidebar with Microsoft To-Do Smart Lists', () => {
    render(<TaskManager initialUserId="test-user" initialTasks={MOCK_TASKS} />)

    expect(screen.getAllByText('My Day').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Important').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Planned').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0)
  })

  it('allows adding a new task via quick-add input bar', async () => {
    render(<TaskManager initialUserId="test-user" initialTasks={MOCK_TASKS} />)

    const input = screen.getByPlaceholderText('Add a task')
    fireEvent.change(input, { target: { value: 'Buy groceries for dinner' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Buy groceries for dinner')).toBeInTheDocument()
    })
  })

  it('toggles task completion when circular checkbox is clicked', async () => {
    render(<TaskManager initialUserId="test-user" initialTasks={MOCK_TASKS} />)

    const completeButtons = screen.getAllByTitle('Mark as completed')
    expect(completeButtons.length).toBeGreaterThan(0)

    fireEvent.click(completeButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Completed \(/)).toBeInTheDocument()
    })
  })

  it('opens detail drawer when a task row is clicked', async () => {
    render(<TaskManager initialUserId="test-user" initialTasks={MOCK_TASKS} />)

    const taskText = screen.getByText('Review Rsbuild Module Federation configuration')
    fireEvent.click(taskText)

    await waitFor(() => {
      expect(screen.getByText('Steps')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Next step')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Add notes...')).toBeInTheDocument()
    })
  })

  it('filters tasks when searching via search bar', async () => {
    render(<TaskManager initialUserId="test-user" initialTasks={MOCK_TASKS} />)

    // Switch to Tasks list to view all tasks first
    const tasksNavButtons = screen.getAllByText('Tasks')
    fireEvent.click(tasksNavButtons[0])

    const searchInput = screen.getByPlaceholderText('Search tasks...')
    fireEvent.change(searchInput, { target: { value: 'PostgreSQL' } })

    await waitFor(() => {
      expect(screen.getByText(/Connect shared PostgreSQL task database/)).toBeInTheDocument()
    })
  })
})
