import { Calendar, Flag, MessageSquare, Pencil, Trash2 } from "lucide-react";
import type { Category, Priority } from "@/types";

interface TaskItemMobileProps {
  title: string;
  description?: string;
  completed: boolean;
  category?: Category;
  priority?: Priority;
  dueDate?: string | null;
  showCategory: boolean;
  commentsCount: number;
  onToggleComplete: () => void;
  onToggleComments: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TaskItemMobile({
  title,
  completed,
  category,
  priority,
  dueDate,
  showCategory,
  commentsCount,
  onToggleComplete,
  onToggleComments,
  onEdit,
  onDelete,
}: TaskItemMobileProps) {
  return (
    <div className="lg:hidden flex flex-col gap-2">
      {/* Action buttons row */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onToggleComments}
          className="text-zinc-400 p-1 hover:text-zinc-300 flex items-center gap-1"
          title={commentsCount > 0 ? `${commentsCount} comment${commentsCount !== 1 ? 's' : ''}` : "Add comment"}
        >
          {commentsCount > 0 && (
            <span className="text-xs">{commentsCount}</span>
          )}
          <MessageSquare size={16} />
        </button>
        <button
          onClick={onEdit}
          className="text-zinc-400 p-1 hover:text-zinc-300"
          disabled={completed}
          style={{ opacity: completed ? 0.5 : 1 }}
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={onDelete}
          className="text-zinc-400 p-1 hover:text-red-500"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Title row */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={completed}
          onChange={onToggleComplete}
        />
        <p className={`truncate ${completed ? "line-through text-zinc-400" : ""}`}>
          {title}
        </p>
      </div>

      {/* Category and Priority row */}
      <div className="flex items-center gap-2 text-sm">
        {showCategory && category && (
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
            {category.name}
          </span>
        )}
        {priority && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{
              backgroundColor: `${priority.color}20`,
              color: priority.color,
            }}
          >
            <Flag size={12} />
            {priority.name}
          </span>
        )}
      </div>

      {/* Due date row */}
      {dueDate && (
        <div className="text-sm text-zinc-400 flex items-center gap-1">
          <Calendar size={14} />
          {new Date(dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      )}
    </div>
  );
} 