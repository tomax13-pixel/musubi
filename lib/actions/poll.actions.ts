'use server';

import { adminDb, adminAuth } from '@/lib/firebase/adminApp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { serializeDoc } from '@/lib/utils/serialize';
import { getCurrentUserRoleAdmin } from '@/lib/actions/admin.actions';
import type { CreatePollInput, VoteResponse } from '@/lib/types/models';

/**
 * 幹事が候補日を設定してアンケートを作成する
 * circles/{circleId}/polls/{pollId}
 */
export async function createPollAdmin(
  circleId: string,
  input: CreatePollInput,
  currentUserUid: string,
) {
  const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('幹事のみアンケートを作成できます');

  const pollRef = adminDb.collection('circles').doc(circleId).collection('polls').doc();
  const now = FieldValue.serverTimestamp();

  const candidateDates = input.candidateDates.map((c) => ({
    id: c.id,
    date: Timestamp.fromDate(c.date),
    ...(c.label ? { label: c.label } : {}),
  }));

  const pollData = {
    id: pollRef.id,
    circleId,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    candidateDates,
    createdBy: currentUserUid,
    createdAt: now,
    updatedAt: now,
    status: 'open' as const,
    ...(input.deadline ? { deadline: Timestamp.fromDate(input.deadline) } : {}),
  };

  await pollRef.set(pollData);
  revalidatePath(`/circles/${circleId}`);

  const created = await pollRef.get();
  return serializeDoc({ id: created.id, ...created.data() });
}

/**
 * メンバーが各候補日に対する回答（⭕️/🔺/❌）を送信・上書きする
 * circles/{circleId}/polls/{pollId}/votes/{uid}
 */
export async function submitPollVoteAdmin(
  circleId: string,
  pollId: string,
  uid: string,
  responses: Record<string, VoteResponse>,
) {
  // 1. メンバーシップ確認（organizer も member も可）
  const role = await getCurrentUserRoleAdmin(circleId, uid);
  if (!role) throw new Error('サークルメンバーのみ回答できます');

  // 2. poll の存在・状態確認
  const pollSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('polls')
    .doc(pollId)
    .get();

  if (!pollSnap.exists) throw new Error('アンケートが見つかりません');

  const poll = pollSnap.data()!;
  if (poll.status !== 'open') throw new Error('このアンケートは締め切られています');

  if (poll.deadline) {
    const deadlineMs: number = (poll.deadline as Timestamp).toMillis();
    if (Date.now() > deadlineMs) throw new Error('回答期限を過ぎています');
  }

  // 3. ユーザー情報取得（Admin Auth）
  const userRecord = await adminAuth.getUser(uid);
  const displayName = userRecord.displayName ?? '不明なユーザー';
  const photoURL = userRecord.photoURL ?? null;

  // 4. votes/{uid} を上書きセット
  const voteRef = adminDb
    .collection('circles')
    .doc(circleId)
    .collection('polls')
    .doc(pollId)
    .collection('votes')
    .doc(uid);

  const now = FieldValue.serverTimestamp();

  await voteRef.set({
    uid,
    pollId,
    circleId,
    displayName,
    photoURL,
    responses,
    votedAt: now,
    updatedAt: now,
  });

  revalidatePath(`/circles/${circleId}`);

  const saved = await voteRef.get();
  return serializeDoc({ ...saved.data() });
}
