import { MotionValue } from "framer-motion";
import { createContext } from "react";

const TimeContext = createContext<MotionValue | null>(null);

export default TimeContext;
