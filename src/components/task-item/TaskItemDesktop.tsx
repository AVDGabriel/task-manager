import { Calendar, Flag, MessageSquare, Pencil, Tag, Trash2 } from "lucide-react";
import type { Category, Priority } from "@/types";

interface TaskItemDesktopProps {
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

export default function TaskItemDesktop({
  title,
  description,
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
}: TaskItemDesktopProps) {
  return (
    <div className="hidden lg:flex items-center gap-3">
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggleComplete}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {category && (
            <span
              className={`flex-shrink-0 w-2 h-2 rounded-full ${
                !showCategory && "hidden"
              }`}
              style={{ backgroundColor: category.color }}
            />
          )}
          <p
            className={`truncate ${
              completed ? "line-through text-zinc-400" : ""
            }`}
          >
            {title}
          </p>
          {showCategory && category && (
            <span className="flex-shrink-0 text-sm text-zinc-400 flex items-center gap-1">
              <Tag size={12} />
              {category.name}
            </span>
          )}
          {priority && (
            <span
              className="flex-shrink-0 text-sm flex items-center gap-1 px-2 py-0.5 rounded"
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
        {description && (
          <p className="text-sm text-zinc-400 truncate">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {dueDate && (
          <>
            <span className="text-sm text-zinc-400 flex items-center gap-1">
              <Calendar size={14} />
              {new Date(dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
            <span className="text-zinc-600">|</span>
          </>
        )}
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
    </div>
  );
} 