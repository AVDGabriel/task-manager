import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import TaskItem from "../task-item/TaskItem";
import type { Task } from "@/types";

interface CompletedTasksProps {
  tasks: Task[];
  showCategory: boolean;
}

export default function CompletedTasks({ tasks, showCategory }: CompletedTasksProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 mb-2"
      >
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        {tasks.length} Completed {tasks.length === 1 ? "Task" : "Tasks"}
      </button>

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