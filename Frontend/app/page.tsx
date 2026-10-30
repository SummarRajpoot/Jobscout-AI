"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UIState = "UPLOAD" | "SEARCHING" | "RESULTS";

type Job = {
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  description?: string | null;
};

type ChatRole = "user" | "ai";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export default function Home() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const router = useRouter();
  const { data: session, status } = useSession();

  const [uiState, setUiState] = useState<UIState>("UPLOAD");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const steps = useMemo(
    () => [
      { tag: "STAGE 01", name: "Profile Ingestion & CV Parsing" },
      { tag: "STAGE 02", name: "Autonomous Neural Query Generation" },
      { tag: "STAGE 03", name: "Real-Time Global Market Recon" },
      { tag: "STAGE 04", name: "Multi-Dimensional Fit Ranking" },
    ],
    [],
  );

  const inputRef = useRef<HTMLInputElement | null>(null);

  const isValidFile = (f: File) => {
    const name = f.name.toLowerCase();
    return name.endsWith(".pdf") || name.endsWith(".docx");
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const reset = () => {
    setUiState("UPLOAD");
    setDragActive(false);
    setFile(null);
    setUploading(false);
    setSessionId(null);
    setJobs([]);
    setError(null);
    setActiveStep(0);
    setChatMessages([]);
    setChatInput("");
    setChatTyping(false);
    setChatError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const scoreBadgeStyle = (score: number) => {
    if (score >= 85) {
      return "border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]";
    }
    if (score >= 65) {
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    }
    return "border-zinc-700/60 bg-zinc-800/40 text-zinc-400";
  };

  const upload = async () => {
    setError(null);
    if (!file) {
      setError("Please select a verified PDF or DOCX dossier first.");
      return;
    }
    if (!isValidFile(file)) {
      setError("Unsupported format. Accepted formats are PDF and DOCX only.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE}/upload-cv`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Ingestion failed (${res.status})`);
      }

      const data = (await res.json()) as { session_id?: string };
      if (!data.session_id) throw new Error("Upload succeeded but session identifier was not returned.");

      setSessionId(data.session_id);
      setUiState("SEARCHING");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingestion failed.");
      setUiState("UPLOAD");
    } finally {
      setUploading(false);
    }
  };

  const quickQuestions = useMemo(
    () => [
      "Which role delivers the highest strategic alignment?",
      "Identify high-priority skill gaps for executive roles",
      "How should I recalibrate my CV positioning?",
      "Estimate competitive compensation benchmarks",
      "Which strategic open-source projects would maximize impact?",
      "Generate executive-level interview talking points",
    ],
    [],
  );

  const sendChat = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !sessionId) return;

    setChatError(null);
    setChatTyping(true);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: trimmed }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Transmission failed (${res.status})`);
      }

      const data = (await res.json()) as { message?: string; response?: string; content?: string; reply?: string };
      const aiText = (data.reply ?? data.message ?? data.response ?? data.content ?? "").toString().trim();
      if (!aiText) throw new Error("AI intelligence returned empty transmission.");

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: aiText,
        createdAt: Date.now(),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Intelligence consultation failed.");
    } finally {
      setChatTyping(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages.length, chatTyping]);

  useEffect(() => {
    if (uiState !== "SEARCHING" || !sessionId) return;

    const controller = new AbortController();
    let mounted = true;

    setActiveStep(0);
    const t = window.setInterval(() => {
      setActiveStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 1200);

    (async () => {
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/search-jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Search reconnaissance failed (${res.status})`);
        }

        const data = (await res.json()) as { jobs?: Job[] };
        const gotJobs = Array.isArray(data.jobs) ? data.jobs : [];

        if (!mounted) return;
        setJobs(gotJobs);
        setUiState("RESULTS");
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Search reconnaissance failed.");
        setUiState("UPLOAD");
      } finally {
        window.clearInterval(t);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(t);
    };
  }, [uiState, sessionId, steps.length]);

  return (
    <div className="relative min-h-dvh bg-[#0A0806] text-[#F5EFE6] selection:bg-amber-500/30 selection:text-amber-200">
      {/* Executive Obsidian & Gold Background Ambience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-48 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/12 via-yellow-600/5 to-transparent blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-amber-600/8 via-amber-800/5 to-transparent blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-amber-700/8 via-yellow-500/4 to-transparent blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1A140E_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        {/* ================================================================= */}
        {/* 1. HEADER / NAVBAR                                                */}
        {/* ================================================================= */}
        <header className="mb-14">
          <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-amber-500/15 pb-6">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#1E1710] to-[#120D08] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                {/* Crown / Radar Icon */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif-luxury text-lg font-bold tracking-wider text-white">
                    JobScout <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">AI</span>
                  </span>
                </div>
                <div className="text-[11px] font-mono tracking-widest uppercase text-amber-500/80">
                  Executive Intelligence
                </div>
              </div>
            </div>

            {/* Right-Side Status Chips */}
            <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
              {/* Live Pulse Neural Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-[#14100B]/90 backdrop-blur-md px-3.5 py-1.5 text-xs text-amber-300 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]" />
                </span>
                <span className="font-mono text-[11px] font-medium tracking-wide">Groq · Gemini Neural</span>
              </div>

              {/* Project Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-[#120E09]/80 px-3.5 py-1.5 text-xs font-mono text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600/70" />
                <span className="text-[11px]">UAF 6th Edition</span>
              </div>

              {/* User Profile Pill */}
              {session?.user && (
                <div className="flex items-center gap-2.5 rounded-full border border-amber-500/25 bg-[#17120D]/90 px-2.5 py-1 backdrop-blur-md shadow-sm">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      className="h-6 w-6 rounded-full ring-1 ring-amber-400/40"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                      {(session.user.name?.[0] ?? "U").toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[130px] truncate text-xs font-medium text-zinc-200">
                    {session.user.name ?? "Executive"}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
                  >
                    Exit
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* =============================================================== */}
          {/* 2. HERO SECTION                                                 */}
          {/* =============================================================== */}
          <div className="mt-12 max-w-3xl">
            {/* Bespoke Career Concierge Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 px-4 py-1.5 text-xs text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-sm">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 text-amber-400"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.2L12 16.8 5.7 21.2 8 14 2 9.4h7.6z" />
              </svg>
              <span className="font-mono text-[11px] tracking-wider uppercase font-semibold text-amber-200">
                Bespoke Career Concierge
              </span>
            </div>

            {/* High-Impact Headline */}
            <h1 className="mt-5 text-balance text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Claim Your Dream Career With{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                Elite Autonomous AI
              </span>
            </h1>

            {/* Value Proposition Subtext */}
            <p className="mt-5 max-w-2xl text-pretty text-sm sm:text-base leading-7 text-zinc-400">
              Submit your curriculum vitae to initialize our autonomous intelligence agent. It conducts
              deep multi-source recon, eliminates noise, and strategically ranks top opportunities tailored to your exact caliber.
            </p>

            {/* 3 Feature Badges in Dark Glass Capsules */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              {[
                { label: "Autonomous Agent", icon: "✦" },
                { label: "Live Market Recon", icon: "⚡" },
                { label: "Top 1% Fit Ranking", icon: "◆" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-[#14100B]/80 px-3.5 py-1.5 text-xs font-mono font-medium text-amber-300/90 backdrop-blur-md shadow-sm hover:border-amber-400/40 transition-colors"
                >
                  <span className="text-amber-400 text-xs">{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 3. UPLOAD VAULT (INTERACTIVE FILE DROPZONE)                        */}
        {/* ================================================================= */}
        {uiState === "UPLOAD" && (
          <section className="grid gap-8">
            <div
              className={[
                "group relative rounded-3xl border bg-[#110D09]/90 p-7 sm:p-9 backdrop-blur-xl transition-all duration-300",
                "shadow-[0_0_60px_-15px_rgba(245,158,11,0.15)]",
                dragActive
                  ? "border-amber-400 ring-4 ring-amber-500/20 bg-[#16100B]"
                  : "border-amber-500/25 hover:border-amber-400/50",
              ].join(" ")}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                const f = e.dataTransfer.files?.[0];
                if (!f) return;
                if (!isValidFile(f)) {
                  setError("Unsupported format. Please upload an official PDF or DOCX dossier.");
                  return;
                }
                setError(null);
                setFile(f);
              }}
            >
              {/* Header with Title & Privacy Badge */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-amber-500/15 pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
                    <h2 className="font-serif-luxury text-xl font-bold tracking-wide text-white">
                      Document Ingestion Vault
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Precision parsing engine • Accepted: <span className="font-mono text-amber-300">PDF</span> or{" "}
                    <span className="font-mono text-amber-300">DOCX</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Privacy Chip */}
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-300">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-3 w-3 text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Private & Sandboxed</span>
                  </div>

                  {/* Executive CTA Button: Initiate Match */}
                  <button
                    type="button"
                    onClick={upload}
                    disabled={!file || uploading}
                    className={[
                      "relative inline-flex items-center justify-center gap-2.5 rounded-xl px-5 py-2.5 text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300",
                      "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.35)]",
                      !file || uploading
                        ? "opacity-50 cursor-not-allowed saturate-50"
                        : "hover:scale-[1.03] hover:shadow-[0_0_35px_rgba(245,158,11,0.5)] active:scale-95",
                    ].join(" ")}
                  >
                    {uploading ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                        <span>Ingesting…</span>
                      </>
                    ) : (
                      <>
                        <span>Initiate Match</span>
                        <span className="text-black/80 font-bold">➔</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Modern Drag & Drop Zone */}
              <div
                onClick={() => inputRef.current?.click()}
                className={[
                  "mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 cursor-pointer transition-all duration-300",
                  dragActive
                    ? "border-amber-400 bg-amber-500/10"
                    : "border-amber-500/25 bg-[#0D0906]/60 hover:border-amber-400/50 hover:bg-[#140F0A]/80",
                ].join(" ")}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (!f) return setFile(null);
                    if (!isValidFile(f)) {
                      setFile(null);
                      setError("Unsupported format. Please upload a PDF or DOCX dossier.");
                      return;
                    }
                    setError(null);
                    setFile(f);
                  }}
                />

                {/* Upload Icon */}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 to-transparent text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:scale-110 transition-transform">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-7 w-7 text-amber-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm font-semibold text-white">
                    {file ? (
                      <span className="text-amber-300 font-mono">Dossier Loaded: {file.name}</span>
                    ) : (
                      <>
                        Drop your CV here, or{" "}
                        <span className="text-amber-400 underline underline-offset-4 hover:text-amber-300">
                          browse file system
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Supports high-resolution PDF and Microsoft Word DOCX dossiers
                  </p>
                </div>
              </div>

              {/* Dynamic Selected File State */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-[#0E0A07]/80 px-4 py-3 text-xs">
                {file ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                      📄
                    </span>
                    <div>
                      <span className="font-mono text-amber-200 font-medium">{file.name}</span>
                      <span className="ml-2 text-zinc-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                    <span>No dossier staged in vault. Ready for ingestion.</span>
                  </div>
                )}

                {file && (
                  <button
                    type="button"
                    className="font-mono text-[11px] text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setError(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Error Banner with Obsidian/Ruby Alert Styling */}
              {error && (
                <div className="mt-5 rounded-2xl border border-rose-500/30 bg-[#1D0B0D]/90 p-4 text-xs font-mono text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.15)] flex items-start gap-3">
                  <span className="text-rose-400 text-sm font-bold">⚠</span>
                  <div className="flex-1 leading-relaxed">{error}</div>
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* 4. "HOW IT WORKS" SECTION (BENTO GRID)                        */}
            {/* ============================================================= */}
            <div className="rounded-3xl border border-amber-500/20 bg-[#110D09]/90 p-7 sm:p-9 backdrop-blur-xl shadow-[0_0_50px_-20px_rgba(245,158,11,0.12)]">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-amber-500/15 pb-4">
                <div>
                  <span className="font-mono text-[10px] tracking-widest uppercase text-amber-500/90 font-semibold">
                    Autonomous Execution Pipeline
                  </span>
                  <h3 className="font-serif-luxury text-lg font-bold text-white tracking-wide">
                    How JobScout AI Operates
                  </h3>
                </div>
                <div className="font-mono text-[11px] text-zinc-400">
                  Zero Prompting • Pure Autonomy
                </div>
              </div>

              {/* 3-Column Bento Grid */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {/* Stage 01 */}
                <div className="group relative rounded-2xl border border-amber-500/15 bg-gradient-to-b from-[#16110B] to-[#0E0A07] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      STAGE 01
                    </span>
                    <span className="text-amber-400/40 font-mono text-xs">01/03</span>
                  </div>

                  <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 group-hover:scale-110 transition-transform">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>

                  <h4 className="mt-4 font-semibold text-sm text-white">Profile Ingestion</h4>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    Deep structural extraction breaks down your hard competencies, trajectory, leadership credentials,
                    and industry specialties into verified vectors.
                  </p>
                </div>

                {/* Stage 02 */}
                <div className="group relative rounded-2xl border border-amber-500/15 bg-gradient-to-b from-[#16110B] to-[#0E0A07] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      STAGE 02
                    </span>
                    <span className="text-amber-400/40 font-mono text-xs">02/03</span>
                  </div>

                  <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 group-hover:scale-110 transition-transform">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <circle cx="11" cy="11" r="3" />
                    </svg>
                  </div>

                  <h4 className="mt-4 font-semibold text-sm text-white">Global Market Recon</h4>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    The autonomous agent synthesizes optimal Boolean query matrices to comb live enterprise portals,
                    bypassing outdated recruiter spam.
                  </p>
                </div>

                {/* Stage 03 */}
                <div className="group relative rounded-2xl border border-amber-500/15 bg-gradient-to-b from-[#16110B] to-[#0E0A07] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      STAGE 03
                    </span>
                    <span className="text-amber-400/40 font-mono text-xs">03/03</span>
                  </div>

                  <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 group-hover:scale-110 transition-transform">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>

                  <h4 className="mt-4 font-semibold text-sm text-white">Strategic Fit Rank</h4>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    Multi-tier LLM reasoning evaluates real requirements against your background,
                    benchmarking precision match scores (0-100%).
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* 5. SEARCHING STATE (NEURAL AGENT IN PROGRESS)                     */}
        {/* ================================================================= */}
        {uiState === "SEARCHING" && (
          <section className="rounded-3xl border border-amber-500/25 bg-[#110D09]/95 p-8 sm:p-10 backdrop-blur-xl shadow-[0_0_60px_-10px_rgba(245,158,11,0.2)]">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-amber-500/15 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-ping" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                    Reconnaissance In Progress
                  </span>
                </div>
                <h2 className="mt-1 font-serif-luxury text-2xl font-bold text-white tracking-wide">
                  Autonomous Agent Deployed
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Target Session: <span className="font-mono text-amber-300">{sessionId}</span>
                </p>
              </div>

              {/* Gold Loading Indicator */}
              <div className="flex items-center gap-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-mono text-amber-300">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                <span className="tracking-wider uppercase">Active In Market</span>
              </div>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="mt-8 grid gap-3.5">
              {steps.map((st, idx) => {
                const done = idx < activeStep;
                const active = idx === activeStep;
                return (
                  <div
                    key={st.tag}
                    className={[
                      "flex items-center justify-between rounded-xl border px-5 py-3.5 text-xs transition-all duration-300",
                      done
                        ? "border-amber-500/30 bg-[#16120D] text-amber-300"
                        : active
                          ? "border-amber-400/60 bg-gradient-to-r from-amber-500/15 to-transparent text-white shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                          : "border-zinc-800/60 bg-[#0C0906]/50 text-zinc-400",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={[
                          "inline-flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[11px] font-bold",
                          done
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : active
                              ? "bg-amber-400 text-black shadow-[0_0_12px_#F59E0B]"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700/50",
                        ].join(" ")}
                      >
                        {done ? "✓" : idx + 1}
                      </span>
                      <div>
                        <span className="font-mono text-[10px] text-amber-400/70 mr-2">[{st.tag}]</span>
                        <span className="font-medium text-sm">{st.name}</span>
                      </div>
                    </div>

                    {active && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 animate-pulse font-semibold">
                        Executing…
                      </span>
                    )}
                    {done && (
                      <span className="font-mono text-[10px] text-amber-500/80">Completed</span>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-500/30 bg-[#1D0B0D]/90 p-4 text-xs font-mono text-rose-300">
                {error}
              </div>
            )}
          </section>
        )}

        {/* ================================================================= */}
        {/* 6. RESULTS SECTION                                                */}
        {/* ================================================================= */}
        {uiState === "RESULTS" && (
          <section className="grid gap-8">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-4 rounded-3xl border border-amber-500/20 bg-[#110D09]/90 p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)]">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                  Reconnaissance Complete
                </span>
                <h2 className="font-serif-luxury text-2xl font-bold text-white tracking-wide">
                  Top Strategic Matches
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Synthesized <span className="font-mono text-amber-300 font-bold">{jobs.length}</span> high-affinity
                  opportunities ranked by multi-parameter match score.
                </p>
              </div>

              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-mono font-semibold text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/60 transition-all shadow-sm"
              >
                <span>↺</span>
                <span>Ingest New Dossier</span>
              </button>
            </div>

            {/* Results Grid */}
            {jobs.length === 0 ? (
              <div className="rounded-3xl border border-amber-500/20 bg-[#110D09]/80 p-12 text-center text-zinc-400 text-sm font-mono">
                No high-confidence matches met threshold criteria. Please try another CV or refresh query constraints.
              </div>
            ) : (
              <div className="grid gap-5">
                {jobs.map((job, idx) => (
                  <article
                    key={`${job.url}-${idx}`}
                    className="group relative rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#14100B] to-[#0E0A07] p-6 backdrop-blur-md transition-all duration-300 hover:border-amber-400/50 hover:shadow-[0_0_35px_rgba(245,158,11,0.15)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-semibold text-amber-500/80">
                            RANK #{String(idx + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <h3 className="mt-1 truncate text-lg font-bold text-white group-hover:text-amber-200 transition-colors">
                          {job.title}
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span className="font-medium text-amber-300">{job.company}</span>
                          <span className="text-zinc-600">◆</span>
                          <span className="text-zinc-300">{job.location}</span>
                        </p>
                      </div>

                      {/* Score Badge + Apply Button */}
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs font-bold tabular-nums tracking-wide",
                            scoreBadgeStyle(job.score),
                          ].join(" ")}
                        >
                          Match {Math.round(job.score)}%
                        </span>

                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 text-xs font-mono font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.45)] hover:scale-105 active:scale-95 transition-all"
                        >
                          <span>Apply</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </div>

                    {/* Reasoning / Description */}
                    <div className="mt-4 rounded-xl border border-amber-500/15 bg-[#0C0906]/90 p-4 text-xs leading-relaxed text-zinc-300">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400/70 mb-1">
                        Strategic Alignment Reasoning:
                      </p>
                      {job.description?.trim()
                        ? job.description
                        : "Direct relevance verified based on core skill intersection and background telemetry."}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================================================================= */}
        {/* 7. AI CAREER CHAT CONCIERGE                                       */}
        {/* ================================================================= */}
        {sessionId && (
          <section className="mt-12 rounded-3xl border border-amber-500/20 bg-[#110D09]/95 p-7 sm:p-9 backdrop-blur-xl shadow-[0_0_60px_-15px_rgba(245,158,11,0.18)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-amber-500/15 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                    Live Strategic Consultation
                  </span>
                </div>
                <h2 className="mt-1 font-serif-luxury text-xl font-bold text-white tracking-wide">
                  Executive Career Advisory
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Consult the AI regarding positioning, compensation leverage, skill upgrades, and interview prep.
                </p>
              </div>

              <div className="font-mono text-[11px] text-zinc-400">
                Session: <span className="text-amber-300">{sessionId.slice(0, 8)}…</span>
              </div>
            </div>

            {/* Quick Questions Pills */}
            <div className="mt-5 flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="rounded-full border border-amber-500/20 bg-[#14100B]/80 px-3.5 py-1.5 font-mono text-[11px] text-amber-300 hover:border-amber-400/50 hover:bg-amber-500/15 transition-all disabled:opacity-50"
                  onClick={() => {
                    setChatInput(q);
                    void sendChat(q);
                  }}
                  disabled={chatTyping}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages Log */}
            <div className="mt-5 h-[420px] overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0A0704]/90">
              <div className="h-full overflow-y-auto p-5">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500 text-xs font-mono">
                    <span className="text-2xl text-amber-500/40 mb-2">💬</span>
                    <span>AI Career Advisory is online. Select an executive prompt above or ask directly.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className={[
                          "flex w-full",
                          m.role === "user" ? "justify-end" : "justify-start",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-3.5 text-xs sm:text-sm leading-relaxed shadow-sm",
                            m.role === "user"
                              ? "border border-amber-400/30 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-amber-100 font-medium"
                              : "border border-amber-500/15 bg-[#14100B] text-zinc-200",
                          ].join(" ")}
                        >
                          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-400/70 mb-1">
                            {m.role === "user" ? "Candidate" : "JobScout Concierge"}
                          </div>
                          {m.content}
                        </div>
                      </div>
                    ))}

                    {chatTyping && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl border border-amber-500/20 bg-[#14100B] px-4 py-3 shadow-sm">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:150ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
                            <span className="ml-2 font-mono text-xs text-amber-300">Formulating advisory…</span>
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
            </div>

            {chatError && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-[#1D0B0D]/90 p-4 text-xs font-mono text-rose-300">
                {chatError}
              </div>
            )}

            {/* Chat Input Form */}
            <form
              className="mt-4 flex items-end gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                const msg = chatInput.trim();
                if (!msg) return;
                setChatInput("");
                void sendChat(msg);
              }}
            >
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Inquire with the AI executive advisor…"
                rows={2}
                className="min-h-[46px] flex-1 resize-none rounded-2xl border border-amber-500/25 bg-[#0C0906] px-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                disabled={chatTyping}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatTyping}
                className={[
                  "inline-flex h-[46px] items-center justify-center rounded-2xl px-6 font-mono text-xs font-bold uppercase tracking-wider text-black transition-all",
                  "bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]",
                  !chatInput.trim() || chatTyping
                    ? "opacity-50 cursor-not-allowed saturate-50"
                    : "hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]",
                ].join(" ")}
              >
                Send
              </button>
            </form>
          </section>
        )}

        {/* ================================================================= */}
        {/* 8. FOOTER                                                         */}
        {/* ================================================================= */}
        <footer className="mt-16 border-t border-amber-500/15 pt-8 pb-10">
          <div className="flex flex-col gap-4 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left font-mono text-[11px]">
              © 2026 <span className="text-amber-300 font-semibold">JobScout AI</span> — Executive Career Intelligence
            </div>

            {/* Developer Credit */}
            <div className="flex items-center justify-center gap-1.5 font-medium">
              <span>Engineered by</span>
              <span className="font-bold text-amber-300 font-mono">M. Summar Rajpoot</span>
              <span className="text-amber-400">✦</span>
            </div>

            {/* Links */}
            <div className="flex items-center justify-center gap-2.5 sm:justify-end">
              <a
                href="https://github.com/SummarRajpoot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-[#120E09] px-3.5 py-1 text-[11px] font-mono text-zinc-300 hover:border-amber-400/40 hover:text-amber-200 transition-colors"
              >
                <span>GitHub</span>
                <span className="text-amber-400 text-[10px]">↗</span>
              </a>

              <a
                href="https://linkedin.com/in/SummarRajpoot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-[#120E09] px-3.5 py-1 text-[11px] font-mono text-zinc-300 hover:border-amber-400/40 hover:text-amber-200 transition-colors"
              >
                <span>LinkedIn</span>
                <span className="text-amber-400 text-[10px]">↗</span>
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
