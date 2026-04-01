'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────
export type UserRole = 'requester' | 'carrier' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  status: 'pending' | 'verified' | 'rejected';
  carrierId?: string;
  rating?: number;
  completedDeliveries?: number;
  createdAt: any;
  lastLoginAt: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  clearError: () => {},
});

// ─── Helpers ──────────────────────────────────────────────────
function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/cancelled-popup-request':
      return ''; // silent — happens when user clicks multiple times
    default:
      return 'Something went wrong during sign-in. Please try again.';
  }
}

async function upsertUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const docRef = doc(db, 'users', firebaseUser.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // Existing user — update last login + any changed Google info
    const existing = docSnap.data() as UserProfile;
    const updates: Partial<UserProfile> = {
      lastLoginAt: serverTimestamp(),
      displayName: firebaseUser.displayName || existing.displayName,
      email: firebaseUser.email || existing.email,
      photoURL: firebaseUser.photoURL || existing.photoURL,
    };
    await setDoc(docRef, updates, { merge: true });
    return { ...existing, ...updates };
  } else {
    // New user — create profile
    const newProfile: UserProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || '',
      role: 'requester',
      status: 'pending',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(docRef, newProfile);
    return newProfile;
  }
}

// ─── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Real-time profile listener — keeps profile in sync if admin updates role/status
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (error) => {
        console.error('Profile snapshot error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const userProfile = await upsertUserProfile(firebaseUser);
          setProfile(userProfile);
        } catch (error) {
          console.error('Error fetching/creating profile:', error);
          toast.error('Failed to load your profile. Please try again.');
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle redirect result (for mobile browsers where popup may not work)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          toast.success(`Welcome back, ${result.user.displayName || 'User'}!`);
        }
      })
      .catch((error) => {
        if (error.code && error.code !== 'auth/cancelled-popup-request') {
          const msg = friendlyAuthError(error.code);
          if (msg) {
            setAuthError(msg);
            toast.error(msg);
          }
        }
      });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const isNew = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      toast.success(
        isNew
          ? `Welcome to PocketPost, ${result.user.displayName}! 🎉`
          : `Welcome back, ${result.user.displayName}!`
      );
    } catch (error: any) {
      // If popup fails (e.g. mobile), fall back to redirect
      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error('Redirect sign-in also failed:', redirectError);
        }
      }

      const msg = friendlyAuthError(error.code || '');
      if (msg) {
        setAuthError(msg);
        toast.error(msg);
      }
      console.error('Sign-in error:', error);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
      setProfile(null);
      toast.success('Signed out successfully.');
    } catch (error) {
      console.error('Sign-out error:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        signInWithGoogle,
        signOut: handleSignOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
