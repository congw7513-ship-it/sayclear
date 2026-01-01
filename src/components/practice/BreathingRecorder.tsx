"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { COMFORT_MESSAGES, type ScenarioMode } from "@/lib/constants";

// ============================================
// 录音中的麦克风动画
// ============================================
function RecordingMicIcon() {
    return (
        <motion.div
            animate={{
                scale: [1, 1.15, 1],
                opacity: [1, 0.8, 1]
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className="relative"
        >
            <Mic className="w-6 h-6" />
            <motion.div
                className="absolute inset-0 bg-red-500 rounded-full -z-10"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
        </motion.div>
    );
}

// ============================================
// 呼吸动画光晕
// ============================================
export function BreathingHalo({ mode }: { mode: ScenarioMode }) {
    return (
        <div className="relative flex items-center justify-center w-48 h-48 mx-auto mb-4">
            {/* 核心光晕层 1 */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={`absolute inset-0 rounded-full blur-3xl ${mode === "work" ? "bg-blue-200/50" : "bg-pink-200/50"
                    }`}
            />
            {/* 核心光晕层 2 (错开节奏) */}
            <motion.div
                animate={{
                    scale: [1.1, 1.3, 1.1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 4,
                    delay: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={`absolute inset-0 rounded-full blur-2xl ${mode === "work" ? "bg-cyan-100/40" : "bg-rose-100/40"
                    }`}
            />

            {/* 录音图标 (居中) */}
            <div className="relative z-10 bg-background/80 p-6 rounded-full shadow-sm backdrop-blur-sm border border-muted/20">
                <RecordingMicIcon />
            </div>
        </div>
    );
}

// ============================================
// 轮播安抚文案
// ============================================
export function ComfortingMessageDisplay() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % COMFORT_MESSAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-8 flex items-center justify-center mb-2">
            <AnimatePresence mode="wait">
                <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.5 }}
                    className="text-muted-foreground font-medium"
                >
                    {COMFORT_MESSAGES[index]}
                </motion.p>
            </AnimatePresence>
        </div>
    );
}

// ============================================
// 正向计时器 (Hide Anxiety)
// ============================================
export function RecordingTimer({ seconds }: { seconds: number }) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    return (
        <div className="text-center mt-2">
            <span className="text-sm font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                已录制 {timeString}
            </span>
        </div>
    );
}
