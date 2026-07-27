"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatPane } from "@/components/chat/ChatPane";
import { getToken } from "@/lib/api";
import { wsClient } from "@/lib/ws";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";

export default function ChatPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const loadSession = useAuthStore((s) => s.loadSession);
  const init = useChatStore((s) => s.init);
  const pruneTyping = useChatStore((s) => s.pruneTyping);
  const activeId = useChatStore((s) => s.activeId);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/welcome");
      return;
    }
    void loadSession();
  }, [router, loadSession]);

  useEffect(() => {
    if (!loading && !user) router.replace("/welcome");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    init();
    const interval = setInterval(pruneTyping, 1500);
    return () => clearInterval(interval);
  }, [user, init, pruneTyping]);

  useEffect(() => {
    return () => wsClient.disconnect();
  }, []);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden">
      <div className={`${activeId !== null ? "hidden md:flex" : "flex"} h-full w-full md:w-auto`}>
        <Sidebar />
      </div>
      <div className={`${activeId === null ? "hidden md:flex" : "flex"} h-full flex-1`}>
        <ChatPane />
      </div>
    </main>
  );
}
