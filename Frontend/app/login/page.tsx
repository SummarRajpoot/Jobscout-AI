"use client";

import React, { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  return (
    <div className="relative min-h-dvh bg-[#0A0806] text-[#F5EFE6] selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/3 h-[550px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500/12 via-yellow-600/5 to-transparent blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[450px] w-[600px] rounded-full bg-gradient-to-tl from-amber-600/10 via-amber-800/5 to-transparent blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#1A140E_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />
      </div>

      <main className="relative z-10 min-h-dvh">
        <section className="grid min-h-dvh grid-cols-1 md:grid-cols-5">
          {/* Left Hero / Brand Pane */}
          <div className="relative flex items-center px-6 py-12 md:col-span-3 md:px-12 lg:px-16 border-b md:border-b-0 md:border-r border-amber-500/15">
            <div className="relative w-full max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-[#14100B]/90 backdrop-blur-md p-3.5 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#1F1710] to-[#120D08] shadow-inner text-amber-400">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-serif-luxury text-xl font-bold tracking-wider text-white">
                    JobScout <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">AI</span>
                  </h1>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-500/80">
                    Executive Career Intelligence
                  </p>
                </div>
              </div>

              {/* Headline */}
              <h2 className="mt-10 font-serif-luxury text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Claim Your Dream Career With{" "}
                <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  Elite AI
                </span>
              </h2>

              <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-lg">
                Enter the confidential executive workspace to deploy autonomous job recon, multi-vector fit analysis,
                and real-time intelligence parsing.
              </p>

              {/* Feature Tags */}
              <div className="mt-8 flex flex-wrap gap-2.5">
                {[
                  "✦ Autonomous Agent",
                  "⚡ Real-Time Market Recon",
                  "◆ Precision Fit Scoring",
                ].map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center rounded-xl border border-amber-500/20 bg-[#120E09]/80 px-3.5 py-1.5 font-mono text-xs font-medium text-amber-300/90 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Authentication Pane */}
          <div className="flex items-center bg-[#0E0A07]/90 backdrop-blur-xl px-6 py-12 md:col-span-2 md:px-10 lg:px-12 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
            <div className="mx-auto w-full max-w-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                Access Gateway
              </span>
              <h3 className="mt-2 font-serif-luxury text-3xl font-bold text-white tracking-wide">
                Welcome Back
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Authenticate to initialize your executive concierge.
              </p>

              <div className="mt-8 space-y-3.5">
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.5)]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M21.35 11.1H12v2.98h5.35c-.78 2.27-2.78 3.55-5.35 3.55a5.83 5.83 0 0 1 0-11.66c1.48 0 2.72.53 3.7 1.39l2.07-2.07C16.57 3.37 14.47 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12S6.76 21.5 12 21.5c5.4 0 9-3.79 9-9.13 0-.62-.08-1.08-.15-1.27Z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-amber-500/15" />
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">or</span>
                  <div className="h-px flex-1 bg-amber-500/15" />
                </div>

                <button
                  type="button"
                  onClick={() => signIn("github", { callbackUrl: "/" })}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-amber-500/25 bg-[#14100B] px-4 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-amber-200 transition-all hover:bg-amber-500/10 hover:border-amber-400/50 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.57.1.78-.25.78-.55v-2c-3.17.7-3.84-1.34-3.84-1.34-.52-1.33-1.26-1.68-1.26-1.68-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.65 1.24 3.3.95.1-.74.4-1.24.72-1.53-2.53-.29-5.19-1.27-5.19-5.64 0-1.25.45-2.27 1.17-3.07-.12-.29-.5-1.46.11-3.04 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.14-1.17 3.14-1.17.61 1.58.23 2.75.11 3.04.73.8 1.17 1.82 1.17 3.07 0 4.38-2.66 5.35-5.2 5.64.41.35.77 1.05.77 2.12v3.14c0 .3.2.65.79.55A11.5 11.5 0 0 0 12 .5Z" />
                  </svg>
                  <span>Continue with GitHub</span>
                </button>
              </div>

              <p className="mt-8 text-center font-mono text-[10px] text-zinc-500">
                End-to-End Encrypted Session • Confidential Concierge
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
