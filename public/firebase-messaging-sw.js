// Firebase Cloud Messaging Service Worker
// This file must be at the root of the public directory

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config will be injected via the main app's messaging setup
// This service worker must have the same Firebase config as the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title ?? '結（むすび）';
      const notificationOptions = {
        body: payload.notification?.body ?? '',
        icon: '/icon-192.svg',
        data: payload.data,
        actions: [
          { action: 'view', title: '確認する' },
        ],
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  if (data?.circleId && data?.eventId) {
    url = `/circles/${data.circleId}/events/${data.eventId}/payments`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(url);
          }
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
