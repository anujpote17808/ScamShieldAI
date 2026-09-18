import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20",
    secondary: "bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/20",
    outline: "border-2 border-primary hover:bg-primary/10 text-primary",
    danger: "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20",
    success: "bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/20"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      {...props}
      className={`
        ${variants[variant]} ${sizes[size]}
        rounded-lg transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
}
