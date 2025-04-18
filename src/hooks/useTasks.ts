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
  QueryDocumentSnapshot
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
  const pageSnapshotsRef = useRef<{ [key: number]: QueryDocumentSnapshot }>({});
  const unsubscribersRef = useRef<(() => void)[]>([]);
  
  const { user } = useAuth();
  const { selectedCategory } = useCategory();
  const { selectedPriority } = usePriority();
  const { handleError } = useToast();

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
    
    if (selectedCategory) {
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
    const constraints = buildQueryConstraints(sortDirection, nameFilter, false);
    const baseQuery = collection(db, `users/${user.email}/tasks`);
    const skip = (currentPage - 1) * tasksPerPage;

    try {
      // First, check if the page is valid by getting the total count
      const countQuery = query(baseQuery, ...constraints);
      const countSnapshot = await getDocs(countQuery);
      const totalCount = countSnapshot.size;
      
      // If the current page is invalid, reset to page 1
      if (currentPage > Math.ceil(totalCount / tasksPerPage)) {
        setLoading(false);
        return;
      }

      let q: Query<DocumentData>;

      if (currentPage === 1) {
        q = query(baseQuery, ...constraints, limit(tasksPerPage));
      } else {
        const skipQuery = query(baseQuery, ...constraints, limit(skip));
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
    } catch (error) {
      if ((error as any).code !== 'permission-denied') {
        handleError(error, 'Error loading tasks');
      }
      setLoading(false);
    }
  }, [user?.email, buildQueryConstraints]);

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

        const filteredData = nameFilter
          ? tasksData.filter(task => task.title.toLowerCase().includes(nameFilter.toLowerCase()))
          : tasksData;

        setCompletedTasks(filteredData);
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

    const constraints = buildQueryConstraints(sortDirection, nameFilter, false);
    const q = query(collection(db, `users/${user.email}/tasks`), ...constraints);
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newTotal = snapshot.size;
        if (sortDirection && newTotal !== totalTasks) {
          setTotalTasks(newTotal);
          pageSnapshotsRef.current = {};
        } else if (newTotal > totalTasks) {
          setTotalTasks(newTotal);
          pageSnapshotsRef.current = {};
        } else {
          setTotalTasks(newTotal);
        }
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleError(error, 'Error loading task count');
        }
      }
    );

    addUnsubscriber(unsubscribe);
  }, [user?.email, buildQueryConstraints]);

  return {
    tasks,
    completedTasks,
    loading,
    totalTasks,
    pageSnapshotsRef,
    fetchTasks,
    fetchCompletedTasks,
    fetchTotalTasks
  };
} 