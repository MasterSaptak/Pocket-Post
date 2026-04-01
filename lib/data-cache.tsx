'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  startAfter,
  onSnapshot,
  Unsubscribe,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth-context';
import { TaskData } from '@/components/task-card';

const FEED_PAGE_SIZE = 15;

// ─── Types ────────────────────────────────────────────────────
interface DataCacheContextType {
  // Feed data (open tasks — paginated)
  feedTasks: TaskData[];
  feedLoading: boolean;
  feedHasMore: boolean;
  loadMoreTasks: () => Promise<void>;
  refreshFeed: () => Promise<void>;

  // Admin data (all tasks, applications, users)
  allTasks: TaskData[];
  applications: any[];
  allUsers: any[];
  adminDataLoading: boolean;

  // Control
  subscribeToAdminData: () => void;
  isAdminSubscribed: boolean;
}

const DataCacheContext = createContext<DataCacheContextType>({
  feedTasks: [],
  feedLoading: true,
  feedHasMore: false,
  loadMoreTasks: async () => {},
  refreshFeed: async () => {},
  allTasks: [],
  applications: [],
  allUsers: [],
  adminDataLoading: true,
  subscribeToAdminData: () => {},
  isAdminSubscribed: false,
});

// ─── Provider ─────────────────────────────────────────────────
export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  // Feed state — paginated, NOT real-time
  const [feedTasks, setFeedTasks] = useState<TaskData[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Admin state — only subscribed on demand
  const [allTasks, setAllTasks] = useState<TaskData[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminDataLoading, setAdminDataLoading] = useState(true);
  const [isAdminSubscribed, setIsAdminSubscribed] = useState(false);
  const adminUnsubsRef = useRef<Unsubscribe[]>([]);

  // ── Feed: paginated open tasks ──────────────────────────────
  const fetchFeedPage = useCallback(async (isRefresh = false) => {
    setFeedLoading(true);
    try {
      let q;
      if (isRefresh || !lastDocRef.current) {
        q = query(
          collection(db, 'tasks'),
          where('status', '==', 'open'),
          orderBy('createdAt', 'desc'),
          limit(FEED_PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'tasks'),
          where('status', '==', 'open'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocRef.current),
          limit(FEED_PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      let tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TaskData[];

      // Final sort: Emergency > Pinned > Chronological (Chronological already handled by orderBy)
      tasks.sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      if (snapshot.docs.length > 0) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      setFeedHasMore(snapshot.docs.length === FEED_PAGE_SIZE);

      if (isRefresh) {
        setFeedTasks(tasks);
      } else {
        setFeedTasks((prev) => [...prev, ...tasks]);
      }
    } catch (error) {
      console.error('Feed fetch error:', error);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  // Initial feed load
  useEffect(() => {
    lastDocRef.current = null;
    setFeedTasks([]);
    fetchFeedPage(true);
  }, [user, fetchFeedPage]);

  const loadMoreTasks = useCallback(async () => {
    if (!feedHasMore) return;
    await fetchFeedPage(false);
  }, [feedHasMore, fetchFeedPage]);

  const refreshFeed = useCallback(async () => {
    lastDocRef.current = null;
    await fetchFeedPage(true);
  }, [fetchFeedPage]);

  // ── Admin: on-demand subscription ─────────────────────────────
  const subscribeToAdminData = useCallback(() => {
    if (isAdminSubscribed) return;
    if (profile?.role !== 'admin' && profile?.role !== 'moderator') return;

    setIsAdminSubscribed(true);

    let tasksLoaded = false;
    let appsLoaded = false;
    let usersLoaded = false;

    const checkLoaded = () => {
      if (tasksLoaded && appsLoaded && usersLoaded) {
        setAdminDataLoading(false);
      }
    };

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setAllTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TaskData[]);
      tasksLoaded = true;
      checkLoaded();
    });

    const unsubApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
      setApplications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      appsLoaded = true;
      checkLoaded();
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      usersLoaded = true;
      checkLoaded();
    });

    adminUnsubsRef.current = [unsubTasks, unsubApps, unsubUsers];
  }, [isAdminSubscribed, profile?.role]);

  // Clean up admin subscriptions when user logs out
  useEffect(() => {
    if (!user && isAdminSubscribed) {
      adminUnsubsRef.current.forEach((unsub) => unsub());
      adminUnsubsRef.current = [];
      setIsAdminSubscribed(false);
      setAllTasks([]);
      setApplications([]);
      setAllUsers([]);
      setAdminDataLoading(true);
    }
  }, [user, isAdminSubscribed]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      adminUnsubsRef.current.forEach((unsub) => unsub());
    };
  }, []);

  const value = useMemo(
    () => ({
      feedTasks,
      feedLoading,
      feedHasMore,
      loadMoreTasks,
      refreshFeed,
      allTasks,
      applications,
      allUsers,
      adminDataLoading,
      subscribeToAdminData,
      isAdminSubscribed,
    }),
    [
      feedTasks,
      feedLoading,
      feedHasMore,
      loadMoreTasks,
      refreshFeed,
      allTasks,
      applications,
      allUsers,
      adminDataLoading,
      subscribeToAdminData,
      isAdminSubscribed,
    ]
  );

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>;
}

export const useDataCache = () => useContext(DataCacheContext);
