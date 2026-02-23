// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase設定（Service Workerは環境変数を参照できないため直接記述）
firebase.initializeApp({
  apiKey: "AIzaSyD8yV8dGkiVy5oWHcFYUHH-IFrM9lD_aPY",
  authDomain: "musubi-97f1c.firebaseapp.com",
  projectId: "musubi-97f1c",
  storageBucket: "musubi-97f1c.firebasestorage.app",
  messagingSenderId: "297616416618",
  appId: "1:297616416618:web:e6949301b982341ce2cf13",
});

const messaging = firebase.messaging();

// バックグラウンド受信時の処理
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title ?? '結（むすび）';
  const data = payload.data ?? {};

  // 通知タイプによってリンク先を変える
  let link = '/';
  const type = data.type ?? '';
  const circleId = data.circleId ?? '';
  const eventId = data.eventId ?? '';

  if (type === 'payment_reminder' && circleId && eventId) {
    link = `/circles/${circleId}/events/${eventId}/payments`;
  } else if (type === 'attendance_reminder' && circleId && eventId) {
    link = `/circles/${circleId}/events/${eventId}/attendance`;
  } else if (type === 'event_created' && circleId) {
    link = `/circles/${circleId}`;
  }

  self.registration.showNotification(notificationTitle, {
    body: payload.notification?.body ?? '',
    icon: '/icon-192.svg',
    data: { link, ...data },
  });
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.link ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
