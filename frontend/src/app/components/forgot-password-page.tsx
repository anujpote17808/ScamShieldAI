import { useState } from "react";
import {
  Shield,
  Mail,
  Lock,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { motion } from "motion/react";

import { GlassCard } from "./glass-card";
import { Button } from "./button";
import { ParticlesBackground } from "./particles-background";
import api, {
  getApiErrorMessage,
} from "../../services/api";

type Step =
  | "email"
  | "otp"
  | "password"
  | "success";

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordPage({
  onBackToLogin,
}: ForgotPasswordPageProps) {
  const [step, setStep] =
    useState<Step>("email");

  const [email, setEmail] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [resetToken, setResetToken] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const requestOtp = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response =
        await api.post(
          "/auth/forgot-password",
          {
            email: email.trim(),
          },
        );

      setMessage(
        response.data?.message ||
          "If the email exists, a verification code has been sent.",
      );

      setStep("otp");
    } catch (submitError) {
      setError(
        getApiErrorMessage(
          submitError,
          "Unable to send the verification code.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError(
        "Enter the 6-digit verification code.",
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await api.post(
          "/auth/verify-otp",
          {
            email: email.trim(),
            otp,
          },
        );

      setResetToken(
        response.data.data.resetToken,
      );

      setStep("password");
    } catch (submitError) {
      setError(
        getApiErrorMessage(
          submitError,
          "The verification code is invalid or expired.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError(
        "Your new password must be at least 8 characters.",
      );
      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    setLoading(true);

    try {
      await api.post(
        "/auth/reset-password",
        {
          resetToken,
          newPassword,
        },
      );

      setStep("success");
    } catch (submitError) {
      setError(
        getApiErrorMessage(
          submitError,
          "Unable to reset your password.",
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
            {step === "password" ||
            step === "success" ? (
              <KeyRound className="w-10 h-10 text-primary" />
            ) : (
              <Shield className="w-10 h-10 text-primary" />
            )}
          </div>

          <h1 className="text-4xl font-bold mb-2">
            {step === "email" &&
              "Forgot Password"}

            {step === "otp" &&
              "Verify OTP"}

            {step === "password" &&
              "New Password"}

            {step === "success" &&
              "Password Updated"}
          </h1>

          <p className="text-muted-foreground">
            {step === "email" &&
              "Enter your email to receive a verification code."}

            {step === "otp" &&
              `Enter the 6-digit code sent to ${email}.`}

            {step === "password" &&
              "Create a new password for your account."}

            {step === "success" &&
              "Your password has been reset successfully."}
          </p>
        </div>

        <GlassCard className="p-8">
          {step === "email" && (
            <form
              onSubmit={requestOtp}
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
                  ? "Sending code..."
                  : "Send OTP"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form
              onSubmit={verifyOtp}
              className="space-y-6"
            >
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Verification Code
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    )
                  }
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] text-xl py-3 px-4 bg-input rounded-lg border border-border focus:border-primary focus:outline-none transition-colors"
                  required
                />
              </div>

              {message && (
                <p className="text-sm text-primary">
                  {message}
                </p>
              )}

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
                disabled={
                  loading ||
                  otp.length !== 6
                }
              >
                {loading
                  ? "Verifying..."
                  : "Verify OTP"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}

          {step === "password" && (
            <form
              onSubmit={resetPassword}
              className="space-y-6"
            >
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  New Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter a new password"
                    className="w-full pl-12 pr-4 py-3 bg-input rounded-lg border border-border focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Confirm Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Confirm your new password"
                    className="w-full pl-12 pr-4 py-3 bg-input rounded-lg border border-border focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                </div>
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
                  ? "Updating password..."
                  : "Reset Password"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-5">
                <p className="text-sm text-muted-foreground">
                  Your password has been changed.
                  You can now sign in with your new
                  password.
                </p>
              </div>

              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={onBackToLogin}
              >
                Back to Login
              </Button>
            </div>
          )}
        </GlassCard>

        {step !== "success" && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="flex items-center justify-center gap-2 mx-auto mt-6 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        )}
      </motion.div>
    </div>
  );
}