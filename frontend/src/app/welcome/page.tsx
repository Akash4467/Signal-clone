"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useToastStore } from "@/store/toast";
import type { User } from "@/lib/types";

type Step = "phone" | "register" | "otp";

export default function WelcomePage() {
  const router = useRouter();
  const completeAuth = useAuthStore((s) => s.completeAuth);
  const toast = useToastStore((s) => s.show);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ otp_hint: string }>("/auth/login", { phone });
      setOtpHint(res.otp_hint);
      setStep("otp");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setStep("register");
      else toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ otp_hint: string }>("/auth/register", {
        phone,
        username,
        display_name: displayName,
      });
      setOtpHint(res.otp_hint);
      setStep("otp");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Registration failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ token: string; user: User }>("/auth/verify-otp", { phone, otp });
      completeAuth(res.token, res.user);
      router.replace("/chat");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Verification failed", "error");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-signal-border dark:border-signal-borderDark bg-white dark:bg-signal-sidebarDark px-4 py-3 text-sm outline-none focus:border-signal-blue";
  const buttonCls =
    "w-full rounded-full bg-signal-blue py-3 text-sm font-semibold text-white hover:bg-signal-blueDark disabled:opacity-50";

  return (
    <main className="flex min-h-screen items-center justify-center bg-signal-sidebar dark:bg-signal-bgDark px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-signal-blue">
            <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Signal</h1>
          <p className="mt-1 text-sm text-signal-muted dark:text-signal-mutedDark">
            Fast, simple, secure messaging
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-signal-sidebarDark p-6 shadow-sm border border-signal-border dark:border-signal-borderDark">
          {step === "phone" && (
            <form onSubmit={submitPhone} className="space-y-4">
              <h2 className="text-lg font-semibold">Enter your phone number</h2>
              <p className="text-xs text-signal-muted dark:text-signal-mutedDark">
                You&apos;ll receive a verification code (mocked for this demo).
              </p>
              <input
                className={inputCls}
                placeholder="+1 555 000 0001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
              <button className={buttonCls} disabled={busy || phone.trim().length < 6}>
                Next
              </button>
              <p className="text-center text-xs text-signal-muted dark:text-signal-mutedDark">
                Try a seeded account: +15550000001 (Alice)
              </p>
            </form>
          )}

          {step === "register" && (
            <form onSubmit={submitRegister} className="space-y-4">
              <h2 className="text-lg font-semibold">Create your profile</h2>
              <p className="text-xs text-signal-muted dark:text-signal-mutedDark">
                New number <span className="font-medium">{phone}</span> — set up your account.
              </p>
              <input
                className={inputCls}
                placeholder="Username (letters, numbers, _ .)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
              <input
                className={inputCls}
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <button className={buttonCls} disabled={busy}>
                Continue
              </button>
              <button
                type="button"
                className="w-full text-center text-xs text-signal-blue"
                onClick={() => setStep("phone")}
              >
                Use a different number
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={submitOtp} className="space-y-4">
              <h2 className="text-lg font-semibold">Enter verification code</h2>
              <p className="text-xs text-signal-muted dark:text-signal-mutedDark">
                We sent a code to <span className="font-medium">{phone}</span>. Demo code:{" "}
                <span className="font-mono font-semibold">{otpHint}</span>
              </p>
              <input
                className={`${inputCls} text-center font-mono text-lg tracking-[0.4em]`}
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
              <button className={buttonCls} disabled={busy || otp.length !== 6}>
                Verify
              </button>
              <button
                type="button"
                className="w-full text-center text-xs text-signal-blue"
                onClick={() => setStep("phone")}
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
