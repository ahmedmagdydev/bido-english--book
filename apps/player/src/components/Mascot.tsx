import { motion } from "framer-motion";

export default function Mascot(props: {
  variant?: "read" | "wave";
  size?: number;
  animate?: boolean;
}) {
  const size = props.size ?? 120;
  const src = `art/${props.variant === "wave" ? "mascot-wave" : "mascot"}.png`;
  const img = (
    <img
      src={src}
      alt="PageBuddy fox mascot"
      className="mascot-img"
      width={size}
      height={size}
      style={{ display: "block" }}
      draggable={false}
    />
  );
  if (!props.animate) return img;
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      whileTap={{ scale: 1.1, rotate: [-4, 4, 0] }}
      style={{ display: "inline-block", cursor: "pointer" }}
    >
      {img}
    </motion.div>
  );
}
