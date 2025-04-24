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
  }, [user?.email, selectedCategory, selectedPriority]);

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
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleError(error, 'Error loading completed tasks');
        }
      }
    );

    addUnsubscriber(unsubscribe);
  }, [user?.email, buildQueryConstraints]);

  const fetchTotalTasks = useCallback((
    sortDirection: 'asc' | 'desc' | null,
    nameFilter: string
  ) => {
    if (!user?.email || nameFilter) return;

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
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleError(error, 'Error loading task count');
        }
      }
    );

    addUnsubscriber(unsubscribe);
  }, [user?.email, selectedCategory, selectedPriority]);

  // Reset tasks when category changes
  useEffect(() => {
    if (user?.email) {
      cleanup();
      fetchTasks(currentPage, tasksPerPage, sortDirection, nameFilter);
      fetchCompletedTasks(sortDirection, nameFilter);
      fetchTotalTasks(sortDirection, nameFilter);
    }
  }, [selectedCategory, user?.email, currentPage, tasksPerPage, sortDirection, nameFilter, fetchTasks, fetchCompletedTasks, fetchTotalTasks]);

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

  return {
    tasks,
    completedTasks,
    loading,
    totalTasks,
    fetchTasks,
    fetchCompletedTasks,
    fetchTotalTasks,
    deleteAllCompletedTasks
  };
} 