import { AppState } from 'react-native';

type Listener = () => void;

const listeners = new Set<Listener>();

let now = Date.now();

let timer: ReturnType<
  typeof setInterval
> | null = null;

let appStateSubscription: ReturnType<
  typeof AppState.addEventListener
> | null = null;

function tick() {
  now = Date.now();

  for (const listener of listeners) {
    listener();
  }
}

function start() {
  if (timer !== null) return;

  now = Date.now();

  timer = setInterval(tick, 100);

  appStateSubscription =
    AppState.addEventListener(
      'change',
      state => {
        if (state === 'active') {
          tick();
        }
      },
    );
}

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }

  appStateSubscription?.remove();

  appStateSubscription = null;
}

export function subscribeClock(
  listener: Listener,
) {
  listeners.add(listener);

  start();

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stop();
    }
  };
}

export function getClockTime() {
  return now;
}
