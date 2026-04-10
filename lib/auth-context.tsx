'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────
export type UserRole = 'user' | 'moderator' | 'admin' | 'PRIME_ADMIN';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  isImmutable?: boolean;
  isVerifiedCarrier: boolean;
  verification?: {
    status: 'pending' | 'approved' | 'rejected';
    documentURL?: string;
    submittedAt?: any;
    reviewedAt?: any;
  };
  createdAt: any;
  lastLoginAt: any;
  bannedUntil?: any;
  banReason?: string;
  isPermanentlyBanned?: boolean;

  // Gamification & Reliability
  completedTasks?: number;
  acceptedTasks?: number;
  cancelledTasks?: number;
  lateTasks?: number;
  lowRatingTasks?: number;
  averageRating?: number;
  accuracyScore?: number;
  level?: string; // Kept for backwards compatibility 
  
  // Reputation & Tier System Data (Source of Truth)
  adminOverride?: {
    tier: string;
    expiresAt: string | null;
    reason: string;
  } | null;
  ban?: {
    status: 'NONE' | 'TEMP' | 'PERM';
    expiresAt: string | null;
    reason: string;
  } | null;
  
  // Cached State Values (Calculated by Cloud Functions, safe to rely on for UI)
  systemTier?: string;
  finalTier?: string;
  
  // Aggregate stats
  activeBidsCount?: number;
  completedTasksCount?: number;
  followingCount?: number;
  savedCount?: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
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
      return ''; // silent
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    default:
      return 'Something went wrong during sign-in. Please try again.';
  }
}

async function upsertUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const docRef = doc(db, 'users', firebaseUser.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // Existing user — update last login + any changed info
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
      role: 'user',
      isVerifiedCarrier: false,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      // Init gamification
      completedTasks: 0,
      acceptedTasks: 0,
      cancelledTasks: 0,
      lateTasks: 0,
      lowRatingTasks: 0,
      accuracyScore: 0,
      level: 'NEW_USER',
      systemTier: 'NEW_USER',
      finalTier: 'NEW_USER',
      ban: { status: 'NONE', expiresAt: null, reason: '' },
      adminOverride: null,
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

  // Real-time profile listener — keeps profile in sync if admin updates role/verification
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

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success(`Welcome back, ${result.user.displayName || 'User'}!`);
    } catch (error: any) {
      const msg = friendlyAuthError(error.code || '');
      if (msg) {
        setAuthError(msg);
        toast.error(msg);
      }
      console.error('Email sign-in error:', error);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name on the Firebase auth user
      await updateProfile(result.user, { displayName });
      toast.success(`Welcome to PocketPost, ${displayName}! 🎉`);
    } catch (error: any) {
      const msg = friendlyAuthError(error.code || '');
      if (msg) {
        setAuthError(msg);
        toast.error(msg);
      }
      console.error('Email sign-up error:', error);
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
        signInWithEmail,
        signUpWithEmail,
        signOut: handleSignOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
