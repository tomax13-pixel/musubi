'use server';

import { adminDb, adminAuth } from '@/lib/firebase/adminApp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { serializeDoc } from '@/lib/utils/serialize';
import { getCurrentUserRoleAdmin } from '@/lib/actions/admin.actions';
import { awardPointsWithResult, updateCircleLeaderboard } from '@/lib/actions/gamification.actions';
import type { GamificationResult } from '@/lib/types/gamification';
import { EMPTY_GAMIFICATION_RESULT } from '@/lib/types/gamification';
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

  // ゲーミフィケーション: 投票回答でポイント付与
  let gamification: GamificationResult = { ...EMPTY_GAMIFICATION_RESULT };
  try {
    gamification = await awardPointsWithResult(uid, 'poll', 3);
    await updateCircleLeaderboard(circleId, uid, gamification.pointsAwarded[0]?.points ?? 3);
  } catch (e) { /* ポイント付与失敗は無視 */ }

  revalidatePath(`/circles/${circleId}`);

  const saved = await voteRef.get();
  return { ...serializeDoc({ ...saved.data() }), gamification };
}

/**
 * サークル内の全アンケート一覧を取得（新しい順）
 */
export async function getPollsForCircle(circleId: string) {
  const snap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('polls')
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      circleId: data.circleId,
      title: data.title,
      description: data.description ?? '',
      candidateDates: (data.candidateDates ?? []).map((c: any) => ({
        id: c.id,
        date: c.date?.toDate().toISOString() ?? null,
        label: c.label ?? '',
      })),
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate().toISOString() ?? null,
      status: data.status,
      deadline: data.deadline?.toDate().toISOString() ?? null,
    };
  });
}

/**
 * アンケート詳細＋全投票結果を取得
 */
export async function getPollWithVotes(circleId: string, pollId: string) {
  // アンケート本体
  const pollSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('polls')
    .doc(pollId)
    .get();

  if (!pollSnap.exists) return null;

  const pollData = pollSnap.data()!;
  const poll = {
    id: pollSnap.id,
    circleId: pollData.circleId,
    title: pollData.title,
    description: pollData.description ?? '',
    candidateDates: (pollData.candidateDates ?? []).map((c: any) => ({
      id: c.id,
      date: c.date?.toDate().toISOString() ?? null,
      label: c.label ?? '',
    })),
    createdBy: pollData.createdBy,
    createdAt: pollData.createdAt?.toDate().toISOString() ?? null,
    updatedAt: pollData.updatedAt?.toDate().toISOString() ?? null,
    status: pollData.status,
    deadline: pollData.deadline?.toDate().toISOString() ?? null,
  };

  // 全投票結果
  const votesSnap = await adminDb
    .collection('circles')
    .doc(circleId)
    .collection('polls')
    .doc(pollId)
    .collection('votes')
    .get();

  const votes = votesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: data.uid,
      pollId: data.pollId,
      circleId: data.circleId,
      displayName: data.displayName,
      photoURL: data.photoURL ?? null,
      responses: data.responses ?? {},
      votedAt: data.votedAt?.toDate().toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate().toISOString() ?? null,
    };
  });

  return { poll, votes };
}

/**
 * 幹事がアンケートを締め切る
 */
export async function closePollAdmin(
  circleId: string,
  pollId: string,
  currentUserUid: string,
) {
  const role = await getCurrentUserRoleAdmin(circleId, currentUserUid);
  if (role !== 'organizer') throw new Error('幹事のみアンケートを締め切れます');

  const pollRef = adminDb
    .collection('circles')
    .doc(circleId)
    .collection('polls')
    .doc(pollId);

  const pollSnap = await pollRef.get();
  if (!pollSnap.exists) throw new Error('アンケートが見つかりません');

  await pollRef.update({
    status: 'closed',
    updatedAt: FieldValue.serverTimestamp(),
  });

  revalidatePath(`/circles/${circleId}`);
}
