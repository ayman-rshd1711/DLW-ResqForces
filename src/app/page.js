"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

function page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push("/emergency-page");
    })();
  }, [router]);

  async function handleSignup() {
    setMsg("");
    if (!email || !password) return setMsg("Email and password required.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setMsg("Signup failed: " + error.message);
    setMsg("Signed up! Now log in.");
  }

  async function handleLogin() {
    setMsg("");
    if (!email || !password) return setMsg("Email and password required.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) return setMsg("Login failed: " + error.message);
    router.push("/emergency-page");
  }

  async function handleGoogle() {
    setMsg("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/emergency-page" },
    });
    setLoading(false);
    if (error) setMsg("Google login failed: " + error.message);
  }
  return (
    <main className="relative min-h-screen grid place-items-center p-6">
      <div className="fixed inset-0 -z-10 h-full w-full">
        <Image
          src="/heartbeat.png"
          alt="background"
          fill
          priority
          className="object-cover"
        />
        {/* Darkens the image so you can actually see your form */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="w-full max-w-[65%] h-[600px] bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-2xl flex flex-col items-strecth justify-evenly">
        <h1 className="text-4xl font-black text-white mb-8 text-center tracking-tight">
          LOGIN
        </h1>

        <button
          className="hover:bg-blue-500 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 text-xl font-bold text-slate-700 shadow-sm transition-all active:scale-95 disabled:opacity-70 hover:pointer-cursor"
          onClick={handleGoogle}
          disabled={loading}
        >
          <img
            className="h-5 w-5"
            src="/google.svg"
            alt=""
            aria-hidden="true"
          />
          Continue with Google
        </button>

        <div className="relative my-8 grid place-items-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-100"></span>
          </div>
          <span className="relative bg-white px-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            or
          </span>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-bold text-slate-600">
            Email
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block text-sm font-bold text-slate-600">
            Password
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button
            className="rounded-xl border-2 border-blue-500 bg-transparent py-3 text-sm font-bold text-blue-600 transition-all hover:bg-blue-50 active:scale-95 disabled:opacity-50"
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? "..." : "Sign up"}
          </button>

          <button
            className="rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "..." : "Log in"}
          </button>
        </div>

        {msg && (
          <p className="mt-6 text-center text-sm font-medium text-red-500 animate-pulse">
            {msg}
          </p>
        )}
      </div>
    </main>
  );
}

export default page;
