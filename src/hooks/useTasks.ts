import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  orderBy, 
  query, 
  where, 
  QueryConstraint, 
  limit,
  startAfter,
  getDocs,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  deleteDoc
} from "firebase/firestore";
import type { Task } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCategory } from "@/context/CategoryContext";
import { usePriority } from "@/context/PriorityContext";
import { useToast } from "./useToast";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTasks, setTotalTasks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const pageSnapshotsRef = useRef<{ [key: number]: QueryDocumentSnapshot }>({});
  const unsubscribersRef = useRef<(() => void)[]>([]);
  
  const { user } = useAuth();
  const { selectedCategory } = useCategory();
  const { selectedPriority } = usePriority();
  const { handleError, showSuccess } = useToast();

  // Cleanup function to unsubscribe from all listeners
  const cleanup = () => {
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current = [];
    setTasks([]);
    setCompletedTasks([]);
    setTotalTasks(0);
    pageSnapshotsRef.current = {};
  };

  // Reset state and cleanup when user becomes null
  useEffect(() => {
    if (!user) {
      cleanup();
    }
    return () => cleanup();
  }, [user]);

  const addUnsubscriber = (unsubscribe: () => void) => {
    unsubscribersRef.current.push(unsubscribe);
  };

  const buildQueryConstraints = useCallback((
    sortDirection: 'asc' | 'desc' | null,
    nameFilter: string,
    isCompleted: boolean
  ): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [];
    
    if (sortDirection) {
      constraints.push(where("dueDate", "!=", null));
      constraints.push(orderBy("dueDate", sortDirection));
      constraints.push(orderBy("createdAt", "desc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }
    
    // Apply category filter when viewing a specific category
    if (selectedCategory !== null) {
      constraints.push(where("categoryId", "==", selectedCategory));
    }
    
    if (selectedPriority) {
      constraints.push(where("priorityId", "==", selectedPriority));
    }
    
    if (nameFilter) {
      constraints.push(orderBy("title"));
    }
    
    constraints.push(where("completed", "==", isCompleted));
    
    return constraints;
  }, [selectedCategory, selectedPriority]);

  const updateTotalTasks = useCallback(() => {
    if (!user?.email) return;

    // Create constraints without the due date filter for total count
    const countConstraints: QueryConstraint[] = [];
    
    // Add category filter when viewing a specific category
    if (selectedCategory !== null) {
      countConstraints.push(where("categoryId", "==", selectedCategory));
    }
    
    if (selectedPriority) {
      countConstraints.push(where("priorityId", "==", selectedPriority));
    }
    
    // Only filter for incomplete tasks
    countConstraints.push(where("completed", "==", false));
    
    // Add basic ordering
    countConstraints.push(orderBy("createdAt", "desc"));

    const q = query(collection(db, `users/${user.email}/tasks`), ...countConstraints);
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newTotal = snapshot.size;
        setTotalTasks(newTotal);
        // Reset to page 1 if current page is invalid
        if (currentPage > Math.ceil(newTotal / tasksPerPage)) {
          setCurrentPage(1);
        }
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleError(error, 'Error loading task count');
        }
      }
    );

    addUnsubscriber(unsubscribe);
  }, [user?.email, selectedCategory, selectedPriority, currentPage, tasksPerPage]);

  const fetchTasks = useCallback(async (
    currentPage: number,
    tasksPerPage: number,
    sortDirection: 'asc' | 'desc' | null,
    nameFilter: string
  ) => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const baseQuery = collection(db, `users/${user.email}/tasks`);

    try {
      // Create base constraints similar to total count
      const baseConstraints: QueryConstraint[] = [];
      
      // Add category filter when viewing a specific category
      if (selectedCategory !== null) {
        baseConstraints.push(where("categoryId", "==", selectedCategory));
      }
      
      if (selectedPriority) {
        baseConstraints.push(where("priorityId", "==", selectedPriority));
      }
      
      // Only get incomplete tasks
      baseConstraints.push(where("completed", "==", false));

      // Add sorting constraints
      if (sortDirection) {
        // When sorting by due date, only show tasks with due dates
        const constraints = [
          ...baseConstraints,
          where("dueDate", "!=", null),
          orderBy("dueDate", sortDirection),
          orderBy("createdAt", "desc")
        ];

        let q: Query<DocumentData>;
        if (currentPage === 1) {
          q = query(baseQuery, ...constraints, limit(tasksPerPage));
        } else {
          const skipQuery = query(baseQuery, ...constraints, limit((currentPage - 1) * tasksPerPage));
          const skipSnapshot = await getDocs(skipQuery);
          
          if (skipSnapshot.empty) {
            setLoading(false);
            return;
          }
          
          const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
          q = query(baseQuery, ...constraints, startAfter(lastDoc), limit(tasksPerPage));
        }

        const unsubscribe = onSnapshot(q,
          (snapshot) => {
            const tasksData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Task[];
            setTasks(tasksData);
            setLoading(false);
            // Update total tasks count when tasks change
            updateTotalTasks();
          },
          (error) => {
            if (error.code !== 'permission-denied') {
              handleError(error, 'Error loading tasks');
            }
            setLoading(false);
          }
        );

        addUnsubscriber(unsubscribe);
      } else {
        // When not sorting by due date, use simple ordering
        baseConstraints.push(orderBy("createdAt", "desc"));
        
        let q: Query<DocumentData>;
        if (currentPage === 1) {
          q = query(baseQuery, ...baseConstraints, limit(tasksPerPage));
        } else {
          const skipQuery = query(baseQuery, ...baseConstraints, limit((currentPage - 1) * tasksPerPage));
          const skipSnapshot = await getDocs(skipQuery);
          
          if (skipSnapshot.empty) {
            setLoading(false);
            return;
          }
          
          const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
          q = query(baseQuery, ...baseConstraints, startAfter(lastDoc), limit(tasksPerPage));
        }

        const unsubscribe = onSnapshot(q,
          (snapshot) => {
            const tasksData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Task[];
            setTasks(tasksData);
            setLoading(false);
            // Update total tasks count when tasks change
            updateTotalTasks();
          },
          (error) => {
            if (error.code !== 'permission-denied') {
              handleError(error, 'Error loading tasks');
            }
            setLoading(false);
          }
        );

        addUnsubscriber(unsubscribe);
      }
    } catch (error) {
      if ((error as any).code !== 'permission-denied') {
        handleError(error, 'Error loading tasks');
      }
      setLoading(false);
    }
  }, [user?.email, selectedCategory, selectedPriority, updateTotalTasks]);

  const fetchCompletedTasks = useCallback((
    sortDirection: 'asc' | 'desc' | null,
    nameFilter: string
  ) => {
    if (!user?.email) return;

    const constraints = buildQueryConstraints(sortDirection, nameFilter, true);
    const q = query(collection(db, `users/${user.email}/tasks`), ...constraints);
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        // Ensure we're only showing completed tasks
        setCompletedTasks(tasksData.filter(task => task.completed));
        // Update total tasks count when completed tasks change
        updateTotalTasks();
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleError(error, 'Error loading completed tasks');
        }
      }
    );

    addUnsubscriber(unsubscribe);
  }, [user?.email, buildQueryConstraints, updateTotalTasks]);

  // Reset page and fetch tasks when category changes
  useEffect(() => {
    if (!user?.email) return;

    // Reset to page 1 when category changes
    setCurrentPage(1);
    setNameFilter("");

    // Fetch tasks with the new category
    cleanup();
    fetchTasks(1, tasksPerPage, sortDirection, "");
    fetchCompletedTasks(sortDirection, "");
    updateTotalTasks();
  }, [selectedCategory]);

  // Fetch tasks when pagination or filters change (but not category)
  useEffect(() => {
    if (!user?.email) return;

    cleanup();
    fetchTasks(currentPage, tasksPerPage, sortDirection, nameFilter);
    fetchCompletedTasks(sortDirection, nameFilter);
    updateTotalTasks();
  }, [currentPage, tasksPerPage, sortDirection, nameFilter, selectedPriority, user?.email]);

  const deleteAllCompletedTasks = useCallback(async () => {
    if (!user?.email) return;

    try {
      const queryConstraints: QueryConstraint[] = [
        where("completed", "==", true)
      ];

      // Add category filter if a category is selected
      if (selectedCategory) {
        queryConstraints.push(where("categoryId", "==", selectedCategory));
      }

      const completedTasksQuery = query(
        collection(db, `users/${user.email}/tasks`),
        ...queryConstraints
      );
      
      const snapshot = await getDocs(completedTasksQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      showSuccess('All completed tasks deleted successfully');
    } catch (error) {
      handleError(error, 'Error deleting completed tasks');
    }
  }, [user?.email, selectedCategory]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalTasks / tasksPerPage)) {
      setCurrentPage(newPage);
    }
  };

  const handleTasksPerPageChange = (value: number) => {
    setTasksPerPage(value);
    setCurrentPage(1);
  };

  const handleSortDirectionChange = (direction: 'asc' | 'desc' | null) => {
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleNameFilterChange = (filter: string) => {
    setNameFilter(filter);
    setCurrentPage(1);
  };

  return {
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
    deleteAllCompletedTasks
  };
} 