import {
  DISTRACTOR_LETTERS,
  lettersOf,
  normWord,
  type ExerciseItem,
  type ExerciseType,
  type LessonPack,
  type PackLang,
  type Review,
  type VocabItem,
} from "@pagebuddy/schema";

const langOf = (pack: LessonPack): PackLang => pack.language ?? "en";

export type SessionStep =
  | { kind: "flashcard"; vocab: VocabItem }
  | { kind: "exercise"; exercise: ExerciseItem; itemId: string };

const NEW_PER_SESSION = 4;
const MAX_STEPS = 15;

// Difficulty ladder per plan §7.2 — which exercise types fit a mastery level.
function preferredTypes(box: number): ExerciseType[] {
  if (box <= 2)
    return [
      "listenPick",
      "matchPairs",
      "trueFalse",
      "trace",
      "oddOneOut",
      "cloze",
      "spellingTiles",
    ];
  if (box <= 4)
    return [
      "cloze",
      "sentenceBuilder",
      "spellingTiles",
      "oddOneOut",
      "matchPairs",
      "minimalPair",
      "trueFalse",
    ];
  return [
    "dictation",
    "sentenceBuilder",
    "minimalPair",
    "cloze",
    "spellingTiles",
    "oddOneOut",
  ];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (w: string, lang: PackLang = "en") => normWord(w, lang);

function otherWords(v: VocabItem, pack: LessonPack, n: number): string[] {
  return shuffle(pack.vocab.filter((x) => x.id !== v.id))
    .map((x) => x.word)
    .slice(0, n);
}

/* --- synthesized exercises (no pack exercise needed) --- */

// Synthetic listenPick when a vocab word has no wired exercise refs.
function synthListenPick(v: VocabItem, pack: LessonPack): ExerciseItem {
  const others = otherWords(v, pack, 3);
  const pictures: Record<string, string> = {};
  const opts = [v.word, ...others];
  for (const w of opts) {
    const vi = pack.vocab.find((x) => x.word === w);
    if (vi?.image) pictures[w] = vi.image.src;
  }
  // picturePick: only when EVERY option has an illustration
  const allImaged = opts.length >= 4 && opts.every((w) => pictures[w]);
  return {
    id: `synth_${v.id}`,
    type: "listenPick",
    refs: [v.id],
    payload: {
      prompt: { kind: "word", text: v.word },
      options: shuffle(opts),
      answer: v.word,
      ...(allImaged ? { pictures } : {}),
    },
    approved: true,
  };
}

function synthTiles(v: VocabItem, dictation: boolean, pack: LessonPack): ExerciseItem {
  const lang = langOf(pack);
  const letters = lettersOf(v.word, lang);
  const wn = norm(v.word, lang);
  const extras = DISTRACTOR_LETTERS[lang]
    .split("")
    .filter((l) => !letters.includes(l) && !wn.includes(l))
    .slice(0, 3);
  return {
    id: `synth_${dictation ? "dict" : "spell"}_${v.id}`,
    type: dictation ? "dictation" : "spellingTiles",
    refs: [v.id],
    payload: { word: v.word, tiles: shuffle([...letters, ...extras]) },
    approved: true,
  };
}

// Finger-tracing a dotted guide — writing practice, no wrong answers.
function synthTrace(v: VocabItem): ExerciseItem {
  return {
    id: `synth_trace_${v.id}`,
    type: "trace",
    refs: [v.id],
    payload: { word: v.word },
    approved: true,
  };
}

function synthTrueFalse(v: VocabItem, pack: LessonPack): ExerciseItem {
  const same = Math.random() < 0.5;
  const hear = same ? v.word : (otherWords(v, pack, 1)[0] ?? v.word);
  return {
    id: `synth_tf_${v.id}`,
    type: "trueFalse",
    refs: [v.id],
    payload: { word: v.word, hear, same: hear === v.word },
    approved: true,
  };
}

// "Which word did you NOT hear?" — play 3 words, show 4, find the missing one.
function synthOddOneOut(v: VocabItem, pack: LessonPack): ExerciseItem | null {
  const options = shuffle([v.word, ...otherWords(v, pack, 3)]);
  if (options.length < 4) return null;
  const answer = options[Math.floor(Math.random() * options.length)];
  const played = options.filter((w) => w !== answer);
  return {
    id: `synth_odd_${v.id}`,
    type: "oddOneOut",
    refs: [v.id],
    payload: { played, options, answer },
    approved: true,
  };
}

// Close-sounding pairs from the vocab list (bolt/bolted, pan/panned…).
// English-suffix heuristic — rarely fires for Arabic and safely returns null.
function minimalPartner(v: VocabItem, pack: LessonPack): VocabItem | null {
  const lang = langOf(pack);
  const w = norm(v.word, lang);
  return (
    pack.vocab.find((x) => {
      if (x.id === v.id) return false;
      const o = norm(x.word, lang);
      return (
        (w.startsWith(o) && w.length - o.length <= 3) ||
        (o.startsWith(w) && o.length - w.length <= 3)
      );
    }) ?? null
  );
}

function synthMinimalPair(v: VocabItem, pack: LessonPack): ExerciseItem | null {
  const partner = minimalPartner(v, pack);
  if (!partner) return null;
  const heard = Math.random() < 0.5 ? v.word : partner.word;
  return {
    id: `synth_mp_${v.id}`,
    type: "minimalPair",
    refs: [v.id, partner.id],
    payload: {
      word: heard,
      options: shuffle([v.word, partner.word]),
      answer: heard,
    },
    approved: true,
  };
}

function synthMatchPairs(v: VocabItem, pack: LessonPack): ExerciseItem {
  const words = shuffle([v.word, ...otherWords(v, pack, 2)]);
  return {
    id: `synth_mpairs_${v.id}`,
    type: "matchPairs",
    refs: [v.id],
    payload: { pairs: words.map((word) => ({ word })) },
    approved: true,
  };
}

/* --- picking --- */

type Synth = (v: VocabItem, pack: LessonPack) => ExerciseItem | null;

const synths: Partial<Record<ExerciseType, Synth>> = {
  listenPick: (v, p) => synthListenPick(v, p),
  trueFalse: (v, p) => synthTrueFalse(v, p),
  oddOneOut: (v, p) => synthOddOneOut(v, p),
  minimalPair: (v, p) => synthMinimalPair(v, p),
  matchPairs: (v, p) => synthMatchPairs(v, p),
  dictation: (v, p) => synthTiles(v, true, p),
  spellingTiles: (v, p) => synthTiles(v, false, p),
  trace: (v) => synthTrace(v),
};

function pickExercise(
  vocab: VocabItem,
  box: number,
  byRef: Map<string, ExerciseItem[]>,
  used: Set<string>,
  recentTypes: ExerciseType[],
  pack: LessonPack,
): ExerciseItem | null {
  const pool = (byRef.get(vocab.id) ?? []).filter((e) => !used.has(e.id));
  const recent = new Set(recentTypes.slice(-2));

  // preferred types in random order, but never repeat one of the last two
  const ordered = shuffle(preferredTypes(box)).sort(
    (a, b) => Number(recent.has(a)) - Number(recent.has(b)),
  );

  for (const t of ordered) {
    const hit = pool.find((e) => e.type === t);
    const ex = hit ?? synths[t]?.(vocab, pack) ?? null;
    if (ex) {
      used.add(ex.id);
      return ex;
    }
  }
  const any = pool[0];
  if (any) {
    used.add(any.id);
    return any;
  }
  return synthListenPick(vocab, pack);
}

export function buildSession(
  pack: LessonPack,
  reviews: Map<string, Review>,
  now = Date.now(),
): SessionStep[] {
  const boxOf = (id: string) => reviews.get(id)?.box ?? 0;
  const byRef = new Map<string, ExerciseItem[]>();
  const loose: ExerciseItem[] = [];
  for (const e of pack.exercises.filter((x) => x.approved)) {
    if (!e.refs.length) {
      loose.push(e);
      continue;
    }
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
  const recentTypes: ExerciseType[] = [];

  // 1) exposure flashcards for brand-new items (plan §7.2: new items first)
  for (const v of items) {
    if (!reviews.has(v.id)) steps.push({ kind: "flashcard", vocab: v });
  }

  // 2) exercises per item, ordered easy→hard
  for (const v of [...items].sort((a, b) => boxOf(a.id) - boxOf(b.id))) {
    const ex = pickExercise(v, boxOf(v.id), byRef, used, recentTypes, pack);
    if (ex) {
      recentTypes.push(ex.type);
      steps.push({ kind: "exercise", exercise: ex, itemId: v.id });
    }
  }

  // 3) bonus round: up to 2 exercises from the pack's unreferenced pool
  //    (book cloze/sentenceBuilder/matchPairs not tied to one vocab item).
  //    Comprehension questions float to the front so a story question shows
  //    up in every session when the pack has them (plan §6.5 research pick).
  const loosePool = shuffle(loose.filter((e) => !used.has(e.id))).sort(
    (a, b) => Number(b.type === "comprehension") - Number(a.type === "comprehension"),
  );
  const bonus: ExerciseItem[] = [];
  for (const e of loosePool) {
    if (bonus.length >= 2) break;
    if (!bonus.some((b) => b.type === e.type)) bonus.push(e);
  }
  for (const e of loosePool) {
    if (bonus.length >= 2) break;
    if (!bonus.includes(e)) bonus.push(e);
  }
  for (const e of bonus) {
    used.add(e.id);
    const anchor = items.find((v) => {
      const w = norm(v.word, langOf(pack));
      return (
        w && norm(JSON.stringify(e.payload), langOf(pack)).includes(w)
      );
    });
    steps.push({
      kind: "exercise",
      exercise: e,
      itemId: anchor?.id ?? items[0].id,
    });
  }

  // 4) end on an easy win — a listenPick on the weakest item
  const weakest = items.reduce((a, b) => (boxOf(a.id) <= boxOf(b.id) ? a : b));
  steps.push({
    kind: "exercise",
    exercise: synthListenPick(weakest, pack),
    itemId: weakest.id,
  });

  return steps.slice(0, MAX_STEPS);
}

/* --- boss round (plan §7.4): hardest items, harder-tier exercises, no
   flashcards. "Boss" = a mixed challenge pulled from what he struggles
   with — lapses first, then lowest boxes. --- */
export function buildBossSession(
  pack: LessonPack,
  reviews: Map<string, Review>,
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

  // weakness = most lapses, then lowest box, then least recently seen
  const ranked = [...pack.vocab]
    .map((v) => ({ v, r: reviews.get(v.id) }))
    .sort((a, b) => {
      const la = a.r?.lapses ?? 0;
      const lb = b.r?.lapses ?? 0;
      if (la !== lb) return lb - la;
      const ba = a.r?.box ?? 0;
      const bb = b.r?.box ?? 0;
      if (ba !== bb) return ba - bb;
      return (a.r?.lastSeen ?? 0) - (b.r?.lastSeen ?? 0);
    })
    .map((x) => x.v);
  const items = ranked.slice(0, 9);
  if (!items.length) return [];

  const steps: SessionStep[] = [];
  const used = new Set<string>();
  const recentTypes: ExerciseType[] = [];

  // boss exercises run one tier harder than the item's box (min box 3)
  for (const v of items) {
    const bossBox = Math.max(3, boxOf(v.id) + 1);
    const ex = pickExercise(v, bossBox, byRef, used, recentTypes, pack);
    if (ex) {
      recentTypes.push(ex.type);
      steps.push({ kind: "exercise", exercise: ex, itemId: v.id });
    }
  }

  // second wave: the three weakest items get a harder re-ask
  for (const v of items.slice(0, 3)) {
    const ex = synthTiles(v, true, pack);
    used.add(ex.id);
    steps.push({ kind: "exercise", exercise: ex, itemId: v.id });
  }
  return steps.slice(0, 15);
}
