import { getSupabase } from './supabase';
import { judgeSubmission } from './judge0';
import { broadcastToClient, sendErrorToClient } from './connection';
import {
  MatchFoundMessage,
  BattleJoinedMessage,
  SubmissionResultMessage,
  OpponentSubmittedMessage,
  BattleEndedMessage,
  Language,
} from '../types';

interface BattleParticipant {
  userId: string;
  username: string;
  clientId: string | null; // current live WS connection in the room (updated on join_battle)
  finished: boolean;
}

interface BattleRoom {
  battleId: string;
  problemId: string;
  problemSlug: string;
  participants: BattleParticipant[];
  ended: boolean;
}

/** battleId → in-memory room state. Lives only while the battle is active. */
const activeRooms = new Map<string, BattleRoom>();

const ELO_K = 32;

function computeElo(winnerRating: number, loserRating: number) {
  const expWin = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  const expLose = 1 / (1 + 10 ** ((winnerRating - loserRating) / 400));
  const newWinner = Math.round(winnerRating + ELO_K * (1 - expWin));
  const newLoser = Math.round(loserRating + ELO_K * (0 - expLose));
  return { newWinner, newLoser };
}

interface MatchUser {
  clientId: string;
  userId: string;
  username: string;
}

/**
 * Called when matchmaking pairs two users. Creates the battle + participants in
 * the DB, registers the room in memory, and notifies both clients with the
 * battleId (which doubles as the room id they navigate to).
 */
export async function createBattleAndNotify(a: MatchUser, b: MatchUser): Promise<void> {
  try {
    const supabase = getSupabase();

    // 1. Pick a random active problem
    const { data: problems, error: problemErr } = await supabase
      .from('problems')
      .select('id, slug')
      .eq('is_active', true);

    if (problemErr || !problems || problems.length === 0) {
      console.error('[Battle] No active problems to start a battle:', problemErr?.message);
      sendErrorToClient(a.clientId, 'No problems available', 'NO_PROBLEMS');
      sendErrorToClient(b.clientId, 'No problems available', 'NO_PROBLEMS');
      return;
    }

    const problem = problems[Math.floor(Math.random() * problems.length)] as { id: string; slug: string };

    // 2. Create the battle row
    const { data: battle, error: battleErr } = await supabase
      .from('battles')
      .insert({ problem_id: problem.id, status: 'ACTIVE', started_at: new Date().toISOString() })
      .select('id')
      .single();

    if (battleErr || !battle) {
      console.error('[Battle] Failed to create battle:', battleErr?.message);
      sendErrorToClient(a.clientId, 'Failed to create battle', 'BATTLE_CREATE_FAILED');
      sendErrorToClient(b.clientId, 'Failed to create battle', 'BATTLE_CREATE_FAILED');
      return;
    }

    const battleId = (battle as { id: string }).id;

    // 3. Create participant rows
    const { error: partErr } = await supabase.from('battle_participants').insert([
      { battle_id: battleId, user_id: a.userId, is_ready: true },
      { battle_id: battleId, user_id: b.userId, is_ready: true },
    ]);

    if (partErr) {
      console.error('[Battle] Failed to create participants:', partErr.message);
    }

    // 4. Register the in-memory room
    activeRooms.set(battleId, {
      battleId,
      problemId: problem.id,
      problemSlug: problem.slug,
      participants: [
        { userId: a.userId, username: a.username, clientId: a.clientId, finished: false },
        { userId: b.userId, username: b.username, clientId: b.clientId, finished: false },
      ],
      ended: false,
    });

    // 5. Notify both players — battleId is the room id they navigate to
    const now = Date.now();
    const forA: MatchFoundMessage = {
      type: 'match_found',
      payload: { battleRoomId: battleId, opponent: { userId: b.userId, username: b.username } },
      timestamp: now,
    };
    const forB: MatchFoundMessage = {
      type: 'match_found',
      payload: { battleRoomId: battleId, opponent: { userId: a.userId, username: a.username } },
      timestamp: now,
    };
    broadcastToClient(a.clientId, forA);
    broadcastToClient(b.clientId, forB);

    console.log(`[Battle] Created ${battleId} on "${problem.slug}" | ${a.username} vs ${b.username}`);
  } catch (err) {
    console.error('[Battle] createBattleAndNotify error:', err);
  }
}

/**
 * Rebuilds room state from the DB when it's not in memory (e.g. page refresh,
 * or a fresh WS connection after navigating from matchmaking to the room).
 */
