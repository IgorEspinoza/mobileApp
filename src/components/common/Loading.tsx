"use client";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

const SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-4",
};

export function Loading({
  size = "md",
  text,
  fullScreen = false,
}: LoadingProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${SIZES[size]} border-slate-600 border-t-blue-500 rounded-full animate-spin`}
      />
      {text && <p className="text-sm text-slate-400">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
        {spinner}
      </div>
    );
  }

  return spinner;
}

