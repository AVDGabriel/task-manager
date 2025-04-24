"use client";

import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Task, Category, Comment } from "@/types";
import { usePriority } from "@/context/PriorityContext";
import TaskDialog from "../task-dialog/TaskDialog";
import TaskItemMobile from "./TaskItemMobile";
import TaskItemDesktop from "./TaskItemDesktop";
import TaskComments from "./TaskComments";
import { useToast } from "@/hooks/useToast";

interface TaskItemProps {
  task: Task;
  showCategory?: boolean;
}

export default function TaskItem({ task, showCategory = false }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const { priorities } = usePriority();
  const user = auth.currentUser;
  const { handleError, showSuccess } = useToast();

  useEffect(() => {
    if (!user?.email) return;

    const q = query(collection(db, `users/${user.email}/categories`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(categoriesData);
    });

    return () => unsubscribe();
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, `users/${user.email}/tasks/${task.id}/comments`),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [user?.email, task.id]);

  if (!user?.email) return null;

  const ref = doc(db, "users", user.email, "tasks", task.id);

  const toggleCompleted = async () => {
    try {
      await updateDoc(ref, { 
        completed: !task.completed,
        categoryId: task.categoryId
      });
      showSuccess(`Task marked as ${!task.completed ? 'completed' : 'incomplete'}`);
    } catch (error) {
      handleError(error, 'Failed to update task status');
    }
  };

  const handleEdit = async (data: {
    title: string;
    description: string;
    categoryId?: string | null;
    priorityId: string;
    dueDate?: string | null;
  }) => {
    const updateData: Record<string, any> = {
      title: data.title,
      description: data.description || null,
      categoryId: data.categoryId === "none" ? null : data.categoryId,
      priorityId: data.priorityId,
      dueDate: data.dueDate || null,
    };

    try {
      await updateDoc(ref, updateData);
      setIsEditing(false);
      showSuccess('Task updated successfully');
    } catch (error) {
      handleError(error, 'Error updating task');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(ref);
      showSuccess('Task deleted successfully');
    } catch (error) {
      handleError(error, 'Error deleting task');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user?.email) return;

    try {
      const commentsRef = collection(db, `users/${user.email}/tasks/${task.id}/comments`);
      await addDoc(commentsRef, {
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment("");
      showSuccess('Comment added successfully');
    } catch (error) {
      handleError(error, 'Error adding comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.email) return;

    try {
      const commentRef = doc(db, `users/${user.email}/tasks/${task.id}/comments/${commentId}`);
      await deleteDoc(commentRef);
      showSuccess('Comment deleted successfully');
    } catch (error) {
      handleError(error, 'Error deleting comment');
    }
  };

  const category = categories.find((c) => c.id === task.categoryId);
  const priority = priorities.find((p) => p.id === task.priorityId);

  const sharedProps = {
    title: task.title,
    description: task.description,
    completed: task.completed,
    category,
    priority,
    dueDate: task.dueDate,
    showCategory,
    commentsCount: comments.length,
    onToggleComplete: toggleCompleted,
    onToggleComments: () => setIsCommentsExpanded(!isCommentsExpanded),
    onEdit: () => setIsEditing(true),
    onDelete: handleDelete,
  };

  return (
    <>
      <div className="w-full bg-zinc-800 p-3 rounded">
        <TaskItemMobile {...sharedProps} />
        <TaskItemDesktop {...sharedProps} />

        <TaskComments
          comments={comments}
          isExpanded={isCommentsExpanded}
          newComment={newComment}
          onToggleExpanded={() => setIsCommentsExpanded(false)}
          onNewCommentChange={(value) => setNewComment(value)}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      </div>

      <TaskDialog
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={task.title}
        description={task.description || ""}
        categoryId={task.categoryId}
        priorityId={task.priorityId}
        dueDate={task.dueDate || null}
        categories={categories}
        onSave={handleEdit}
      />
    </>
  );
}