async function rebuildRoomFromDb(battleId: string): Promise<BattleRoom | null> {
  const supabase = getSupabase();

  const { data: battle } = await supabase
    .from('battles')
    .select('id, status, problem_id')
    .eq('id', battleId)
    .maybeSingle();

  if (!battle) return null;
  const b = battle as { id: string; status: string; problem_id: string };

  const { data: problem } = await supabase
    .from('problems')
    .select('slug')
    .eq('id', b.problem_id)
    .maybeSingle();

  const { data: parts } = await supabase
    .from('battle_participants')
    .select('user_id, finish_position')
    .eq('battle_id', battleId);

  if (!parts || parts.length === 0) return null;

  const userIds = (parts as { user_id: string; finish_position: number | null }[]).map((p) => p.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
  const profileMap = new Map(
    ((profiles as { id: string; username: string }[]) ?? []).map((p) => [p.id, p.username]),
  );

  const room: BattleRoom = {
    battleId,
    problemId: b.problem_id,
    problemSlug: (problem as { slug: string } | null)?.slug ?? '',
    participants: (parts as { user_id: string; finish_position: number | null }[]).map((p) => ({
      userId: p.user_id,
      username: profileMap.get(p.user_id) ?? 'Player',
      clientId: null,
      finished: p.finish_position != null,
    })),
    ended: b.status === 'ENDED',
  };

  activeRooms.set(battleId, room);
  return room;
}

async function getRoom(battleId: string): Promise<BattleRoom | null> {
  return activeRooms.get(battleId) ?? (await rebuildRoomFromDb(battleId));
}

/** Registers a client's live connection with a battle room and confirms join. */
export async function handleJoinBattle(
  clientId: string,
  payload: { battleId: string; userId: string; username: string },
): Promise<void> {
  try {
    const room = await getRoom(payload.battleId);
    if (!room) {
      sendErrorToClient(clientId, 'Battle not found', 'BATTLE_NOT_FOUND');
      return;
    }

    const self = room.participants.find((p) => p.userId === payload.userId);
    if (!self) {
      sendErrorToClient(clientId, 'You are not a participant in this battle', 'NOT_PARTICIPANT');
      return;
    }

    self.clientId = clientId; // bind this connection to the participant
    const opponent = room.participants.find((p) => p.userId !== payload.userId) ?? null;

    const message: BattleJoinedMessage = {
      type: 'battle_joined',
      payload: {
        battleId: room.battleId,
        status: room.ended ? 'ENDED' : 'ACTIVE',
        opponent: opponent ? { userId: opponent.userId, username: opponent.username } : null,
      },
      timestamp: Date.now(),
    };
    broadcastToClient(clientId, message);
  } catch (err) {
    console.error('[Battle] handleJoinBattle error:', err);
    sendErrorToClient(clientId, 'Failed to join battle', 'JOIN_FAILED');
  }
}

/** Judges a battle submission, persists it, and finalizes the battle on first ACCEPTED. */
export async function handleBattleSubmit(
  clientId: string,
  payload: { battleId: string; userId: string; problemId: string; code: string; language: Language },
): Promise<void> {
  const logPrefix = `[Battle][${payload.battleId}][${payload.userId}]`;
  try {
    console.log(`${logPrefix} handleBattleSubmit start | problem=${payload.problemId} lang=${payload.language} codeLen=${payload.code.length}`);

    const supabase = getSupabase();

    const room = await getRoom(payload.battleId);
    if (!room) {
      console.warn(`${logPrefix} Rejected — room not found (checked memory + DB)`);
      sendErrorToClient(clientId, 'Battle not found', 'BATTLE_NOT_FOUND');
      return;
    }
    if (room.ended) {
      console.warn(`${logPrefix} Rejected — battle already ended`);
      sendErrorToClient(clientId, 'This battle has already ended', 'BATTLE_ENDED');
      return;
    }

    // Fetch private test cases (server has service-role access).
    // `visibility` is needed so the judge knows whether stderr is safe to echo back.
    const { data: testcases, error: tcErr } = await supabase
      .from('problem_test_cases')
      .select('input, expected_output, visibility')
      .eq('problem_id', payload.problemId)
      .order('order_index', { ascending: true });

    if (tcErr || !testcases) {
      console.error(`${logPrefix} Failed to load test cases:`, tcErr?.message);
      sendErrorToClient(clientId, 'Failed to load test cases', 'TESTCASE_LOAD_FAILED');
      return;
    }

    console.log(`${logPrefix} Loaded ${testcases.length} test case(s), judging...`);

    const result = await judgeSubmission(
      payload.code,
      payload.language,
      (testcases as { input: string; expected_output: string; visibility: 'PUBLIC' | 'PRIVATE' }[]).map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expected_output,
        visibility: tc.visibility,
      })),
    );

    console.log(`${logPrefix} Verdict: ${result.verdict} (${result.passedTestcases}/${result.totalTestcases}) status="${result.statusDescription}" failedTest=${result.failedTestcase ?? '-'} time=${result.runtimeMs}ms mem=${result.memoryKb}kb`);

    // Persist the submission
    const { error: insertErr } = await supabase.from('submissions').insert({
      battle_id: payload.battleId,
      user_id: payload.userId,
      problem_id: payload.problemId,
      source_code: payload.code,
      language: payload.language,
      verdict: result.verdict,
      runtime_ms: result.runtimeMs,
      memory_kb: result.memoryKb,
      passed_testcases: result.passedTestcases,
      total_testcases: result.totalTestcases,
    });

    if (insertErr) {
      console.error(`${logPrefix} Failed to persist submission:`, insertErr.message);
    } else {
      console.log(`${logPrefix} Submission persisted`);
    }

    // Tell the submitter their verdict, with the failure detail from Judge0.
    const resultMessage: SubmissionResultMessage = {
      type: 'submission_result',
      payload: {
        verdict: result.verdict,
        passedTestcases: result.passedTestcases,
        totalTestcases: result.totalTestcases,
        runtimeMs: result.runtimeMs,
        memoryKb: result.memoryKb,
        statusDescription: result.statusDescription,
        compileOutput: result.compileOutput,
        stderr: result.stderr,
        failedTestcase: result.failedTestcase,
      },
      timestamp: Date.now(),
    };
    broadcastToClient(clientId, resultMessage);

    // Notify the opponent that this player submitted (verdict only — never their error detail)
    const self = room.participants.find((p) => p.userId === payload.userId);
    const opponent = room.participants.find((p) => p.userId !== payload.userId);
    if (opponent?.clientId) {
      const notify: OpponentSubmittedMessage = {
        type: 'opponent_submitted',
        payload: { username: self?.username ?? 'Opponent', verdict: result.verdict },
        timestamp: Date.now(),
      };
      broadcastToClient(opponent.clientId, notify);
    }

    // First correct solution wins. Guard is synchronous → no double-finalize.
    if (result.verdict === 'ACCEPTED' && !room.ended) {
      room.ended = true;
      await finalizeBattle(room, payload.userId);
    }
  } catch (err) {
    console.error(`${logPrefix} handleBattleSubmit error:`, err);
    sendErrorToClient(clientId, 'Submission failed', 'SUBMIT_FAILED');
  }
}

