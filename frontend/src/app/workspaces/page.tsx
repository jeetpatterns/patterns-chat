'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Plus,
  ArrowRight,
  Users,
  LogOut,
  Building,
  KeyRound,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function WorkspacesPage() {
  const router = useRouter();
  const {
    user,
    workspaces,
    loading,
    logout,
    createWorkspace,
    joinWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('join');
      if (codeFromUrl) {
        setJoinCode(codeFromUrl);
        setActiveTab('join');
      }
    }
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setActionError(null);
    setActionLoading(true);
    try {
      const created = await createWorkspace(newWorkspaceName);
      setActionSuccess(`Workspace "${created.name}" created!`);
      setNewWorkspaceName('');
      setTimeout(() => {
        router.push(`/workspace/${created.id}`);
      }, 500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setActionError(null);
    setActionLoading(true);
    try {
      const joined = await joinWorkspace(joinCode);
      setActionSuccess(`Joined workspace "${joined.name}"!`);
      setJoinCode('');
      setTimeout(() => {
        router.push(`/workspace/${joined.id}`);
      }, 500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Invalid code or already a member');
    } finally {
      setActionLoading(false);
    }
  }

  function handleLaunchWorkspace(ws: any) {
    setCurrentWorkspace(ws);
    router.push(`/workspace/${ws.id}`);
  }

  function handleCopyInvite(wsId: string, code: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCodeId(wsId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 animate-pulse" />
            <Loader2 className="h-6 w-6 animate-spin text-white absolute inset-0 m-auto" />
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-wide">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col relative selection:bg-indigo-500 selection:text-white antialiased">
      {/* Modern Top Header */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-20 shadow-2xs">
        <div className="w-full flex h-16 items-center justify-between px-4 sm:px-8">
          <Link href="/workspaces" className="flex items-center gap-2.5 group">
            <img
              src="/patterns-icon.png?v=2"
              alt="Patterns"
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-2xs"
            />
            <div className="flex items-center gap-1.5 font-black text-xl tracking-tight text-slate-900">
              <span>Patterns</span>
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent font-black">Chat</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
              <img
                src={user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                alt={user.name}
                className="h-7 w-7 rounded-lg border border-slate-200"
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-slate-800">{user.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{user.email}</span>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 flex-1 w-full relative z-10">
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-3 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Unified Team Workspaces</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Select a workspace to enter, launch a new collaborative hub, or join with an invite code.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/90 shadow-inner">
            <button
              onClick={() => {
                setActiveTab('list');
                setActionError(null);
                setActionSuccess(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Workspaces ({workspaces.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                setActionError(null);
                setActionSuccess(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Workspace</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                setActionError(null);
                setActionSuccess(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Join with Code</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {actionError && (
          <div className="mt-6 mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mt-6 mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tab 1: Workspaces List */}
        {activeTab === 'list' && (
          <div className="mt-8 space-y-4 max-w-2xl mx-auto">
            {workspaces.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Building className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">No workspaces yet</h3>
                <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
                  You are not a member of any workspace yet. Create a new workspace for your team or join one with an invite code!
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:opacity-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Workspace</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('join')}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Join with Code</span>
                  </button>
                </div>
              </div>
            ) : (
              workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => handleLaunchWorkspace(ws)}
                  className="group cursor-pointer flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-black text-lg shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                      {ws.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                          {ws.name}
                        </h3>
                        <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                          {ws.role || 'Member'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span>{ws.membersCount} {ws.membersCount === 1 ? 'member' : 'members'}</span>
                        </span>
                        {ws.joinCode && (ws.role === 'OWNER' || ws.role === 'ADMIN') && (
                          <>
                            <span>•</span>
                            <button
                              onClick={(e) => handleCopyInvite(ws.id, ws.joinCode, e)}
                              title="Click to copy invite code"
                              className="flex items-center gap-1 font-mono text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                              <span>Code: {ws.joinCode}</span>
                              {copiedCodeId === ws.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-slate-400" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchWorkspace(ws)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 group-hover:shadow-indigo-500/40 group-hover:scale-105 transition-all"
                  >
                    <span>Launch</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Create Workspace */}
        {activeTab === 'create' && (
          <div className="mt-8 max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Create a New Workspace</h3>
                <p className="text-xs text-slate-500">Set up a space for your team, company, or project</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Engineering or Product Studio"
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !newWorkspaceName.trim()}
                className="w-full flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create &amp; Enter Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Join Workspace */}
        {activeTab === 'join' && (
          <div className="mt-8 max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Join Existing Workspace</h3>
                <p className="text-xs text-slate-500">Enter the invite code shared by your team owner</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Invite Code
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TF-8ZNGN1"
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !joinCode.trim()}
                className="w-full flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Joining workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Join Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

