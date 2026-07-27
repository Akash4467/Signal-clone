"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { LockIcon } from "@/components/ui/icons";
import { useAuthStore } from "@/store/auth";
import { useToastStore } from "@/store/toast";
import { wsClient } from "@/lib/ws";

type Section = "main" | "profile" | "privacy" | "notifications" | "appearance" | "linked" | "safety";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const toast = useToastStore((s) => s.show);
  const router = useRouter();

  const [section, setSection] = useState<Section>("main");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [about, setAbout] = useState(user?.about ?? "");
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  if (!user) return null;

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({ display_name: displayName, about });
      toast("Profile updated", "success");
      setSection("main");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    wsClient.disconnect();
    logout();
    router.replace("/welcome");
  }

  const itemCls =
    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5";
  const backBtn = (
    <button onClick={() => setSection("main")} className="mb-3 text-xs font-medium text-signal-blue">
      ← Back to settings
    </button>
  );
  const placeholder = (text: string) => (
    <div>
      {backBtn}
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <LockIcon className="h-6 w-6 text-signal-muted" />
        <p className="text-sm font-medium">{text}</p>
        <p className="text-xs text-signal-muted dark:text-signal-mutedDark">Coming soon</p>
      </div>
    </div>
  );

  return (
    <Modal title="Settings" onClose={onClose}>
      {section === "main" && (
        <div className="space-y-1">
          <button onClick={() => setSection("profile")} className={`${itemCls} !py-3`}>
            <span className="flex items-center gap-3">
              <Avatar name={user.display_name} color={user.avatar_color} size={44} />
              <span>
                <span className="block font-medium">{user.display_name}</span>
                <span className="block text-xs text-signal-muted dark:text-signal-mutedDark">
                  @{user.username} · {user.phone}
                </span>
              </span>
            </span>
            <span className="text-xs text-signal-blue">Edit</span>
          </button>

          <div className="border-t border-signal-border dark:border-signal-borderDark pt-1" />

          <button onClick={() => setSection("privacy")} className={itemCls}>
            <span>Privacy</span><span className="text-signal-muted">›</span>
          </button>
          <button onClick={() => setSection("notifications")} className={itemCls}>
            <span>Notifications</span><span className="text-signal-muted">›</span>
          </button>
          <button onClick={() => setSection("appearance")} className={itemCls}>
            <span>Appearance</span><span className="text-signal-muted">›</span>
          </button>
          <button onClick={() => setSection("linked")} className={itemCls}>
            <span>Linked devices</span><span className="text-signal-muted">›</span>
          </button>
          <button onClick={() => setSection("safety")} className={itemCls}>
            <span>Safety number</span><span className="text-signal-muted">›</span>
          </button>
          <button onClick={() => toast("Stories coming soon")} className={itemCls}>
            <span>Stories</span><span className="text-signal-muted">›</span>
          </button>

          <div className="border-t border-signal-border dark:border-signal-borderDark pt-1" />

          <button onClick={handleLogout} className={`${itemCls} text-red-500`}>
            Log out
          </button>
        </div>
      )}

      {section === "profile" && (
        <form onSubmit={saveProfile} className="space-y-3">
          {backBtn}
          <div className="flex justify-center">
            <Avatar name={displayName || user.display_name} color={user.avatar_color} size={72} />
          </div>
          <label className="block text-xs font-medium text-signal-muted dark:text-signal-mutedDark">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-signal-border dark:border-signal-borderDark bg-transparent px-3 py-2 text-sm text-signal-text dark:text-signal-textDark outline-none focus:border-signal-blue"
              required
            />
          </label>
          <label className="block text-xs font-medium text-signal-muted dark:text-signal-mutedDark">
            About
            <input
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="mt-1 w-full rounded-lg border border-signal-border dark:border-signal-borderDark bg-transparent px-3 py-2 text-sm text-signal-text dark:text-signal-textDark outline-none focus:border-signal-blue"
            />
          </label>
          <button
            disabled={busy}
            className="w-full rounded-full bg-signal-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}

      {section === "appearance" && (
        <div>
          {backBtn}
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm">
            <span>Dark mode</span>
            <button
              onClick={toggleDark}
              className={`relative h-6 w-11 rounded-full transition-colors ${dark ? "bg-signal-blue" : "bg-black/20 dark:bg-white/20"}`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </div>
          <p className="px-3 text-xs text-signal-muted dark:text-signal-mutedDark">
            Chat color and wallpaper customization coming soon.
          </p>
        </div>
      )}

      {section === "safety" && (
        <div>
          {backBtn}
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <LockIcon className="h-8 w-8 text-signal-blue" />
            <p className="text-sm font-medium">Your safety number</p>
            <p className="rounded-lg bg-black/5 dark:bg-white/10 px-4 py-3 font-mono text-xs tracking-wider">
              {String(user.id * 73561).padStart(5, "0")} 42901 88317 05246
              <br />
              91133 27085 66412 30974
            </p>
            <p className="max-w-xs text-xs text-signal-muted dark:text-signal-mutedDark">
              End-to-end encryption is mocked in this demo. In real Signal, you would compare this
              number with your contact to verify the connection.
            </p>
          </div>
        </div>
      )}

      {section === "privacy" && placeholder("Privacy settings")}
      {section === "notifications" && placeholder("Notification settings")}
      {section === "linked" && placeholder("Linked devices")}
    </Modal>
  );
}
