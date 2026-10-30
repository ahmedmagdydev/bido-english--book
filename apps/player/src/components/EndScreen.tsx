import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import Mascot from "./Mascot";

export default function EndScreen(props: {
  stars: number;
  correct: number;
  total: number;
  streak: number;
  onAgain: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(
      () =>
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.7 },
          colors: ["#4f7cff", "#ffd94f", "#1f9d5a", "#ff8ab5"],
        }),
      300,
    );
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="card end-card">
      <Mascot variant="wave" size={110} animate />
      <div className="stars">
        {[1, 2, 3].map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.4 + i * 0.3,
              type: "spring",
              stiffness: 400,
              damping: 12,
            }}
            style={{ display: "inline-block" }}
            className={i <= props.stars ? "star on" : "star"}
          >
            ★
          </motion.span>
        ))}
      </div>
      {props.stars === 3 && (
        <motion.img
          src="art/sticker-star.png"
          alt="Gold star sticker"
          className="reward-sticker"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 1.5, type: "spring", stiffness: 300, damping: 14 }}
        />
      )}
      <h2>Great job!</h2>
      <p>
        {props.correct} of {props.total} right
        {props.streak > 1 && ` · 🔥 ${props.streak}-day streak`}
      </p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button onClick={props.onAgain}>Play again</button>
        <a className="btn-link" href="#/">
          Home
        </a>
      </div>
    </div>
  );
}
