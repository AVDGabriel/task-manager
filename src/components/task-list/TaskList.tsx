"use client";

import { useState, useEffect } from "react";
import TaskItem from "../task-item/TaskItem";
import { useCategory } from "@/context/CategoryContext";
import { usePriority } from "@/context/PriorityContext";
import { useTasks } from "@/hooks/useTasks";
import TaskListFilters from "./TaskListFilters";
import TaskListPagination from "./TaskListPagination";
import CompletedTasks from "./CompletedTasks";

export default function TaskList() {
  const { selectedCategory } = useCategory();
  const { priorities, selectedPriority, setSelectedPriority } = usePriority();  
  const {
    tasks,
    completedTasks,
    loading,
    totalTasks,
    currentPage,
    tasksPerPage,
    sortDirection,
    nameFilter,
    handlePageChange,
    handleTasksPerPageChange,
    handleSortDirectionChange,
    handleNameFilterChange,
  } = useTasks();

  const handleSortClick = () => {
    handleSortDirectionChange(
      sortDirection === null ? 'asc' : 
      sortDirection === 'asc' ? 'desc' : 
      null
    );
  };

  if (loading && !nameFilter && tasks.length === 0) {
    return <div className="text-center text-zinc-400">Loading tasks...</div>;
  }

  const filteredTasks = nameFilter
    ? tasks.filter(task => 
        task.title.toLowerCase().includes(nameFilter.toLowerCase()) &&
        (!selectedCategory || task.categoryId === selectedCategory)
      )
    : tasks.filter(task => !selectedCategory || task.categoryId === selectedCategory);

  const filteredCompletedTasks = completedTasks
    .filter(task => 
      (!nameFilter || task.title.toLowerCase().includes(nameFilter.toLowerCase())) &&
      (!selectedPriority || task.priorityId === selectedPriority) &&
      (!selectedCategory || task.categoryId === selectedCategory)
    )
    .sort((a, b) => {
      if (!sortDirection || !a.dueDate || !b.dueDate) return 0;
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="space-y-4">
      <TaskListFilters
        nameFilter={nameFilter}
        onNameFilterChange={handleNameFilterChange}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        priorities={priorities}
        sortDirection={sortDirection}
        onSortClick={handleSortClick}
      />

      {filteredTasks.length === 0 && filteredCompletedTasks.length === 0 ? (
        <p className="text-center text-zinc-400">
          {tasks.length === 0 && completedTasks.length === 0 ? "No tasks yet" : "No tasks match your filter"}
        </p>
      ) : (
        <>
          <div className="space-y-2 list-none">
            {filteredTasks.map((task) => (
              <TaskItem 
                key={task.id} 
                task={task} 
                showCategory={selectedCategory === null}
              />
            ))}
          </div>

          <TaskListPagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalTasks / tasksPerPage)}
            onPageChange={handlePageChange}
            totalTasks={totalTasks}
            tasksPerPage={tasksPerPage}
            onTasksPerPageChange={handleTasksPerPageChange}
          />

          <CompletedTasks 
            tasks={filteredCompletedTasks}
            showCategory={selectedCategory === null}
          />
        </>
      )}
    </div>
  );
}
