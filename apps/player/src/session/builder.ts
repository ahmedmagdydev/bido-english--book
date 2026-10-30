import type {
  ExerciseItem,
  ExerciseType,
  LessonPack,
  Review,
  VocabItem,
} from "@pagebuddy/schema";

export type SessionStep =
  | { kind: "flashcard"; vocab: VocabItem }
  | { kind: "exercise"; exercise: ExerciseItem; itemId: string };

const NEW_PER_SESSION = 4;
const MAX_STEPS = 14;

// Difficulty ladder per plan §7.2 — which exercise types fit a mastery level.
function preferredTypes(box: number): ExerciseType[] {
  if (box <= 2) return ["listenPick", "matchPairs", "cloze"];
  if (box <= 4) return ["cloze", "sentenceBuilder", "spellingTiles", "listenPick"];
  return ["dictation", "sentenceBuilder", "cloze", "spellingTiles", "listenPick"];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Synthetic listenPick when a vocab word has no wired exercise refs.
function synthListenPick(v: VocabItem, pack: LessonPack): ExerciseItem {
  const others = shuffle(pack.vocab.filter((x) => x.id !== v.id))
    .slice(0, 3)
    .map((x) => x.word);
  return {
    id: `synth_${v.id}`,
    type: "listenPick",
    refs: [v.id],
    payload: {
      prompt: { kind: "word", text: v.word },
      options: shuffle([v.word, ...others]),
      answer: v.word,
    },
    approved: true,
  };
}

function pickExercise(
  itemId: string,
  box: number,
  byRef: Map<string, ExerciseItem[]>,
  used: Set<string>,
): ExerciseItem | null {
  const pool = (byRef.get(itemId) ?? []).filter((e) => !used.has(e.id));
  for (const t of preferredTypes(box)) {
    const hit = pool.find((e) => e.type === t);
    if (hit) {
      used.add(hit.id);
      return hit;
    }
  }
  const any = pool[0];
  if (any) used.add(any.id);
  return any ?? null;
}

export function buildSession(
  pack: LessonPack,
  reviews: Map<string, Review>,
  now = Date.now(),
): SessionStep[] {
  const boxOf = (id: string) => reviews.get(id)?.box ?? 0;
  const byRef = new Map<string, ExerciseItem[]>();
  for (const e of pack.exercises.filter((x) => x.approved)) {
    for (const r of e.refs) {
      const list = byRef.get(r) ?? [];
      list.push(e);
      byRef.set(r, list);
    }
  }

  const due = pack.vocab.filter((v) => {
    const r = reviews.get(v.id);
    return r && r.nextDue <= now;
  });
  const fresh = pack.vocab.filter((v) => !reviews.has(v.id));
  const picked = [...due, ...fresh.slice(0, NEW_PER_SESSION)].slice(0, 8);
  // no reviews yet and no vocab? fall back to sentence items via cloze
  const items = picked.length ? picked : pack.vocab.slice(0, NEW_PER_SESSION);
  if (!items.length) return [];

  const steps: SessionStep[] = [];
  const used = new Set<string>();

  // 1) exposure flashcards for brand-new items (plan §7.2: new items first)
  for (const v of items) {
    if (!reviews.has(v.id)) steps.push({ kind: "flashcard", vocab: v });
  }

  // 2) exercises per item, ordered easy→hard
  for (const v of [...items].sort((a, b) => boxOf(a.id) - boxOf(b.id))) {
    const ex = pickExercise(v.id, boxOf(v.id), byRef, used);
    steps.push({
      kind: "exercise",
      exercise: ex ?? synthListenPick(v, pack),
      itemId: v.id,
    });
  }

  // 3) end on an easy win — a listenPick on the weakest item
  const weakest = items.reduce((a, b) => (boxOf(a.id) <= boxOf(b.id) ? a : b));
  steps.push({
    kind: "exercise",
    exercise: synthListenPick(weakest, pack),
    itemId: weakest.id,
  });

  return steps.slice(0, MAX_STEPS);
}
