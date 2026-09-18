import { ReactNode, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function GlassCard({ children, className = "", hover = true, ...props }: GlassCardProps) {
  return (
    <div
      {...props}
      className={`
        backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl
        ${hover ? "transition-all duration-300 hover:bg-white/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
