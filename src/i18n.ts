import type { Bundle, I18nOptions } from '@avdgabriel/i18n/react'

/** This app's translations registry (namespace) in translations-api. */
export const I18N_NAMESPACE = 'task-manager'

/** translations-api per environment, resolved from the page host (standalone or inside the host shell). */
export function translationsApiUrl(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3017'
  if (host.startsWith('uat.') || host.includes('-uat.')) return 'https://translations-api-uat.gabriel-avadani.com'
  return 'https://translations-api.gabriel-avadani.com'
}

/** Bundle used only in the Vitest environment so tests never hit the network. */
export const TEST_BUNDLE: Bundle = {
  defaultLocale: 'en',
  locales: [
    { code: 'en', name: 'English' },
    { code: 'ro', name: 'Română' },
  ],
  messages: {
    en: {
      'task-manager.sidebar.default-user': 'Personal To-Do',
      'task-manager.sidebar.synced': 'Postgres Synced',
      'task-manager.sidebar.local': 'Local Workspace',
      'task-manager.list.my-day': 'My Day',
      'task-manager.list.important': 'Important',
      'task-manager.list.planned': 'Planned',
      'task-manager.list.tasks': 'Tasks',
      'task-manager.list.subtitle.important': 'Prioritized items',
      'task-manager.list.subtitle.planned': 'Tasks with due dates',
      'task-manager.list.subtitle.tasks': 'All personal tasks',
      'task-manager.list.subtitle.custom': 'Custom task list',
      'task-manager.list.lists': 'Lists',
      'task-manager.list.add': 'Add new list',
      'task-manager.list.name-placeholder': 'List name...',
      'task-manager.list.delete': 'Delete list {name}',
      'task-manager.toolbar.toggle-sidebar': 'Toggle sidebar',
      'task-manager.toolbar.search': 'Search tasks...',
      'task-manager.sort.default': 'Sort: Default',
      'task-manager.sort.importance': 'Sort: Importance',
      'task-manager.sort.due-date': 'Sort: Due Date',
      'task-manager.sort.alphabetical': 'Sort: Alphabetical',
      'task-manager.sort.creation-date': 'Sort: Creation Date',
      'task-manager.quick.placeholder': 'Add a task',
      'task-manager.quick.cancel': 'Cancel',
      'task-manager.quick.add': 'Add',
      'task-manager.task.steps-progress': '{done} of {total} steps',
      'task-manager.task.mark-completed': 'Mark as completed',
      'task-manager.task.mark-incomplete': 'Mark incomplete',
      'task-manager.task.toggle-important': 'Toggle important',
      'task-manager.task.empty': 'No active tasks in this view. Add one above!',
      'task-manager.task.completed': 'Completed ({count})',
      'task-manager.drawer.close': 'Close panel',
      'task-manager.drawer.steps': 'Steps',
      'task-manager.drawer.next-step': 'Next step',
      'task-manager.drawer.add': 'Add',
      'task-manager.drawer.added-to-my-day': 'Added to My Day',
      'task-manager.drawer.add-to-my-day': 'Add to My Day',
      'task-manager.drawer.due-date': 'Due Date',
      'task-manager.drawer.clear': 'Clear',
      'task-manager.drawer.list': 'List:',
      'task-manager.drawer.notes': 'Notes',
      'task-manager.drawer.notes-placeholder': 'Add notes...',
      'task-manager.drawer.created': 'Created {date}',
      'task-manager.drawer.delete-task': 'Delete task',
    },
    ro: {},
  },
}

const isTestEnv =
  ((globalThis as any).process?.env?.NODE_ENV === 'test') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test')

/** Stable options object: ONE request per page load, shared by every component. */
export const I18N_OPTIONS: I18nOptions = {
  mfe: I18N_NAMESPACE,
  apiUrl: translationsApiUrl(),
  initialBundle: isTestEnv ? TEST_BUNDLE : undefined,
}
