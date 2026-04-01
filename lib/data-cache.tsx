'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth-context';
import { RequestData } from '@/components/request-card';

// ─── Types ────────────────────────────────────────────────────
interface DataCacheContextType {
  // Feed data (approved requests)
  feedRequests: RequestData[];
  feedLoading: boolean;

  // Admin data (all requests, applications, users)
  allRequests: RequestData[];
  applications: any[];
  allUsers: any[];
  adminDataLoading: boolean;

  // Control
  subscribeToAdminData: () => void;
  isAdminSubscribed: boolean;
}

const DataCacheContext = createContext<DataCacheContextType>({
  feedRequests: [],
  feedLoading: true,
  allRequests: [],
  applications: [],
  allUsers: [],
  adminDataLoading: true,
  subscribeToAdminData: () => {},
  isAdminSubscribed: false,
});

// ─── Provider ─────────────────────────────────────────────────
export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  // Feed state — subscribed for all authenticated users
  const [feedRequests, setFeedRequests] = useState<RequestData[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const feedUnsubRef = useRef<Unsubscribe | null>(null);

  // Admin state — only subscribed on demand (when admin navigates there)
  const [allRequests, setAllRequests] = useState<RequestData[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminDataLoading, setAdminDataLoading] = useState(true);
  const [isAdminSubscribed, setIsAdminSubscribed] = useState(false);
  const adminUnsubsRef = useRef<Unsubscribe[]>([]);

  // ── Feed: approved requests (lightweight, always-on for logged-in users) ──
  useEffect(() => {
    // Clean up previous subscription
    if (feedUnsubRef.current) {
      feedUnsubRef.current();
      feedUnsubRef.current = null;
    }

    if (!user) {
      setFeedRequests([]);
      setFeedLoading(false);
      return;
    }

    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setFeedRequests(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RequestData[]
      );
      setFeedLoading(false);
    }, (error) => {
      console.error('Feed snapshot error:', error);
      setFeedLoading(false);
    });

    feedUnsubRef.current = unsub;

    return () => {
      unsub();
      feedUnsubRef.current = null;
    };
  }, [user]);

  // ── Admin: on-demand subscription ─────────────────────────────
  const subscribeToAdminData = useCallback(() => {
    if (isAdminSubscribed) return; // Already active
    if (profile?.role !== 'admin') return; // Not authorized

    setIsAdminSubscribed(true);

    let requestsLoaded = false;
    let appsLoaded = false;
    let usersLoaded = false;

    const checkLoaded = () => {
      if (requestsLoaded && appsLoaded && usersLoaded) {
        setAdminDataLoading(false);
      }
    };

    const unsubRequests = onSnapshot(collection(db, 'requests'), (snapshot) => {
      setAllRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RequestData[]);
      requestsLoaded = true;
      checkLoaded();
    });

    const unsubApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      appsLoaded = true;
      checkLoaded();
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      usersLoaded = true;
      checkLoaded();
    });

    adminUnsubsRef.current = [unsubRequests, unsubApps, unsubUsers];
  }, [isAdminSubscribed, profile?.role]);

  // Clean up admin subscriptions when user logs out
  useEffect(() => {
    if (!user && isAdminSubscribed) {
      adminUnsubsRef.current.forEach(unsub => unsub());
      adminUnsubsRef.current = [];
      setIsAdminSubscribed(false);
      setAllRequests([]);
      setApplications([]);
      setAllUsers([]);
      setAdminDataLoading(true);
    }
  }, [user, isAdminSubscribed]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      adminUnsubsRef.current.forEach(unsub => unsub());
    };
  }, []);

  const value = useMemo(() => ({
    feedRequests,
    feedLoading,
    allRequests,
    applications,
    allUsers,
    adminDataLoading,
    subscribeToAdminData,
    isAdminSubscribed,
  }), [
    feedRequests, feedLoading,
    allRequests, applications, allUsers, adminDataLoading,
    subscribeToAdminData, isAdminSubscribed,
  ]);

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export const useDataCache = () => useContext(DataCacheContext);