async function finalizeBattle(room: BattleRoom, winnerId: string): Promise<void> {
  const supabase = getSupabase();
  const winner = room.participants.find((p) => p.userId === winnerId)!;
  const loser = room.participants.find((p) => p.userId !== winnerId)!;
  const now = new Date().toISOString();

  // Fetch current ratings + counts
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, rating, wins, losses, battles_played')
    .in('id', [winner.userId, loser.userId]);

  type ProfileRow = { id: string; rating: number; wins: number; losses: number; battles_played: number };
  const rows = (profiles as ProfileRow[]) ?? [];
  const winnerProfile = rows.find((r) => r.id === winner.userId);
  const loserProfile = rows.find((r) => r.id === loser.userId);

  const winnerRating = winnerProfile?.rating ?? 1000;
  const loserRating = loserProfile?.rating ?? 1000;
  const { newWinner, newLoser } = computeElo(winnerRating, loserRating);

  // Close out the battle
  await supabase.from('battles').update({ status: 'ENDED', ended_at: now }).eq('id', room.battleId);

  await supabase
    .from('battle_participants')
    .update({ finish_position: 1, solved_at: now })
    .eq('battle_id', room.battleId)
    .eq('user_id', winner.userId);

  await supabase
    .from('battle_participants')
    .update({ finish_position: 2 })
    .eq('battle_id', room.battleId)
    .eq('user_id', loser.userId);

  // Update profiles
  await supabase
    .from('profiles')
    .update({
      rating: newWinner,
      wins: (winnerProfile?.wins ?? 0) + 1,
      battles_played: (winnerProfile?.battles_played ?? 0) + 1,
    })
    .eq('id', winner.userId);

  await supabase
    .from('profiles')
    .update({
      rating: newLoser,
      losses: (loserProfile?.losses ?? 0) + 1,
      battles_played: (loserProfile?.battles_played ?? 0) + 1,
    })
    .eq('id', loser.userId);

  // Rating history
  await supabase.from('ratings_history').insert([
    { user_id: winner.userId, battle_id: room.battleId, old_rating: winnerRating, new_rating: newWinner, rating_change: newWinner - winnerRating },
    { user_id: loser.userId, battle_id: room.battleId, old_rating: loserRating, new_rating: newLoser, rating_change: newLoser - loserRating },
  ]);

  // Notify both players (outcome relative to recipient)
  const ts = Date.now();
  if (winner.clientId) {
    const msg: BattleEndedMessage = {
      type: 'battle_ended',
      payload: { winnerId: winner.userId, winnerUsername: winner.username, outcome: 'WIN', ratingChange: newWinner - winnerRating, newRating: newWinner },
      timestamp: ts,
    };
    broadcastToClient(winner.clientId, msg);
  }
  if (loser.clientId) {
    const msg: BattleEndedMessage = {
      type: 'battle_ended',
      payload: { winnerId: winner.userId, winnerUsername: winner.username, outcome: 'LOSS', ratingChange: newLoser - loserRating, newRating: newLoser },
      timestamp: ts,
    };
    broadcastToClient(loser.clientId, msg);
  }

  console.log(`[Battle] Ended ${room.battleId} | Winner: ${winner.username} (${winnerRating}→${newWinner})`);

  activeRooms.delete(room.battleId);
}
