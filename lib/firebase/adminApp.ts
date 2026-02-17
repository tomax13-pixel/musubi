import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

let adminApp: App;

if (getApps().length === 0) {
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
} else {
  adminApp = getApps()[0]!;
}

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminMessaging = getMessaging(adminApp);

export default adminApp;
