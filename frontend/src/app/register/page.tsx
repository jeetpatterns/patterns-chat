'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  User,
  Mail,
  Lock,
  MessageSquare,
  LogIn,
  UserPlus,
  X,
  PlusCircle,
  ShieldCheck,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface PresetGoogleAccount {
  name: string;
  email: string;
  avatarUrl: string;
}

const PRESET_GOOGLE_ACCOUNTS: PresetGoogleAccount[] = [
  {
    name: 'Yash Shah',
    email: 'yshah0611@gmail.com',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Yash%20Shah&backgroundColor=4285F4',
  },
  {
    name: 'Love Shah',
    email: 'loveshah@gmail.com',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Love%20Shah&backgroundColor=34A853',
  },
  {
    name: 'Patterns Team',
    email: 'team@patterns.chat',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Patterns%20Team&backgroundColor=EA4335',
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function RegisterPage() {
  const router = useRouter();
  const { user, register, loginWithGoogle, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Google Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.push('/workspaces');
    }
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(name, email, password);
      router.push('/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartGoogleOAuth() {
    setError(null);
    setIsGoogleSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/oauth/google/url`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setShowGoogleModal(true);
      }
    } catch (err) {
      console.warn('Real Google OAuth endpoint unreachable, falling back to account picker modal:', err);
      setShowGoogleModal(true);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function executeGoogleLogin(selectedEmail: string, selectedName?: string, selectedAvatar?: string) {
    setError(null);
    setIsGoogleSubmitting(true);

    try {
      await loginWithGoogle(selectedEmail, selectedName);
      setShowGoogleModal(false);
      router.push('/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed');
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  function handleCustomGoogleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    executeGoogleLogin(customGoogleEmail.trim().toLowerCase(), customGoogleName.trim() || undefined);
  }

  return (
    <div className="h-screen max-h-screen w-full bg-[#F8FAFC] bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] flex flex-col justify-between relative overflow-hidden select-none selection:bg-indigo-500 selection:text-white antialiased">
      {/* Ambient Blurred Glow Shapes */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-200/40 via-purple-200/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-200/40 via-indigo-200/20 to-transparent blur-3xl pointer-events-none" />

      {/* ─────────────────────────────────────────────────────────────
          TOP BRAND HEADER (Fixed, Non-Sticky, Single Screen Fit)
      ───────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-slate-200/90 bg-white/90 backdrop-blur-md shrink-0 relative z-20 shadow-2xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-14 sm:h-15 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/patterns-icon.png?v=2"
            alt="Patterns Chat"
            className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-2xs"
          />
          <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-tight text-slate-900">
            <span>Patterns</span>
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent font-black">
              Chat
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:inline">
            Already have an account?
          </span>
          <Link
            href="/login"
            className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border border-indigo-200/90 hover:border-indigo-300 bg-white hover:bg-indigo-50/70 text-indigo-700 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-2xs group"
          >
            <span>Sign In</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT: 2-COLUMN BALANCED SPLIT (Zero Page Scroll)
      ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex-1 min-h-0 flex items-center justify-center w-full relative z-10 py-1 sm:py-2">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-14 items-center">
          
          {/* ── LEFT COLUMN: Brand Story & Dual Platform Pillars ────────── */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-center pr-2">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold mb-2 self-start shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Get Started with Patterns Chat</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl lg:text-[34px] xl:text-[40px] font-black tracking-tight text-slate-900 leading-[1.12]">
              Join Your Team on
              <span className="block bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mt-0.5">
                Patterns Chat.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-lg">
              Create your account in 30 seconds to collaborate in real-time channels, join high-definition video syncs, and manage your customer emails together.
            </p>

            {/* Dual Module Showcase Cards */}
            <div className="mt-3.5 space-y-2.5 max-w-xl">
              {/* Pillar 1: Team Chat */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-xs flex items-start gap-3 hover:border-indigo-200 transition-colors">
                <div className="h-8.5 w-8.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">Team Chat Module</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Real-time
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                    Channels, direct messages, threads, emoji reactions, and live WebRTC audio/video meetings with screen sharing.
                  </p>
                </div>
              </div>

              {/* Pillar 2: Customer Mail Studio */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-xs flex items-start gap-3 hover:border-violet-200 transition-colors">
                <div className="h-8.5 w-8.5 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0 shadow-2xs">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">Customer Mail Studio</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Gmail & Outlook
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                    Real-time bidirectional Gmail/Outlook sync, shared group mailboxes linked to team channels, and full-screen email viewer.
                  </p>
                </div>
              </div>
            </div>

            {/* Social Proof & Security Badges */}
            <div className="mt-3.5 flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-1.5">
                  {['1534528741775-53994a69daeb', '1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e'].map((id) => (
                    <img
                      key={id}
                      src={`https://images.unsplash.com/photo-${id}?w=80&auto=format&fit=crop&q=80`}
                      alt="Teammate"
                      className="h-6 w-6 rounded-full border border-white object-cover shadow-2xs"
                    />
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-slate-800 ml-1">4.9 / 5</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">
                    Trusted by 10,000+ teams worldwide
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-white/70 border border-slate-200/70 rounded-xl px-2.5 py-1 shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Single Device Protection</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Perfectly Proportioned Auth Card (Single Page) ─── */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-200/90 shadow-[0_16px_40px_rgba(79,70,229,0.08)] p-5 sm:p-6 relative shrink-0 backdrop-blur-md">
              
              {/* Card Header with HD Patterns Logo */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <img
                    src="/patterns-icon.png?v=2"
                    alt="Patterns Chat"
                    className="h-7 w-auto object-contain drop-shadow-2xs"
                  />
                  <div className="flex items-center gap-1 font-black text-lg tracking-tight text-slate-900">
                    <span>Patterns</span>
                    <span className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent font-black">
                      Chat
                    </span>
                  </div>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                  Create Your Account
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
                  Join your teammates and start collaborating today.
                </p>
              </div>

              {/* Segmented Pill Switcher */}
              <div className="mt-3 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 flex items-center gap-1 shadow-inner-2xs">
                <Link
                  href="/login"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold text-xs transition-all cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-400" />
                  <span>Sign In</span>
                </Link>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white text-indigo-700 shadow-xs ring-1 ring-slate-900/5 font-extrabold text-xs transition-all cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-2 text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span className="text-xs font-semibold leading-snug">{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-2.5 space-y-2">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Full Name <span className="text-indigo-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-8.5 pr-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Email Address <span className="text-indigo-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-8.5 pr-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-0.5">
                    Password <span className="text-indigo-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full pl-8.5 pr-8.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full mt-1 py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Free Account</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80" />
                </div>
                <span className="relative bg-white px-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  or continue with
                </span>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleStartGoogleOAuth}
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full py-1.5 sm:py-2 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-300 disabled:opacity-50 cursor-pointer group"
                title="Sign up with your Google or Google Workspace account"
              >
                {isGoogleSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Dev / Test Preset Accounts Shortcut */}
              <div className="mt-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors font-medium underline cursor-pointer"
                >
                  Quick Test Account Picker
                </button>
              </div>

              {/* Card Footer */}
              <div className="mt-2 pt-1.5 border-t border-slate-100 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER (Fixed, Single Screen Fit)
      ───────────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-slate-200/90 bg-white/70 backdrop-blur-md z-20 shrink-0 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-slate-400 font-medium">
          <span className="text-[11px] text-slate-400 font-medium">© 2026 Patterns Chat Technologies. Quality. Delivered.</span>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Unified Team Chat</span>
            <span>•</span>
            <span>Customer Mail Studio</span>
            <span>•</span>
            <span>Single Device Security</span>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          GOOGLE ACCOUNT CHOOSER MODAL
      ───────────────────────────────────────────────────────────── */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    Sign up with Google
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose an account to continue to Patterns Chat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Account List */}
            <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto">
              {PRESET_GOOGLE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => executeGoogleLogin(acc.email, acc.name, acc.avatarUrl)}
                  disabled={isGoogleSubmitting}
                  className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition-all text-left group cursor-pointer"
                >
                  <img
                    src={acc.avatarUrl}
                    alt={acc.name}
                    className="h-8 w-8 rounded-full border border-slate-200 shrink-0 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{acc.email}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                </button>
              ))}
            </div>

            {/* Custom Google Account Input Toggle */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              {!showCustomGoogleInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleInput(true)}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-bold text-indigo-600 hover:bg-white rounded-xl border border-dashed border-indigo-200 transition-all cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Use another Google account</span>
                </button>
              ) : (
                <form onSubmit={handleCustomGoogleSubmit} className="space-y-2">
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Your Name (e.g. Alex Rivera)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="your-google-email@gmail.com"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isGoogleSubmitting || !customGoogleEmail.trim()}
                      className="flex-1 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
