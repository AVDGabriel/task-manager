import { ChevronLeft, ChevronRight } from "lucide-react";

interface TaskListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalTasks: number;
  tasksPerPage: number;
  onTasksPerPageChange?: (value: number) => void;
}

export default function TaskListPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalTasks,
  tasksPerPage,
  onTasksPerPageChange,
}: TaskListPaginationProps) {
  const startIndex = Math.min(((currentPage - 1) * tasksPerPage) + 1, totalTasks);
  const endIndex = Math.min(currentPage * tasksPerPage, totalTasks);

  const handleTasksPerPageChange = (value: string) => {
    const newValue = parseInt(value, 10);
    if (onTasksPerPageChange) {
      onTasksPerPageChange(newValue);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400 hidden lg:inline">Tasks per page:</span>
        <select
          value={tasksPerPage}
          onChange={(e) => handleTasksPerPageChange(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
        >
          {[5, 10, 15, 20].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
        <div className="hidden lg:flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page
                  ? 'bg-blue-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center gap-2">
        <div className="hidden lg:block text-sm text-zinc-400">
          <span>
            {totalTasks === 0 ? "No tasks" : 
              `Showing ${startIndex}-${endIndex} of ${totalTasks} task${totalTasks === 1 ? '' : 's'}`
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-zinc-400">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
} 