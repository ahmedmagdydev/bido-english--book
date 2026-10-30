import { useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../store";
import {
  buildSession,
  buildBossSession,
  type SessionStep,
} from "../session/builder";
import { getReviews, recordAttempt, finishSession, streak } from "../progress";
import { stopAll } from "../audio";
import Flashcard from "../components/Flashcard";
import ListenPick from "../components/ListenPick";
import Cloze from "../components/Cloze";
import SentenceBuilder from "../components/SentenceBuilder";
import SpellingTiles from "../components/SpellingTiles";
import MatchPairs from "../components/MatchPairs";
import TrueFalse from "../components/TrueFalse";
import OddOneOut from "../components/OddOneOut";
import MinimalPair from "../components/MinimalPair";
import Comprehension from "../components/Comprehension";
import EndScreen from "../components/EndScreen";
import { db } from "../db";
import type { ExerciseItem, ExerciseType, LessonPack } from "@pagebuddy/schema";

type ExProps = {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
};

const EXERCISE_COMPONENTS: Partial<Record<ExerciseType, ComponentType<ExProps>>> = {
  listenPick: ListenPick,
  cloze: Cloze,
  sentenceBuilder: SentenceBuilder,
  spellingTiles: SpellingTiles,
  dictation: SpellingTiles,
  matchPairs: MatchPairs,
  trueFalse: TrueFalse,
  oddOneOut: OddOneOut,
  minimalPair: MinimalPair,
  comprehension: Comprehension,
};

export default function SessionPage({ boss = false }: { boss?: boolean }) {
  const { pack, loadPack } = useApp();
  const [steps, setSteps] = useState<SessionStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ earned: 0, answered: 0 });
  const [done, setDone] = useState(false);
  const [finalStreak, setFinalStreak] = useState(0);
  const stepStart = useRef(Date.now());
  const sessionStart = useRef(Date.now());
  const requeued = useRef(new Set<string>());

  useEffect(() => {
    (async () => {
      const p = await loadPack();
      const reviews = await getReviews(p.packId);
      setSteps(
        boss ? buildBossSession(p, reviews) : buildSession(p, reviews),
      );
    })();
  }, []);

  if (!pack || !steps) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <p>Loading your adventure…</p>
        </div>
      </div>
    );
  }

  const step = steps[index];

  const advance = () => {
    stopAll(); // never carry a clip into the next question
    stepStart.current = Date.now();
    if (index + 1 >= steps.length) {
      finish();
    } else {
      setIndex(index + 1);
    }
  };

  const starCount =
    score.earned >= score.answered - 1
      ? 3
      : score.earned >= score.answered * 0.6
        ? 2
        : 1;

  const finish = async () => {
    await finishSession({
      itemsPracticed: score.answered,
      correct: Math.round(score.earned),
      stars: starCount,
      minutes: Math.max(
        1,
        Math.round((Date.now() - sessionStart.current) / 60000),
      ),
    });
    setFinalStreak(await streak());
    if (boss) {
      const row = await db.settings.get("bossClears");
      await db.settings.put({
        key: "bossClears",
        value: (Number(row?.value) || 0) + 1,
      });
    }
    setDone(true);
  };

  // exercise result; wrong answers re-queue the step once (kind failure)
  const handleExercise = (
    stepIdx: number,
    itemId: string,
    type: ExerciseType,
    correct: boolean,
    secondChance: boolean,
  ) => {
    const ms = Date.now() - stepStart.current;
    recordAttempt(itemId, pack.packId, type, correct, ms);
    const pts = correct ? (secondChance ? 0.5 : 1) : 0;
    setScore((s) => ({ earned: s.earned + pts, answered: s.answered + 1 }));
    if (!correct && !requeued.current.has(itemId)) {
      requeued.current.add(itemId);
      const retry = steps[stepIdx];
      const next = [...steps];
      next.splice(Math.min(stepIdx + 3, next.length), 0, retry);
      setSteps(next);
    }
    advance();
  };

  if (done) {
    return (
      <div className="page">
        <EndScreen
          stars={starCount}
          correct={Math.round(score.earned)}
          total={score.answered}
          streak={finalStreak}
          onAgain={() => window.location.reload()}
        />
      </div>
    );
  }

  const ExerciseView =
    step.kind === "exercise"
      ? EXERCISE_COMPONENTS[step.exercise.type]
      : undefined;

  return (
    <div className="page no-select">
      {boss && (
        <p className="boss-banner">
          🏰 BOSS ROUND — beat your trickiest words!
        </p>
      )}
      <div className="session-top">
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            animate={{ width: `${(index / steps.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <img src="art/mascot.png" alt="" className="progress-rider" />
          </motion.div>
        </div>
        <a href="#/" className="quit-pill" aria-label="quit session" onClick={stopAll}>✕</a>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 70, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -70, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
        >
      {step.kind === "flashcard" && (
        <Flashcard
          key={`f-${step.vocab.id}`}
          packId={pack.packId}
          vocab={step.vocab}
          onResult={(knew) => {
            recordAttempt(step.vocab.id, pack.packId, "flashcard", knew, Date.now() - stepStart.current);
            setScore((s) => ({ earned: s.earned + (knew ? 1 : 0), answered: s.answered + 1 }));
            advance();
          }}
        />
      )}
      {step.kind === "exercise" && ExerciseView && (
        <ExerciseView
          key={`e-${index}-${step.exercise.id}`}
          packId={pack.packId}
          pack={pack}
          exercise={step.exercise}
          onDone={(c, sc) => handleExercise(index, step.itemId, step.exercise.type, c, sc)}
        />
      )}
      {step.kind === "exercise" && !ExerciseView && (
          <div className="card">
            <p className="exercise-label">{step.exercise.type}</p>
            <p>This exercise type isn't playable yet — tap to skip.</p>
            <button onClick={advance}>Skip →</button>
          </div>
        )}
        </motion.div>
      </AnimatePresence>
      <p style={{ textAlign: "center", opacity: 0.6, fontSize: "0.85rem" }}>
        {index + 1} / {steps.length}
      </p>
    </div>
  );
}
