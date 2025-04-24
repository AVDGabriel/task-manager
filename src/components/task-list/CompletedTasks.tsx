import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import TaskItem from "../task-item/TaskItem";
import type { Task } from "@/types";
import { useTasks } from "@/hooks/useTasks";

interface CompletedTasksProps {
  tasks: Task[];
  showCategory: boolean;
}

export default function CompletedTasks({ tasks, showCategory }: CompletedTasksProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { deleteAllCompletedTasks } = useTasks();

  if (tasks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300"
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          {tasks.length} Completed {tasks.length === 1 ? "Task" : "Tasks"}
        </button>
        <button
          onClick={deleteAllCompletedTasks}
          className="text-zinc-400 hover:text-red-500 flex items-center gap-1 text-sm"
        >
          <Trash2 size={16} />
          Delete Completed Tasks
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} showCategory={showCategory} />
          ))}
        </div>
      )}
    </div>
  );
} 