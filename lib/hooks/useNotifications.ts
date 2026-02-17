'use client';

import { useState, useCallback } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import { requestFCMToken } from '@/lib/firebase/messaging';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function useNotifications(uid: string | undefined) {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window)) return 'unsupported';
    return (Notification.permission as NotificationPermissionState) ?? 'default';
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      return false;
    }

    const token = await requestFCMToken();
    if (!token) {
      setPermissionState(Notification.permission as NotificationPermissionState);
      return false;
    }

    // Save FCM token to user profile
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
    });

    setPermissionState('granted');
    return true;
  }, [uid]);

  return { permissionState, requestPermission };
}
