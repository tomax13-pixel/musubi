'use client';

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import app from './clientApp';

let messaging: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  const { isSupported } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) return null;

  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

export async function requestFCMToken(): Promise<string | null> {
  const m = await getFirebaseMessaging();
  if (!m) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('VAPID key is not configured');
    return null;
  }

  try {
    // Ensure service worker is registered
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: registration });
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

export { onMessage, getMessaging };
