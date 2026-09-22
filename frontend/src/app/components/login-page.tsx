import { useState } from "react";
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "motion/react";

import { GlassCard } from "./glass-card";
import { Button } from "./button";
import { ParticlesBackground } from "./particles-background";
import { getApiErrorMessage } from "../../services/api";

interface LoginPageProps {
  onLogin: (
    email: string,
    password: string,
  ) => Promise<void>;

  onSwitchToSignup: () => void;

  onForgotPassword: () => void;
}

export function LoginPage({
  onLogin,
  onSwitchToSignup,
  onForgotPassword,
}: LoginPageProps) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError("");

    if (!email || !password) {
      setError(
        "Enter your email and password.",
      );
      return;
    }

    setLoading(true);

    try {
      await onLogin(
        email.trim(),
        password,
      );
    } catch (submitError) {
      setError(
        getApiErrorMessage(
          submitError,
          "Invalid email or password.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <ParticlesBackground />

      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-4xl font-bold mb-2">
            Welcome Back
          </h1>

          <p className="text-muted-foreground">
            Sign in to continue to ScamShield AI
          </p>
        </div>

        <GlassCard className="p-8">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label className="block mb-2 text-sm font-semibold">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 bg-input rounded-lg border border-border focus:border-primary focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 bg-input rounded-lg border border-border focus:border-primary focus:outline-none transition-colors"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked,
                    )
                  }
                  className="w-4 h-4 rounded border-border bg-input cursor-pointer"
                />

                <span className="text-sm text-muted-foreground">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </Button>
          </form>
        </GlassCard>

        <p className="text-center mt-6 text-muted-foreground">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            className="text-primary hover:underline font-semibold"
          >
            Sign up
          </button>
        </p>
      </motion.div>
    </div>
  );
}