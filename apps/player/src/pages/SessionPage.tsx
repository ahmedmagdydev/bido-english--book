import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../store";
import { buildSession, type SessionStep } from "../session/builder";
import { getReviews, recordAttempt, finishSession, streak } from "../progress";
import Flashcard from "../components/Flashcard";
import ListenPick from "../components/ListenPick";
import Cloze from "../components/Cloze";
import SentenceBuilder from "../components/SentenceBuilder";
import EndScreen from "../components/EndScreen";
import type { ExerciseType } from "@pagebuddy/schema";

export default function SessionPage() {
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
      setSteps(buildSession(p, reviews));
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

  return (
    <div className="page no-select">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(index / steps.length) * 100}%` }}
        />
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
      {step.kind === "exercise" && step.exercise.type === "listenPick" && (
        <ListenPick
          key={`e-${index}-${step.exercise.id}`}
          packId={pack.packId}
          pack={pack}
          exercise={step.exercise}
          onDone={(c, sc) => handleExercise(index, step.itemId, "listenPick", c, sc)}
        />
      )}
      {step.kind === "exercise" && step.exercise.type === "cloze" && (
        <Cloze
          key={`e-${index}-${step.exercise.id}`}
          packId={pack.packId}
          pack={pack}
          exercise={step.exercise}
          onDone={(c, sc) => handleExercise(index, step.itemId, "cloze", c, sc)}
        />
      )}
      {step.kind === "exercise" && step.exercise.type === "sentenceBuilder" && (
        <SentenceBuilder
          key={`e-${index}-${step.exercise.id}`}
          packId={pack.packId}
          pack={pack}
          exercise={step.exercise}
          onDone={(c, sc) => handleExercise(index, step.itemId, "sentenceBuilder", c, sc)}
        />
      )}
      {step.kind === "exercise" &&
        !["listenPick", "cloze", "sentenceBuilder"].includes(step.exercise.type) && (
          <div className="card">
            <p className="exercise-label">{step.exercise.type}</p>
            <p>This exercise type isn't playable yet — tap to skip.</p>
            <button onClick={advance}>Skip →</button>
          </div>
        )}
        </motion.div>
      </AnimatePresence>
      <p style={{ textAlign: "center", opacity: 0.6, fontSize: "0.85rem" }}>
        {index + 1} / {steps.length} · <a href="#/">quit</a>
      </p>
    </div>
  );
}
