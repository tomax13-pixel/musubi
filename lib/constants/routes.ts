export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CIRCLES: '/circles',
  CIRCLE: (id: string) => `/circles/${id}`,
  EVENTS: (circleId: string) => `/circles/${circleId}/events`,
  EVENT: (circleId: string, eventId: string) => `/circles/${circleId}/events/${eventId}`,
  ATTENDANCE: (circleId: string, eventId: string) => `/circles/${circleId}/events/${eventId}/attendance`,
  PAYMENTS: (circleId: string, eventId: string) => `/circles/${circleId}/events/${eventId}/payments`,
  GUESTS: (circleId: string) => `/circles/${circleId}/guests`,
  MEMBERS: (circleId: string) => `/circles/${circleId}/members`,
} as const;
