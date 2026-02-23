import { Timestamp } from 'firebase/firestore';

// =====================
// Role & Status Types
// =====================

export type CircleRole = 'organizer' | 'member';

export type PaymentStatus = 'unpaid' | 'pending_confirmation' | 'confirmed';

// =====================
// Firestore Documents
// =====================

/** users/{uid} */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  fcmTokens: string[];
  faculty?: string;
  grade?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** circles/{circleId} */
export interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** circles/{circleId}/members/{uid} */
export interface CircleMember {
  uid: string;
  role: CircleRole;
  joinedAt: Timestamp;
  displayName: string;
  email: string;
  photoURL: string | null;
}

/** circles/{circleId}/events/{eventId} */
export interface Event {
  id: string;
  circleId: string;
  name: string;
  description: string;
  date: Timestamp;
  location: string;
  fee: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** circles/{circleId}/events/{eventId}/attendance/{uid|guestId} */
export interface AttendanceRecord {
  id: string;
  eventId: string;
  circleId: string;
  isGuest: boolean;
  uid?: string;
  guestId?: string;
  attended: boolean;
  checkedInAt: Timestamp | null;
  checkedInBy: string;
  displayName: string;
  email?: string;
  photoURL?: string | null;
}

/** circles/{circleId}/events/{eventId}/payments/{uid|guestId} */
export interface PaymentRecord {
  id: string;
  eventId: string;
  circleId: string;
  isGuest: boolean;
  uid?: string;
  guestId?: string;
  amount: number;
  status: PaymentStatus;
  markedPaidAt: Timestamp | null;
  markedPaidBy?: string;
  confirmedAt: Timestamp | null;
  confirmedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  displayName: string;
  email?: string;
}

/** circles/{circleId}/guests/{guestId} */
export interface Guest {
  id: string;
  circleId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  notes?: string;
  addedBy: string;
  addedAt: Timestamp;
  isActive: boolean;
}

/** notificationLogs/{logId} */
export interface NotificationLog {
  id: string;
  circleId: string;
  eventId: string;
  recipientUid: string;
  type: 'event_created' | 'payment_reminder' | 'attendance_reminder';
  sentAt: Timestamp;
  sentBy: string;
  title: string;
  body: string;
  success: boolean;
  error?: string;
}

// =====================
// Form Input Types
// =====================

export interface CreateCircleInput {
  name: string;
  emoji: string;
  description: string;
}

export interface CreateEventInput {
  name: string;
  description: string;
  date: Date;
  location: string;
  fee: number;
}

export interface AddGuestInput {
  name: string;
  email?: string;
  phoneNumber?: string;
  notes?: string;
}

export interface SendReminderInput {
  recipientUid: string;
  circleId: string;
  eventId: string;
  eventName: string;
  amount: number;
}

// =====================
// Poll (スマート日程調整)
// =====================

/** ⭕️ ok / 🔺 maybe / ❌ ng */
export type VoteResponse = 'ok' | 'maybe' | 'ng';

/** circles/{circleId}/polls/{pollId} の candidateDates 要素 */
export interface PollCandidateDate {
  id: string;
  date: Timestamp;
  label?: string;
}

/** circles/{circleId}/polls/{pollId} */
export interface Poll {
  id: string;
  circleId: string;
  title: string;
  description?: string;
  candidateDates: PollCandidateDate[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'open' | 'closed';
  deadline?: Timestamp;
}

/** circles/{circleId}/polls/{pollId}/votes/{uid} */
export interface PollVote {
  uid: string;
  pollId: string;
  circleId: string;
  displayName: string;
  photoURL: string | null;
  responses: Record<string, VoteResponse>;
  votedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePollInput {
  title: string;
  description?: string;
  candidateDates: Array<{ id: string; date: Date; label?: string }>;
  deadline?: Date;
}
