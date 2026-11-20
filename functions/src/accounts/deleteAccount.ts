import {
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import { getAuth } from 'firebase-admin/auth';

import {
  FieldValue,
  type DocumentReference,
} from 'firebase-admin/firestore';

import {
  db,
  options,
} from '../multiplayer/firebase';

import {
  removePlayerFromRoom,
} from '../multiplayer/lifecycle';

import {
  accountDeletionRef,
} from './deletionGuard';

import {
  COLOR_CLASH_CONFIG,
} from '../color-clash/config';

import {
  DOODLE_CLASH_CONFIG,
} from '../doodle-clash/config';

import {
  WORD_CLASH_CONFIG,
} from '../word-clash/config';

import {
  handleMatchDeparture as colorDeparture,
} from '../color-clash/lifecycle';

import {
  handleDeparture as doodleDeparture,
} from '../doodle-clash/lifecycle';

import {
  handleDeparture as wordDeparture,
} from '../word-clash/lifecycle';

const GAMES = [
  {
    config: COLOR_CLASH_CONFIG,
    depart: colorDeparture,
  },
  {
    config: DOODLE_CLASH_CONFIG,
    depart: doodleDeparture,
  },
  {
    config: WORD_CLASH_CONFIG,
    depart: wordDeparture,
  },
];

const DELETED_NAME = 'Deleted Player';

const MAX_ROOMS_PER_GAME = 200;

function owns(
  value: unknown,
  key: string,
): boolean {
  return !!value &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(
      value,
      key,
    );
}

async function anonymizeRoom(
  roomRef: DocumentReference,
  uid: string,
) {
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(roomRef);

    if (!snapshot.exists) {
      return;
    }

    const room = snapshot.data()!;

    // A player must be removed using the
    // game's lifecycle handler first.

    if (owns(room.players, uid)) {
      throw new HttpsError(
        'failed-precondition',
        'Room departure is incomplete.',
      );
    }

    const updates: Record<string, unknown> = {};

    if (owns(room.playerAvatars, uid)) {
      const avatars = {
        ...room.playerAvatars,
      };

      delete avatars[uid];

      updates.playerAvatars = avatars;
    }

    if (owns(room.departedPlayers, uid)) {
      updates.departedPlayers = {
        ...room.departedPlayers,
        [uid]: {
          ...room.departedPlayers[uid],
          name: DELETED_NAME,
        },
      };
    }

    if (owns(room.sharedReactions, uid)) {
      const reactions = {
        ...room.sharedReactions,
      };

      delete reactions[uid];

      updates.sharedReactions = reactions;
    }

    if (room.departureEvent?.playerId === uid) {
      updates.departureEvent = {
        ...room.departureEvent,
        playerName: DELETED_NAME,
      };
    }

    if (room.forfeitResult?.playerId === uid) {
      updates.forfeitResult = {
        ...room.forfeitResult,
        playerName: DELETED_NAME,
      };
    }

    if (
      Array.isArray(room.results) &&
      room.results.some(
        result => result?.uid === uid,
      )
    ) {
      updates.results = room.results.map(
        result =>
          result?.uid === uid
            ? {
                ...result,
                name: DELETED_NAME,
              }
            : result,
      );
    }

    if (
      typeof room.lastAction === 'string' &&
      (
        owns(room.departedPlayers, uid) ||
        room.lastEvent?.uid === uid ||
        room.departureEvent?.playerId === uid
      )
    ) {
      updates.lastAction =
        'Player account removed.';
    }

    if (Object.keys(updates).length > 0) {
      tx.update(roomRef, updates);
    }
  });
}

async function cleanDoodleActivity(
  roomRef: DocumentReference,
  uid: string,
) {
  const ref = roomRef
    .collection('activity')
    .doc('current');

  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);

    if (!snapshot.exists) return;

    const activity = snapshot.data()!;

    const events = Array.isArray(activity.events)
      ? activity.events.filter(
          event => event?.uid !== uid,
        )
      : [];

    const lastReactionAt = {
      ...(activity.lastReactionAt ?? {}),
    };

    const changed =
      events.length !== activity.events?.length ||
      owns(lastReactionAt, uid);

    delete lastReactionAt[uid];

    if (changed) {
      tx.update(ref, {
        events,
        lastReactionAt,
      });
    }
  });
}

export const deleteGameDenAccount = onCall(
  {
    ...options,
    timeoutSeconds: 300,
  },
  async request => {
    const uid = request.auth?.uid;

    if (!uid || !request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Sign in before deleting your account.',
      );
    }

    if (request.data?.confirmation !== 'DELETE') {
      throw new HttpsError(
        'invalid-argument',
        'Account deletion confirmation is required.',
      );
    }

    const adminAuth = getAuth();

    const account = await adminAuth.getUser(uid);

    const anonymous =
      account.providerData.length === 0 &&
      !account.email &&
      !account.phoneNumber;

    const authTime =
      request.auth.token.auth_time;

    const now = Math.floor(Date.now() / 1000);

    // Registered accounts must have been
    // authenticated within the last 5 minutes.

    if (
      !anonymous &&
      (
        typeof authTime !== 'number' ||
        now - authTime > 300
      )
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Authenticate again before deleting your account.',
      );
    }

    const deletionRef =
      accountDeletionRef(uid);

    // Development-scale safety limit.
    // Check before locking the account.

    for (const game of GAMES) {
      const rooms = await db
        .collection(game.config.roomCollection)
        .limit(MAX_ROOMS_PER_GAME + 1)
        .get();

      if (rooms.size > MAX_ROOMS_PER_GAME) {
        throw new HttpsError(
          'resource-exhausted',
          'Account cleanup exceeds the current processing limit.',
        );
      }
    }

    await db.runTransaction(async tx => {
      const marker = await tx.get(deletionRef);

      if (!marker.exists) {
        tx.set(deletionRef, {
          status: 'pending',
          requestedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    try {
      for (const game of GAMES) {
        const rooms = await db
          .collection(game.config.roomCollection)
          .get();

        for (const snapshot of rooms.docs) {
          const room = snapshot.data();

          if (owns(room.players, uid)) {
            await removePlayerFromRoom(
              snapshot.ref,
              db
                .collection(
                  game.config.secretCollection,
                )
                .doc(snapshot.id),
              uid,
              uid,
              false,
              game.depart,
            );
          }

          await anonymizeRoom(
            snapshot.ref,
            uid,
          );

          if (
            game.config.roomCollection ===
            'doodleClashRooms'
          ) {
            await cleanDoodleActivity(
              snapshot.ref,
              uid,
            );
          }

          await snapshot.ref
            .collection('presence')
            .doc(uid)
            .delete();

          if (
            game.config.roomCollection ===
            'colorClashRooms'
          ) {
            await snapshot.ref
              .collection('hands')
              .doc(uid)
              .delete();
          }
        }
      }

      // Delete the player profile only after
      // all known room cleanup succeeds.

      await db.recursiveDelete(
        db.collection('users').doc(uid),
      );

      // Keep this marker to prevent stale
      // credentials from recreating the profile.

      await deletionRef.set(
        {
          status: 'data-cleaned',
          cleanedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Authentication deletion must be last.
      await adminAuth.deleteUser(uid);

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        'GameDen account deletion failed:',
        error,
      );

      await deletionRef.set(
        {
          lastFailureAt:
            FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      throw new HttpsError(
        'internal',
        'Account cleanup was interrupted. Please retry deletion.',
      );
    }
  },
);
