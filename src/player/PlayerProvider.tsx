import {
  signOutPlayer,
  deletePlayerAccount,
} from './accountService';
import {
  signInWithGoogle,
  upgradeGuestWithGoogle,
  googleAuthError,
} from './googleAuth';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';

import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type User,
} from 'firebase/auth';

import {
  doc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';

import { AVATARS } from './avatars';

export { AVATARS } from './avatars';

export type PlayerProfile = {
  nickname: string;
  avatar: string;
};

type PlayerContextValue = {
  user: User | null;
  uid: string | null;
  profile: PlayerProfile | null;
  ready: boolean;
  busy: boolean;
  isGuest: boolean;
  error: string;
  continueAsGuest: () => Promise<User>;
  continueWithGoogle: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  saveProfile: (
    nickname: string,
    avatar: string,
  ) => Promise<void>;
  reloadProfile: () => Promise<void>;
  logout: (abandonGuest?: boolean) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const PlayerContext =
  createContext<PlayerContextValue | null>(null);

export function PlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<PlayerProfile | null>(null);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generation = useRef(0);

  async function loadProfile(current: User | null) {
    const request = ++generation.current;

    setReady(false);
    setError('');
    setUser(current);
    setProfile(null);

    try {
      if (!current) return;

      try {
        // Validate the restored Firebase session.
        await current.getIdToken(true);
      } catch (reason) {
        const code =
          (reason as { code?: string })?.code;

        const invalid = [
          'auth/invalid-refresh-token',
          'auth/user-token-expired',
          'auth/user-not-found',
          'auth/invalid-user-token',
          'auth/user-disabled',
        ].includes(code ?? '');

        if (
          request !== generation.current
        ) {
          return;
        }

        if (invalid) {
          // Only discard an invalid authentication
          // session, never a temporary network failure.
          if (auth.currentUser?.uid === current.uid) {
            await signOut(auth);
          }

          return;
        }

        throw reason;
      }

      if (
        request !== generation.current ||
        auth.currentUser?.uid !== current.uid
      ) {
        return;
      }

      const snapshot = await getDocFromServer(
        doc(db, 'users', current.uid),
      );

      if (request !== generation.current) {
        return;
      }

      if (snapshot.exists()) {
        const data = snapshot.data();

        if (
          typeof data.nickname === 'string' &&
          data.nickname.trim().length > 0 &&
          data.nickname.length <= 24 &&
          AVATARS.includes(data.avatar)
        ) {
          setProfile({
            nickname: data.nickname,
            avatar: data.avatar,
          });
        }
      }
    } catch {
      if (request === generation.current) {
        setError(
          'Could not load your player profile. Please reconnect and retry.',
        );
      }
    } finally {
      if (request === generation.current) {
        setReady(true);
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      current => void loadProfile(current),
      reason => {
        setError(reason.message);
        setReady(true);
      },
    );

    return () => {
      generation.current++;
      unsubscribe();
    };
  }, []);

  const guestPromise =
    useRef<Promise<User> | null>(null);

  function continueAsGuest(): Promise<User> {
    if (guestPromise.current) {
      return guestPromise.current;
    }

    setBusy(true);
    setError('');

    const operation = (async () => {
      try {
        await auth.authStateReady();

        if (auth.currentUser) {
          return auth.currentUser;
        }

        const result = await signInAnonymously(auth);

        return result.user;
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Could not create guest account.',
        );

        throw reason;
      } finally {
        setBusy(false);
      }
    })();

    guestPromise.current = operation;

    void operation.then(
      () => { guestPromise.current = null; },
      () => { guestPromise.current = null; },
    );

    return operation;
  }

  const googleLock = useRef(false);

  async function continueWithGoogle() {
    if (googleLock.current || guestPromise.current) {
      return;
    }

    googleLock.current = true;
    setBusy(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (reason) {
      throw new Error(googleAuthError(reason));
    } finally {
      googleLock.current = false;
      setBusy(false);
    }
  }

  async function linkGoogleAccount() {
    if (googleLock.current || guestPromise.current) {
      return;
    }

    googleLock.current = true;
    setBusy(true);

    try {
      const registered =
        await upgradeGuestWithGoogle();

      // Explicitly reload the profile and
      // account status after linking.
      await loadProfile(registered);
    } catch (reason) {
      throw new Error(googleAuthError(reason));
    } finally {
      googleLock.current = false;
      setBusy(false);
    }
  }

  const logoutLock = useRef(false);

  async function logout(
    abandonGuest = false,
  ): Promise<void> {
    if (
      auth.currentUser?.isAnonymous &&
      !abandonGuest
    ) {
      throw new Error(
        'Guest accounts must be linked or explicitly abandoned.',
      );
    }

    if (
      logoutLock.current ||
      googleLock.current ||
      guestPromise.current ||
      busy
    ) {
      throw new Error(
        'Another account operation is running.',
      );
    }

    logoutLock.current = true;
    setBusy(true);

    try {
      await signOutPlayer();
    } finally {
      logoutLock.current = false;
      setBusy(false);
    }
  }

  async function deleteAccount(): Promise<void> {
    if (
      logoutLock.current ||
      googleLock.current ||
      guestPromise.current ||
      busy
    ) {
      throw new Error(
        'Another account operation is running.',
      );
    }

    logoutLock.current = true;
    setBusy(true);

    try {
      await deletePlayerAccount();
    } finally {
      logoutLock.current = false;
      setBusy(false);
    }
  }

  async function saveProfile(
    value: string,
    avatar: string,
  ) {
    const current = auth.currentUser;
    const nickname = value.trim();

    if (!current) {
      throw new Error('Sign in first.');
    }

    if (!nickname || nickname.length > 24) {
      throw new Error(
        'Choose a nickname of 1-24 characters.',
      );
    }

    if (!AVATARS.includes(avatar)) {
      throw new Error('Choose a valid avatar.');
    }

    if (!ready || error) {
      throw new Error('Retry loading your profile first.');
    }

    setBusy(true);

    try {
      await setDoc(
        doc(db, 'users', current.uid),
        {
          nickname,
          avatar,

          ...(!profile
            ? { createdAt: serverTimestamp() }
            : {}),

          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (auth.currentUser?.uid === current.uid) {
        setProfile({ nickname, avatar });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlayerContext.Provider
      value={{
        user,
        uid: user?.uid ?? null,
        profile,
        ready,
        busy,
        isGuest: user?.isAnonymous ?? false,
        error,
        continueAsGuest,
        continueWithGoogle,
        linkGoogleAccount,
        saveProfile,
        logout,
        deleteAccount,
        reloadProfile: () =>
          loadProfile(auth.currentUser),
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error(
      'usePlayer must be used inside PlayerProvider.',
    );
  }

  return context;
}







