'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase/clientApp';

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState & {
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await syncUserProfile(firebaseUser);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await firebaseSignOut(auth);
  }, []);

  return { user, loading, signInWithGoogle, signOut };
}

async function syncUserProfile(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '名前未設定',
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
