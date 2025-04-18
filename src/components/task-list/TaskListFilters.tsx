import { Calendar } from "lucide-react";
import type { Priority } from "@/types";

interface TaskListFiltersProps {
  nameFilter: string;
  onNameFilterChange: (value: string) => void;
  selectedPriority: string | null;
  onPriorityChange: (value: string | null) => void;
  priorities: Priority[];
  sortDirection: 'asc' | 'desc' | null;
  onSortClick: () => void;
}

export default function TaskListFilters({
  nameFilter,
  onNameFilterChange,
  selectedPriority,
  onPriorityChange,
  priorities,
  sortDirection,
  onSortClick,
}: TaskListFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        <div className="flex items-center gap-2 w-full lg:w-64">
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => onNameFilterChange(e.target.value)}
            placeholder="Filter by name..."
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-40">
          <select
            value={selectedPriority || ""}
            onChange={(e) => onPriorityChange(e.target.value || null)}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            {priorities
              .sort((a, b) => a.level - b.level)
              .map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
          </select>
        </div>
        <button
          onClick={onSortClick}
          className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
            sortDirection 
              ? 'bg-blue-500 text-white' 
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
          title={sortDirection === 'asc' ? 'Sort by due date (ascending)' : 
                 sortDirection === 'desc' ? 'Sort by due date (descending)' : 
                 'Sort by due date'}
        >
          <Calendar size={14} />
          {sortDirection === 'asc' ? 'Due Date ↑' : 
           sortDirection === 'desc' ? 'Due Date ↓' : 
           'Due Date'}
        </button>
      </div>
    </div>
  );
} 