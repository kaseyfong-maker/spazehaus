/*
 * SPAZEHAUS APP HEADER
 * Design: White/light corporate header with warm gold accents
 * Used across all screens — supports back navigation, title, subtitle, action buttons
 */
import { ChevronLeft, Bell } from "lucide-react";
import { motion } from "framer-motion";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showNotification?: boolean;
  bgImage?: string;
  compact?: boolean;
}

export default function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  showNotification = false,
  bgImage,
  compact = false,
}: AppHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  // When a background image is provided, use a rich overlay (e.g. Projects hero)
  if (bgImage) {
    return (
      <div
        className={`relative overflow-hidden ${compact ? "pt-10 pb-5" : "pt-12 pb-7"}`}
        style={{
          background: `linear-gradient(to bottom, oklch(0.11 0.004 285 / 0.55) 0%, oklch(0.11 0.004 285 / 0.80) 100%), url(${bgImage}) center/cover no-repeat`,
        }}
      >
        {/* Gold accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.09 68), transparent)" }}
        />
        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleBack}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ background: "oklch(1 0 0 / 15%)", border: "1px solid oklch(1 0 0 / 20%)" }}
              >
                <ChevronLeft size={18} style={{ color: "oklch(0.72 0.09 68)" }} />
              </motion.button>
            )}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`font-display font-semibold text-white leading-tight ${compact ? "text-xl" : "text-2xl"}`}
              >
                {title}
              </motion.h1>
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs mt-0.5 font-label"
                  style={{ color: "oklch(0.72 0.09 68)", letterSpacing: "0.08em" }}
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rightAction}
            {showNotification && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 flex items-center justify-center rounded-full relative"
                style={{ background: "oklch(1 0 0 / 15%)", border: "1px solid oklch(1 0 0 / 20%)" }}
              >
                <Bell size={16} className="text-white" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "oklch(0.62 0.09 68)" }} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: clean white header
  return (
    <div
      className={`relative ${compact ? "pt-10 pb-4" : "pt-12 pb-5"}`}
      style={{
        background: "oklch(1 0 0)",
        borderBottom: "1px solid oklch(0.90 0.010 75)",
      }}
    >
      {/* Gold accent line at top */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: "linear-gradient(90deg, oklch(0.62 0.09 68), oklch(0.72 0.09 68 / 60%), transparent)" }}
      />

      {/* Header content */}
      <div className="px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-full"
              style={{ background: "oklch(0.96 0.006 75)", border: "1px solid oklch(0.90 0.010 75)" }}
            >
              <ChevronLeft size={18} style={{ color: "oklch(0.62 0.09 68)" }} />
            </motion.button>
          )}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-display font-semibold leading-tight ${compact ? "text-xl" : "text-2xl"}`}
              style={{ color: "oklch(0.14 0.008 65)" }}
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xs mt-0.5 font-label"
                style={{ color: "oklch(0.62 0.09 68)", letterSpacing: "0.08em" }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rightAction}
          {showNotification && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 flex items-center justify-center rounded-full relative"
              style={{ background: "oklch(0.96 0.006 75)", border: "1px solid oklch(0.90 0.010 75)" }}
            >
              <Bell size={16} style={{ color: "oklch(0.35 0.008 65)" }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "oklch(0.62 0.09 68)" }} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
