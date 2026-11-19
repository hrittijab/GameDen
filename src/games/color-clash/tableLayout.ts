export type TableLayout = {
  mode: 'duel' | 'triangle' | 'square' | 'expanded' | 'grid';
  top: string[];
  left: string | null;
  right: string | null;
  grid: string[];
};

export function createTableLayout(
  opponents: string[],
): TableLayout {
  const empty = {
    top: [],
    left: null,
    right: null,
    grid: [],
  };

  const count = opponents.length + 1;

  if (count === 2) {
    return {
      ...empty,
      mode: 'duel',
      top: opponents,
    };
  }

  if (count === 3) {
    return {
      ...empty,
      mode: 'triangle',
      top: opponents,
    };
  }

  if (count === 4) {
    return {
      ...empty,
      mode: 'square',
      left: opponents[0],
      top: [opponents[1]],
      right: opponents[2],
    };
  }

  if (count <= 6) {
    return {
      ...empty,
      mode: 'expanded',
      left: opponents[0] ?? null,
      top: opponents.slice(1, -1),
      right: opponents[opponents.length - 1] ?? null,
    };
  }

  return {
    ...empty,
    mode: 'grid',
    grid: opponents,
  };
}

export function spotlightPlayer(
  opponents: string[],
  currentPlayerId: string | null | undefined,
  activeIds: string[],
): string | undefined {
  if (
    currentPlayerId &&
    opponents.includes(currentPlayerId)
  ) {
    return currentPlayerId;
  }

  return (
    opponents.find(id => activeIds.includes(id)) ??
    opponents[0]
  );
}
