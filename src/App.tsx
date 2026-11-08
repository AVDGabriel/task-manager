import React from 'react'
import { TaskManager } from './TaskManager'
import './index.css'

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="w-full max-w-6xl h-[85vh] min-h-[680px]">
        <TaskManager initialUserId="demo-user" />
      </div>
    </div>
  )
}

export default App
