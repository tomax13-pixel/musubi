import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminMessaging } from '@/lib/firebase/adminApp';
import { FieldValue } from 'firebase-admin/firestore';

interface SendNotificationBody {
  recipientUid: string;
  title: string;
  body: string;
  circleId: string;
  eventId: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify auth token
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let senderUid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    senderUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await req.json() as SendNotificationBody;
  const { recipientUid, title, body: notifBody, circleId, eventId } = body;

  // Verify sender is organizer
  const memberDoc = await adminDb
    .doc(`circles/${circleId}/members/${senderUid}`)
    .get();

  if (!memberDoc.exists || memberDoc.data()?.role !== 'organizer') {
    return NextResponse.json({ error: 'Forbidden: must be organizer' }, { status: 403 });
  }

  // Get recipient FCM tokens
  const userDoc = await adminDb.doc(`users/${recipientUid}`).get();
  const fcmTokens: string[] = userDoc.data()?.fcmTokens ?? [];

  if (fcmTokens.length === 0) {
    return NextResponse.json(
      { error: 'No FCM tokens found for recipient' },
      { status: 404 }
    );
  }

  let success = true;
  let errorMsg: string | undefined;

  try {
    const response = await adminMessaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body: notifBody },
      data: { circleId, eventId },
      webpush: {
        notification: {
          title,
          body: notifBody,
          icon: '/icon-192.svg',
        },
        fcmOptions: { link: `/circles/${circleId}/events/${eventId}/payments` },
      },
    });

    // Clean up invalid tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((r, idx) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        const token = fcmTokens[idx];
        if (token) invalidTokens.push(token);
      }
    });

    if (invalidTokens.length > 0) {
      const { FieldValue: FV } = await import('firebase-admin/firestore');
      await adminDb.doc(`users/${recipientUid}`).update({
        fcmTokens: FV.arrayRemove(...invalidTokens),
      });
    }
  } catch (err) {
    success = false;
    errorMsg = String(err);
  }

  // Log notification
  await adminDb.collection('notificationLogs').add({
    circleId,
    eventId,
    recipientUid,
    type: 'payment_reminder',
    sentAt: FieldValue.serverTimestamp(),
    sentBy: senderUid,
    title,
    body: notifBody,
    success,
    ...(errorMsg ? { error: errorMsg } : {}),
  });

  if (!success) {
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
