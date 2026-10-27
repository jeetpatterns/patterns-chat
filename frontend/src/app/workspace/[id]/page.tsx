'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Hash,
  Lock,
  Search,
  Users,
  Plus,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Loader2,
  MessageSquare,
  Smile,
  Paperclip,
  Send,
  Bold,
  Italic,
  Code,
  X,
  Star,
  Headphones,
  AtSign,
  Quote,
  Strikethrough,
  Settings,
  HelpCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Share2,
  Sparkles,
  Radio,
  Flame,
  Shield,
  Zap,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileCode,
  Download,
  Maximize2,
  File,
  LogOut,
  Pin,
  PinOff,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  CheckCheck,
  UserPlus,
  UserMinus,
  Mail,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  Phone,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  Menu,
  Disc,
  Square,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Crown,
  ShieldCheck,
  Briefcase,
  User,
  Eye,
  Calendar,
  CalendarDays,
  ExternalLink,
  Presentation,
  LayoutGrid,
  PictureInPicture,
  MoreHorizontal,
  Home,
  Folder,
  Camera,
  Upload,
  Inbox,
  Reply,
  Forward,
  Printer,
  MoreVertical,
  RefreshCw,
  Contact,
  BarChart2,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Workspace, WorkspaceMember, WorkspaceRole, Meeting } from '@/types/auth';
import { CalendarView } from '@/components/meetings/CalendarView';
import { GroupMeetingOverlay } from '@/components/meetings/GroupMeetingOverlay';
import { EmailBodyViewer } from '@/components/EmailBodyViewer';
import {
  ROLE_CONFIGS,
  ROLE_WEIGHTS,
  canInviteMembers,
  getAllowedInviteRoles,
  canManageMemberRole,
  canRemoveMember,
  canEditChannel,
  canDeleteChannel,
} from '@/lib/roles';
import {
  Channel,
  ChannelMemberItem,
  Message,
  Reaction,
  Attachment,
  Conversation,
  DirectMessage,
  ConversationParticipant,
  PresenceStatus,
  type Notification,
  SearchResult,
} from '@/types/chat';
import { getSocket } from '@/lib/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '🚀', '🔥', '👀'];

export interface EmailAccountItem {
  id: string;
  emailAddress: string;
  displayName: string;
  provider: 'GOOGLE' | 'MICROSOFT' | 'CUSTOM';
  avatarUrl?: string;
  isActive: boolean;
  isShared?: boolean;
  channelId?: string | null;
  channelName?: string | null;
  workspaceId?: string | null;
  isAdminMaster?: boolean;
  canManageGroupSync?: boolean;
  ownerId?: string;
  ownerName?: string;
  isOwner?: boolean;
  unreadCount: number;
  unhandledCount?: number;
  handledCount?: number;
  requiresReauth?: boolean;
  inboxUnreadCount?: number;
  inboxTotalCount?: number;
  starredCount?: number;
  sentCount?: number;
  draftsCount?: number;
  trashCount?: number;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface EmailMessageItem {
  id: string;
  accountId: string;
  externalMessageId: string;
  folder: 'INBOX' | 'SENT' | 'DRAFTS' | 'STARRED' | 'TRASH';
  fromName?: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses?: string[];
  subject: string;
  snippet?: string;
  bodyHtml?: string;
  bodyText?: string;
  isRead: boolean;
  isStarred: boolean;
  isHandled?: boolean;
  handledById?: string | null;
  handledByName?: string | null;
  handledAt?: string | null;
  sentById?: string | null;
  sentByName?: string | null;
  hasAttachments: boolean;
  attachments?: Array<{ fileName: string; fileUrl: string; fileSize: number; contentType: string }>;
  attachmentsJson?: Array<{ fileName: string; fileUrl: string; fileSize: number; contentType: string }>;
  receivedAt: string;
  createdAt: string;
}

// Module 9: Enhanced Code Block with Language Badge & Copy-to-Clipboard
function CodeBlockView({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  let raw = content.trim();
  if (raw.startsWith('```')) raw = raw.slice(3);
  if (raw.endsWith('```')) raw = raw.slice(0, -3);

  const lines = raw.split('\n');
  let language = 'code';
  let code = raw;

  if (lines.length > 0 && /^[a-zA-Z0-9_#-]+$/.test(lines[0].trim())) {
    language = lines[0].trim().toLowerCase();
    code = lines.slice(1).join('\n');
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy code:', e);
    }
  };

  return (
    <div className="mt-2 my-2 rounded-xl border border-slate-800 bg-[#0F172A] shadow-md overflow-hidden font-mono text-xs text-slate-200">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1E293B]/95 border-b border-slate-800/80 text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          <Code className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold uppercase tracking-wider text-[10px] text-indigo-300">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-700/60 text-slate-300 hover:text-white transition-all text-[11px]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium text-[10px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-slate-400" />
              <span className="text-[10px]">Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-emerald-300/95 leading-relaxed font-mono selection:bg-indigo-600 selection:text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Image 3 Style Video Player Card with Centered Play Button & Codec Error Fallback
function VideoAttachmentCard({
  att,
  fullUrl,
  downloadUrl,
  formatFileSize,
}: {
  att: Attachment;
  fullUrl: string;
  downloadUrl: string;
  formatFileSize: (bytes?: number) => string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (hasError) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 max-w-md shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0">
            <Film className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-slate-900 truncate">{att.fileName}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {formatFileSize(att.fileSize)} • Video File
            </span>
          </div>
        </div>
        <a
          href={downloadUrl}
          download={att.fileName}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shrink-0 shadow-2xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900 max-w-lg shadow-sm group/video relative">
      {!isPlaying ? (
        <div
          onClick={() => {
            setIsPlaying(true);
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => setHasError(true));
              }
            }, 60);
          }}
          className="relative h-48 sm:h-56 w-full cursor-pointer bg-gradient-to-tr from-slate-900 via-indigo-950/80 to-slate-900 flex items-center justify-center group/play overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />

          {/* Large Centered Play Button (Matching Image 3) */}
          <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 ring-4 ring-white/20 transition-all duration-200 group-hover/play:scale-110 group-hover/play:bg-indigo-500">
            <Play className="h-6 w-6 ml-0.5 fill-white text-white" />
          </div>

          {/* Bottom metadata overlay (Matching Image 3) */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-2 truncate mr-2">
              <Film className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="font-bold truncate text-white">{att.fileName}</span>
              <span className="text-[11px] text-slate-300 font-mono shrink-0">
                {formatFileSize(att.fileSize)}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono text-slate-200 font-bold shrink-0">
              Video
            </span>
          </div>
        </div>
      ) : (
        <div className="relative bg-black">
          <video
            ref={videoRef}
            src={fullUrl}
            controls
            autoPlay
            playsInline
            onError={() => setHasError(true)}
            className="max-h-72 w-full object-contain bg-black"
          />
        </div>
      )}

      {/* Footer bar with file info and download */}
      <div className="p-2.5 bg-slate-900/95 text-white flex items-center justify-between text-xs border-t border-slate-800">
        <div className="flex items-center gap-2 truncate mr-2">
          <Film className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="font-bold truncate text-slate-100">{att.fileName}</span>
          <span className="text-[10px] text-slate-400 font-mono shrink-0">
            ({formatFileSize(att.fileSize)})
          </span>
        </div>
        <a
          href={downloadUrl}
          download={att.fileName}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors shrink-0"
          title="Download video"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function WorkspaceShellContent() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const { user, token, loading: authLoading, workspaces, logout, setCurrentWorkspace, updateProfile } = useAuth();

  // Profile Edit & Upload State
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Core Data State
  const [currentWs, setCurrentWs] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Module 5: Direct Messages & Presence State
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeRecipient, setActiveRecipient] = useState<ConversationParticipant | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [userPresence, setUserPresence] = useState<PresenceStatus>('ONLINE');
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);

  // Module 6: Reactions, Mentions & Uploads State (Any File Type & Multi-GB Streaming Support)
  interface UploadProgressInfo {
    fileName: string;
    percent: number;
    uploadedBytes: number;
    totalBytes: number;
    speed?: string;
  }
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDMAttachments, setPendingDMAttachments] = useState<Attachment[]>([]);
  const [isUploadingDM, setIsUploadingDM] = useState(false);
  const [pendingThreadAttachments, setPendingThreadAttachments] = useState<Attachment[]>([]);
  const [isUploadingThread, setIsUploadingThread] = useState(false);
  const [isDraggingOverChannel, setIsDraggingOverChannel] = useState(false);
  const [isDraggingOverDM, setIsDraggingOverDM] = useState(false);
  const channelFileInputRef = useRef<HTMLInputElement>(null);
  const dmFileInputRef = useRef<HTMLInputElement>(null);
  const threadFileInputRef = useRef<HTMLInputElement>(null);

  // Mention Autocomplete State
  const [mentionType, setMentionType] = useState<'user' | 'channel' | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTarget, setMentionTarget] = useState<'channel' | 'dm'>('channel');

  // Rich Emoji Picker Modal / Popover State
  const [activeEmojiPickerFor, setActiveEmojiPickerFor] = useState<{ messageId: string; isDM: boolean } | null>(null);
  const [emojiTab, setEmojiTab] = useState<'popular' | 'smileys' | 'work'>('popular');

  // Lightbox Preview Modal State
  const [activeLightboxImage, setActiveLightboxImage] = useState<{ url: string; fileName: string; fileSize?: number } | null>(null);

  // Thread Drawer State (Module 4)
  const [activeThreadParent, setActiveThreadParent] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadInputText, setThreadInputText] = useState('');
  const [isSendingThreadReply, setIsSendingThreadReply] = useState(false);

  // Role & Permissions
  const isWorkspaceOwner =
    currentWs?.owner?.id === user?.id ||
    currentWs?.ownerId === user?.id ||
    members.some((m) => m.user?.id === user?.id && m.role === 'OWNER');

  const myWorkspaceMember = members.find((m) => m.user?.id === user?.id);
  const currentUserRole: WorkspaceRole =
    isWorkspaceOwner
      ? 'OWNER'
      : (myWorkspaceMember?.role || (currentWs?.userRole as WorkspaceRole) || 'MEMBER');

  const canManageGroupMail =
    isWorkspaceOwner ||
    currentUserRole === 'OWNER' ||
    currentUserRole === 'ADMIN';

  // UI state
  const [copiedCode, setCopiedCode] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [huddleActive, setHuddleActive] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showHeaderMoreMenu, setShowHeaderMoreMenu] = useState(false);

  // Module 7: Pinned Messages State
  const [pinnedMessages, setPinnedMessages] = useState<(Message | DirectMessage)[]>([]);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [loadingPinned, setLoadingPinned] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Module 7: Full-Text Workspace Search State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'messages' | 'files' | 'channels' | 'people'>('all');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Module 7: Notification Center & Sound State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread' | 'mentions'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Invite Teammates Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState<string | null>(null);
  const [inviteErrorMessage, setInviteErrorMessage] = useState<string | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  // Kick / Remove Member State
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);

  // Module 9: Message Editing & Deletion State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // WebRTC 1-on-1 Audio/Video Calling State
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callPeer, setCallPeer] = useState<{ id: string; name: string; avatarUrl?: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    from: { id: string; name: string; avatarUrl?: string };
    isVideo: boolean;
    signalData: any;
    meetingId?: string;
  } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callNotificationMsg, setCallNotificationMsg] = useState<string | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasLocalCamera, setHasLocalCamera] = useState(true);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('default');
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPeerRecording, setIsPeerRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const [completedRecording, setCompletedRecording] = useState<{
    blob: Blob;
    url: string;
    fileName: string;
    duration: number;
    isVideo: boolean;
    sizeFormatted: string;
  } | null>(null);
  const [interruptedCall, setInterruptedCall] = useState<{
    peerId: string;
    peerName: string;
    peerAvatar?: string;
    isVideo: boolean;
  } | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<any[]>([]);
  const callPeerRef = useRef<{ id: string; name: string; avatarUrl?: string } | null>(null);
  const callStatusRef = useRef<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenAudioCtxRef = useRef<AudioContext | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Calendar, Team Meeting, Fullscreen & Background Call Notification State
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [activeTeamMeeting, setActiveTeamMeeting] = useState<Meeting | null>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isCallFullscreen, setIsCallFullscreen] = useState(false);
  const callOverlayContainerRef = useRef<HTMLDivElement | null>(null);
  const incomingCallNotifRef = useRef<any | null>(null);
  const tabTitleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef<string>('Patterns');

  // Saved Call Recordings in PostgreSQL State
  interface SavedRecording {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    duration: number;
    isVideo: boolean;
    workspaceId: string;
    channelId?: string;
    conversationId?: string;
    peerId?: string;
    createdAt: string;
    recordedById: string;
    recordedBy: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
    channel?: {
      id: string;
      name: string;
    };
  }

  const [workspaceRecordings, setWorkspaceRecordings] = useState<SavedRecording[]>([]);
  const [showRecordingsModal, setShowRecordingsModal] = useState(false);
  const [activePlaybackRecording, setActivePlaybackRecording] = useState<SavedRecording | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [screenFitMode, setScreenFitMode] = useState<'cover' | 'contain'>('contain');
  const [isPeerScreenSharing, setIsPeerScreenSharing] = useState(false);
  const [isPeerVideoEnabled, setIsPeerVideoEnabled] = useState(false);
  const [isLocalPipMinimized, setIsLocalPipMinimized] = useState(false);
  const wakeLockRef = useRef<any>(null);

  async function loadWorkspaceRecordings() {
    if (!workspaceId || !token) return;
    try {
      const res = await fetch(`${API_URL}/recordings/workspace/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceRecordings(data);
      }
    } catch (e) {
      console.warn('Failed to load workspace recordings:', e);
    }
  }

  async function handleDeleteRecording(id: string) {
    if (!confirm('Are you sure you want to delete this call recording?')) return;
    try {
      const res = await fetch(`${API_URL}/recordings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWorkspaceRecordings((prev) => prev.filter((r) => r.id !== id));
        if (activePlaybackRecording?.id === id) {
          setActivePlaybackRecording(null);
        }
      }
    } catch (e) {
      alert('Could not delete recording');
    }
  }

  useEffect(() => {
    if (workspaceId && token) {
      loadWorkspaceRecordings();
    }
  }, [workspaceId, token]);

  // Unread Message Badges State for Channels & Direct Messages
  const [unreadChannels, setUnreadChannels] = useState<Record<string, number>>({});
  const [unreadDirectMessages, setUnreadDirectMessages] = useState<Record<string, number>>({});
  const activeChannelRef = useRef<Channel | null>(null);
  const activeRecipientRef = useRef<ConversationParticipant | null>(null);

  const channelsRef = useRef<Channel[]>(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const membersRef = useRef<WorkspaceMember[]>(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const totalUnreadChannels = useMemo(
    () => Object.values(unreadChannels).reduce((sum, c) => sum + (c || 0), 0),
    [unreadChannels],
  );
  const totalUnreadDMs = useMemo(
    () => Object.values(unreadDirectMessages).reduce((sum, c) => sum + (c || 0), 0),
    [unreadDirectMessages],
  );
  const totalUnreadCount = totalUnreadChannels + totalUnreadDMs;

  // Floating Toast Alert for Messages arriving in other chats
  const [messageToast, setMessageToast] = useState<{
    id: string;
    type: 'channel' | 'dm';
    chatTitle: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    channel?: Channel;
    senderUser?: ConversationParticipant;
  } | null>(null);
  const messageToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
    if (activeChannel?.id) {
      setUnreadChannels((prev) => ({ ...prev, [activeChannel.id]: 0 }));
    }
  }, [activeChannel]);

  useEffect(() => {
    activeRecipientRef.current = activeRecipient;
    if (activeRecipient?.id) {
      setUnreadDirectMessages((prev) => ({ ...prev, [activeRecipient.id]: 0 }));
    }
  }, [activeRecipient]);

  // Browser tab title is updated dynamically below taking both Chat and Mail unread counts into account

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneAudioCtxRef = useRef<any | null>(null);

  // Keyboard shortcut listener (⌘K / Ctrl+K, ⌘F / Ctrl+F and Escape)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowSearchModal(false);
        setShowPinnedDrawer(false);
        setShowNotificationDrawer(false);
        setShowCreateChannelModal(false);
        setShowEditChannelModal(false);
        setChannelToDelete(null);
        setShowMembersDrawer(false);
        setShowInviteModal(false);
        setMemberToRemove(null);
        setActiveLightboxImage(null);
        setActiveEmojiPickerFor(null);
        setMentionType(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Request Browser Notification permission & check meeting URL param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      originalTitleRef.current = document.title || 'Patterns';
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      const params = new URLSearchParams(window.location.search);
      const meetingParam = params.get('meeting');
      if (meetingParam) {
        setActiveTeamMeeting({
          id: meetingParam,
          workspaceId: workspaceId || '',
          title: 'Scheduled Team Meeting',
          scheduledAt: new Date().toISOString(),
          duration: 60,
          hostId: '',
          status: 'LIVE' as const,
          createdAt: new Date().toISOString(),
          host: { id: '', name: 'Meeting Host', email: '' },
          participants: [],
        });
      }
    }
  }, []);

  // New Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);
  const [newChannelSelectedMembers, setNewChannelSelectedMembers] = useState<string[]>([]);
  const [newChannelEnableMail, setNewChannelEnableMail] = useState(false);
  const [newChannelMailProvider, setNewChannelMailProvider] = useState<'GOOGLE' | 'CUSTOM'>('GOOGLE');
  const [newChannelGroupEmail, setNewChannelGroupEmail] = useState('');
  const [channelCreating, setChannelCreating] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  // Edit & Delete Channel State
  const [showEditChannelModal, setShowEditChannelModal] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelTopic, setEditChannelTopic] = useState('');
  const [editChannelIsPrivate, setEditChannelIsPrivate] = useState(false);
  const [editChannelGroupEmail, setEditChannelGroupEmail] = useState('');
  const [editChannelLoading, setEditChannelLoading] = useState(false);
  const [editChannelError, setEditChannelError] = useState<string | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [deleteChannelLoading, setDeleteChannelLoading] = useState(false);

  // Invite Role Selection State
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');

  // Active Channel Members & Management State
  const [activeChannelMembers, setActiveChannelMembers] = useState<ChannelMemberItem[]>([]);
  const [showAddChannelMemberModal, setShowAddChannelMemberModal] = useState(false);
  const [selectedAddUserIds, setSelectedAddUserIds] = useState<string[]>([]);
  const [isAddingChannelMember, setIsAddingChannelMember] = useState(false);
  const [channelMembersTab, setChannelMembersTab] = useState<'channel' | 'workspace'>('channel');
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');

  // Main Message Composer
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hovered message for floating action bar
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // OAUTH & EMAIL SYSTEM STATE
  // ─────────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get('tab') : null;
  const [activeAppTab, setActiveAppTab] = useState<'chat' | 'mail'>(
    tabParam === 'mail' ? 'mail' : 'chat',
  );
  const [isMailViewActive, setIsMailViewActive] = useState(tabParam === 'mail');

  const [mailAccounts, setMailAccounts] = useState<EmailAccountItem[]>([]);
  const [selectedMailAccountId, setSelectedMailAccountId] = useState<string | null>(null);
  const [mailFolder, setMailFolder] = useState<'INBOX' | 'STARRED' | 'SENT' | 'DRAFTS' | 'TRASH'>('INBOX');
  const [mailMessages, setMailMessages] = useState<EmailMessageItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessageItem | null>(null);
  const [isMailLoading, setIsMailLoading] = useState(false);
  const [mailSearchQuery, setMailSearchQuery] = useState('');
  const [mailStatusFilter, setMailStatusFilter] = useState<'unhandled' | 'done' | 'all'>('unhandled');

  useEffect(() => {
    if (tabParam === 'mail') {
      setActiveAppTab('mail');
      setIsMailViewActive(true);
    } else {
      setActiveAppTab('chat');
      setIsMailViewActive(false);
    }
  }, [tabParam]);

  const handleSwitchAppTab = (tab: 'chat' | 'mail') => {
    setActiveAppTab(tab);
    setIsMailViewActive(tab === 'mail');
    setShowCalendarView(false);
    setShowMobileSidebar(false);
    if (tab === 'chat') {
      const scrollDown = () => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          const parent = messagesEndRef.current.parentElement;
          if (parent) {
            parent.scrollTop = parent.scrollHeight;
          }
        }
      };
      if (typeof window !== 'undefined') {
        requestAnimationFrame(scrollDown);
        setTimeout(scrollDown, 50);
        setTimeout(scrollDown, 150);
        setTimeout(scrollDown, 350);
      }
    }
    if (tab === 'mail') {
      setSelectedEmail(null);
      if (mailAccounts.length > 0 && !selectedMailAccountId) {
        setSelectedMailAccountId(mailAccounts[0].id);
      }
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'mail') {
        url.searchParams.set('tab', 'mail');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.pushState({}, '', url.toString());
    }
  };
  const [showConnectMailModal, setShowConnectMailModal] = useState(false);
  const [connectEmailInput, setConnectEmailInput] = useState('');
  const [connectEmailProvider, setConnectEmailProvider] = useState<'GOOGLE' | 'MICROSOFT' | 'CUSTOM'>('GOOGLE');
  const [customMailConfig, setCustomMailConfig] = useState({
    emailAddress: '',
    displayName: '',
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    imapTls: true,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpTls: true,
  });
  const [customMailError, setCustomMailError] = useState<string | null>(null);
  const [isVerifyingCustomMail, setIsVerifyingCustomMail] = useState(false);
  const [showAdvancedServerSettings, setShowAdvancedServerSettings] = useState(false);
  const [connectMailMode, setConnectMailMode] = useState<'personal' | 'group'>('group');
  const [connectMailChannelId, setConnectMailChannelId] = useState<string>('');
  const [groupAssignMode, setGroupAssignMode] = useState<'existing' | 'new'>('existing');
  const [newGroupChannelName, setNewGroupChannelName] = useState('');
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(true);
  const [groupSelectedMemberIds, setGroupSelectedMemberIds] = useState<string[]>([]);
  const [groupOriginalMemberIds, setGroupOriginalMemberIds] = useState<string[]>([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [isLoadingChannelMembers, setIsLoadingChannelMembers] = useState(false);
  const [showComposeMailModal, setShowComposeMailModal] = useState(false);
  const [composeMailData, setComposeMailData] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
  });
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [showShareMailModal, setShowShareMailModal] = useState(false);
  const [shareMailTargetChannelId, setShareMailTargetChannelId] = useState('');
  const [shareMailNote, setShareMailNote] = useState('');
  const [isSharingMail, setIsSharingMail] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [emailFilterMode, setEmailFilterMode] = useState<'all' | 'unread' | 'starred'>('all');
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [showEmailDetailsModal, setShowEmailDetailsModal] = useState(false);
  const [isReplyingInline, setIsReplyingInline] = useState(false);
  const [showEmailActionsMenu, setShowEmailActionsMenu] = useState(false);
  const [mailPage, setMailPage] = useState(1);
  const [mailTotalMessages, setMailTotalMessages] = useState(0);
  const [mailTotalPages, setMailTotalPages] = useState(1);
  const [composeAttachments, setComposeAttachments] = useState<
    Array<{ fileName: string; fileUrl?: string; base64Data?: string; fileSize: number; contentType: string }>
  >([]);
  const [isUploadingComposeAttachment, setIsUploadingComposeAttachment] = useState(false);
  const composeFileInputRef = useRef<HTMLInputElement | null>(null);

  const [inlineReplyAttachments, setInlineReplyAttachments] = useState<
    Array<{ fileName: string; fileUrl?: string; base64Data?: string; fileSize: number; contentType: string }>
  >([]);
  const [isUploadingInlineAttachment, setIsUploadingInlineAttachment] = useState(false);
  const inlineFileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewAttachment, setPreviewAttachment] = useState<{
    fileName: string;
    fileUrl: string;
    contentType: string;
    fileSize?: number;
  } | null>(null);
  const selectedEmailRef = useRef<EmailMessageItem | null>(null);

  useEffect(() => {
    selectedEmailRef.current = selectedEmail;
  }, [selectedEmail]);

  const handleUploadMailAttachment = async (
    files: FileList | null,
    target: 'compose' | 'inline',
  ) => {
    if (!files || files.length === 0 || !token) return;
    const isCompose = target === 'compose';
    if (isCompose) setIsUploadingComposeAttachment(true);
    else setIsUploadingInlineAttachment(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const uploaded = await res.json();
          const item = {
            fileName: uploaded.fileName || file.name,
            fileUrl: uploaded.fileUrl || uploaded.url,
            fileSize: uploaded.fileSize || file.size,
            contentType: uploaded.fileType || file.type || 'application/octet-stream',
          };
          if (isCompose) {
            setComposeAttachments((prev) => [...prev, item]);
          } else {
            setInlineReplyAttachments((prev) => [...prev, item]);
          }
        }
      }
    } catch (err) {
      console.error('Mail attachment upload failed:', err);
    } finally {
      if (isCompose) setIsUploadingComposeAttachment(false);
      else setIsUploadingInlineAttachment(false);
    }
  };

  const selectedMailAccount = useMemo(() => {
    return mailAccounts.find((a) => a.id === selectedMailAccountId) || mailAccounts[0] || null;
  }, [mailAccounts, selectedMailAccountId]);

  const totalUnreadEmails = useMemo(() => {
    return mailAccounts.reduce((sum, acc) => sum + (acc.unreadCount || 0), 0);
  }, [mailAccounts]);

  // Dynamic Chat Browser Title updates
  useEffect(() => {
    const baseTitle = currentWs?.name ? `${currentWs.name} | Patterns Chat` : 'Patterns Chat';
    if (activeAppTab === 'mail') {
      if (totalUnreadEmails > 0) {
        document.title = `(${totalUnreadEmails}) Mail - ${baseTitle}`;
      } else {
        document.title = `Mail - ${baseTitle}`;
      }
    } else {
      if (totalUnreadCount > 0) {
        document.title = `(${totalUnreadCount}) Chat - ${baseTitle}`;
      } else {
        document.title = `Chat - ${baseTitle}`;
      }
    }
  }, [activeAppTab, totalUnreadCount, totalUnreadEmails, currentWs?.name]);

  const filteredMailMessages = useMemo(() => {
    return mailMessages.filter((msg) => {
      // Triage status (unhandled vs done) only applies to INBOX and STARRED
      if (mailFolder === 'INBOX' || mailFolder === 'STARRED') {
        if (mailStatusFilter === 'unhandled' && msg.isHandled) return false;
        if (mailStatusFilter === 'done' && !msg.isHandled) return false;
      }
      if (emailFilterMode === 'unread') return !msg.isRead;
      if (emailFilterMode === 'starred') return msg.isStarred;
      return true;
    });
  }, [mailMessages, mailFolder, mailStatusFilter, emailFilterMode]);

  async function loadMailAccounts() {
    if (!token) return;
    try {
      const q = workspaceId ? `?workspaceId=${workspaceId}` : '';
      const res = await fetch(`${API_URL}/mail/accounts${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: EmailAccountItem[] = await res.json();
        setMailAccounts(data);
        if (data.length > 0 && !selectedMailAccountId) {
          setSelectedMailAccountId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load email accounts:', e);
    }
  }

  async function loadMailMessages(accId?: string | null, fld?: string, q?: string, pageNum = 1) {
    if (!token) return;
    const targetAccountId = accId || selectedMailAccountId;
    const targetFolder = fld || mailFolder;
    try {
      setIsMailLoading(true);
      const params = new URLSearchParams();
      if (targetAccountId) params.set('accountId', targetAccountId);
      if (targetFolder) params.set('folder', targetFolder);
      if (q) params.set('search', q);
      if (workspaceId) params.set('workspaceId', workspaceId);
      params.set('limit', '100');
      params.set('page', String(pageNum));

      const res = await fetch(`${API_URL}/mail/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const messages: EmailMessageItem[] = data.messages || [];
        setMailMessages(messages);
        setMailPage(data.page || pageNum);
        setMailTotalMessages(data.total || messages.length);
        setMailTotalPages(data.totalPages || 1);

        // In Gmail layout, default view displays all emails in the list
        // Reset selected email if it belonged to a different account or folder
        if (selectedEmail && (selectedEmail.accountId !== targetAccountId || selectedEmail.folder !== targetFolder)) {
          setSelectedEmail(null);
        }
      }
    } catch (e) {
      console.error('Failed to load emails:', e);
    } finally {
      setIsMailLoading(false);
    }
  }

  async function handleToggleHandledEmail(messageId: string, currentHandled?: boolean, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const newHandled = !currentHandled;

    setMailMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isHandled: newHandled,
              handledByName: newHandled ? (user?.name || 'You') : null,
              handledAt: newHandled ? new Date().toISOString() : null,
            }
          : m,
      ),
    );
    if (selectedEmail?.id === messageId) {
      setSelectedEmail((prev) =>
        prev
          ? {
              ...prev,
              isHandled: newHandled,
              handledByName: newHandled ? (user?.name || 'You') : null,
              handledAt: newHandled ? new Date().toISOString() : null,
            }
          : null,
      );
    }

    const targetMsg = mailMessages.find((m) => m.id === messageId) || selectedEmail;
    const targetAccId = targetMsg?.accountId || selectedMailAccountId;
    if (targetAccId) {
      setMailAccounts((prev) =>
        prev.map((a) => {
          if (a.id === targetAccId) {
            const delta = newHandled ? -1 : 1;
            return {
              ...a,
              unhandledCount: Math.max(0, (a.unhandledCount || 0) + delta),
              handledCount: Math.max(0, (a.handledCount || 0) - delta),
            };
          }
          return a;
        }),
      );
    }

    try {
      await fetch(`${API_URL}/mail/messages/${messageId}/handled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isHandled: newHandled }),
      });
      setCallNotificationMsg(
        newHandled ? '✅ Marked as Done (synced to all group members)' : 'Reopened / marked as Needs Action',
      );
      setTimeout(() => setCallNotificationMsg(null), 3000);
    } catch (err) {
      console.error('Failed to toggle handled status:', err);
    }
  }

  async function handleSelectEmail(msg: EmailMessageItem) {
    const wasUnread = !msg.isRead;
    setSelectedEmail({ ...msg, isRead: true });

    // Instantly mark as read in local state without delay
    if (wasUnread) {
      setMailMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)),
      );
      setMailAccounts((prev) =>
        prev.map((a) =>
          a.id === msg.accountId
            ? {
                ...a,
                unreadCount: Math.max(0, (a.unreadCount || 1) - 1),
                inboxUnreadCount: Math.max(0, ((a.inboxUnreadCount ?? a.unreadCount) || 1) - 1),
              }
            : a,
        ),
      );
    }

    try {
      const res = await fetch(`${API_URL}/mail/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fullMsg = await res.json();
        setSelectedEmail(fullMsg);
      }
    } catch (e) {
      console.error('Failed to fetch email details:', e);
    }
  }

  async function handleToggleStarEmail(messageId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API_URL}/mail/messages/${messageId}/star`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMailMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isStarred: !m.isStarred } : m)),
        );
        if (selectedEmail?.id === messageId) {
          setSelectedEmail((prev) => (prev ? { ...prev, isStarred: !prev.isStarred } : null));
        }
      }
    } catch (e) {
      console.error('Failed to toggle star:', e);
    }
  }

  async function handleToggleReadEmail(messageId: string) {
    const currentMsg = mailMessages.find((m) => m.id === messageId) || selectedEmail;
    const newRead = currentMsg ? !currentMsg.isRead : false;

    // Optimistically update read status and account unread counts immediately
    setMailMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isRead: newRead } : m)),
    );
    if (selectedEmail?.id === messageId) {
      setSelectedEmail((prev) => (prev ? { ...prev, isRead: newRead } : null));
    }
    const targetAccId = currentMsg?.accountId || selectedMailAccountId;
    if (targetAccId) {
      setMailAccounts((prev) =>
        prev.map((a) => {
          if (a.id === targetAccId) {
            const delta = newRead ? -1 : 1;
            const updatedCount = Math.max(0, (a.unreadCount || 0) + delta);
            return { ...a, unreadCount: updatedCount, inboxUnreadCount: updatedCount };
          }
          return a;
        }),
      );
    }

    try {
      await fetch(`${API_URL}/mail/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isRead: newRead }),
      });
    } catch (e) {
      console.error('Failed to toggle read email:', e);
    }
  }

  async function handleDeleteEmail(messageId: string) {
    const targetMsg = mailMessages.find((m) => m.id === messageId) || selectedEmail;
    if (targetMsg && !targetMsg.isRead && targetMsg.accountId) {
      setMailAccounts((prev) =>
        prev.map((a) =>
          a.id === targetMsg.accountId
            ? {
                ...a,
                unreadCount: Math.max(0, (a.unreadCount || 1) - 1),
                inboxUnreadCount: Math.max(0, ((a.inboxUnreadCount ?? a.unreadCount) || 1) - 1),
              }
            : a,
        ),
      );
    }
    setMailMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (selectedEmail?.id === messageId) {
      setSelectedEmail(null);
    }

    try {
      const res = await fetch(`${API_URL}/mail/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCallNotificationMsg('Email moved to Trash');
        setTimeout(() => setCallNotificationMsg(null), 3000);
      }
    } catch (e) {
      console.error('Failed to delete email:', e);
    }
  }

  async function handleSyncMailAccount(accId?: string, silent = false) {
    const targetId = accId || selectedMailAccountId;
    if (!targetId || !token) return;

    const targetAccount = mailAccounts.find((a) => a.id === targetId);
    // If it's a shared group mailbox, enforce Admin/Owner permissions
    if (targetAccount?.isShared && !canManageGroupMail) {
      if (!silent) {
        setCallNotificationMsg('Group mail sync is restricted to Workspace Admins & Owners.');
        setTimeout(() => setCallNotificationMsg(null), 3500);
      }
      return;
    }

    try {
      if (!silent) {
        setIsMailLoading(true);
        setCallNotificationMsg('Syncing live inbox with Gmail...');
      }
      const res = await fetch(`${API_URL}/mail/accounts/${targetId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      await loadMailAccounts();
      await loadMailMessages(targetId, mailFolder, mailSearchQuery);
      if (data.syncedCount !== undefined && data.syncedCount > 0) {
        setCallNotificationMsg(`Synced ${data.syncedCount} real email${data.syncedCount > 1 ? 's' : ''} from Gmail`);
        setTimeout(() => setCallNotificationMsg(null), 4000);
      } else if (!silent) {
        if (data.requiresReauth) {
          setCallNotificationMsg('Gmail permission update required: Click "+" to re-authorize Gmail');
        } else {
          setCallNotificationMsg('Inbox synced successfully');
        }
        setTimeout(() => setCallNotificationMsg(null), 4000);
      }
    } catch (err) {
      console.error('Mail sync error:', err);
    } finally {
      if (!silent) {
        setIsMailLoading(false);
      }
    }
  }

  // Periodic auto-sync for active mailbox every 30 seconds (Personal mailboxes, or Group mailboxes if Admin/Owner)
  useEffect(() => {
    if (!token || !selectedMailAccountId) return;
    const currentAcc = mailAccounts.find((a) => a.id === selectedMailAccountId);
    if (currentAcc?.isShared && !canManageGroupMail) return;

    const syncTimer = setInterval(() => {
      handleSyncMailAccount(selectedMailAccountId, true);
    }, 30000);
    return () => clearInterval(syncTimer);
  }, [token, selectedMailAccountId, mailFolder, mailSearchQuery, canManageGroupMail, mailAccounts]);

  async function handleDisconnectAccount(accId: string) {
    if (!token || !accId) return;
    const targetAcc = mailAccounts.find((a) => a.id === accId);
    if (targetAcc?.isShared && !canManageGroupMail) {
      alert('Only Workspace Admins and Owners can disconnect a group mailbox.');
      return;
    }
    if (!confirm('Are you sure you want to disconnect this email account?')) return;
    try {
      setIsMailLoading(true);
      const res = await fetch(`${API_URL}/mail/accounts/${accId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (selectedMailAccountId === accId) {
          setSelectedMailAccountId(null);
          setSelectedEmail(null);
          setMailMessages([]);
        }
        await loadMailAccounts();
        setCallNotificationMsg('Email account disconnected successfully.');
        setTimeout(() => setCallNotificationMsg(null), 3000);
      }
    } catch (err) {
      console.error('Failed to disconnect account:', err);
    } finally {
      setIsMailLoading(false);
    }
  }

  const filteredGroupMembers = useMemo(() => {
    if (!groupMemberSearch.trim()) return members;
    const q = groupMemberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.user?.name?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q)
    );
  }, [members, groupMemberSearch]);

  async function handleSelectChannelForGroupMail(channelId: string) {
    if (!channelId) {
      setConnectMailChannelId('');
      setGroupSelectedMemberIds(user?.id ? [user.id] : []);
      setGroupOriginalMemberIds([]);
      return;
    }

    if (channelId === '__new__') {
      handleSwitchToNewGroup();
      return;
    }

    setGroupAssignMode('existing');
    setConnectMailChannelId(channelId);
    try {
      setIsLoadingChannelMembers(true);
      const res = await fetch(`${API_URL}/channels/${channelId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // data: [{ id, user: { id, name, ... } }]
        const memberUserIds = (data || []).map((m: any) => m.user?.id || m.userId).filter(Boolean);
        // Pre-select members who already belong to this channel
        setGroupSelectedMemberIds(memberUserIds);
        setGroupOriginalMemberIds(memberUserIds);
      }
    } catch (err) {
      console.error('Failed to load channel members:', err);
    } finally {
      setIsLoadingChannelMembers(false);
    }
  }

  function handleSwitchToNewGroup() {
    setGroupAssignMode('new');
    setConnectMailChannelId('__new__');
    setGroupSelectedMemberIds(user?.id ? [user.id] : []);
    setGroupOriginalMemberIds([]);
  }

  function handleSwitchToExistingGroup() {
    setGroupAssignMode('existing');
    if (channels.length > 0) {
      const targetId = channels[0].id;
      handleSelectChannelForGroupMail(targetId);
    } else {
      setConnectMailChannelId('');
      setGroupSelectedMemberIds(user?.id ? [user.id] : []);
      setGroupOriginalMemberIds([]);
    }
  }

  async function prepareGroupChannel(): Promise<string | null> {
    if (connectMailMode !== 'group') return null;

    if (groupAssignMode === 'new') {
      const formattedName = newGroupChannelName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '');

      if (!formattedName) {
        alert('Please enter a name for the new Group / Channel.');
        return null;
      }

      if (channels.some((c) => c.name.toLowerCase() === formattedName)) {
        alert(`Channel #${formattedName} already exists. Please choose another name or select it from existing groups.`);
        return null;
      }

      const finalMemberIds = Array.from(new Set([...groupSelectedMemberIds, user?.id].filter(Boolean) as string[]));

      try {
        setIsMailLoading(true);
        const res = await fetch(`${API_URL}/workspaces/${workspaceId}/channels`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formattedName,
            topic: `Group Mailbox: #${formattedName}`,
            isPrivate: newGroupIsPrivate,
            memberIds: finalMemberIds,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(errData.message || 'Failed to create new group channel');
          setIsMailLoading(false);
          return null;
        }

        const newCh = await res.json();
        setChannels((prev) => [...prev, newCh]);
        setConnectMailChannelId(newCh.id);
        return newCh.id;
      } catch (err) {
        console.error('Failed to create channel for group mail:', err);
        alert('Failed to create group channel');
        setIsMailLoading(false);
        return null;
      }
    } else {
      // Existing channel
      if (!connectMailChannelId || connectMailChannelId === '__new__') {
        alert('Please select a Channel / Group to link this mailbox to.');
        return null;
      }

      // Sync members if modified
      const addedMemberIds = groupSelectedMemberIds.filter((id) => !groupOriginalMemberIds.includes(id));
      const removedMemberIds = groupOriginalMemberIds.filter((id) => !groupSelectedMemberIds.includes(id) && id !== user?.id);

      for (const targetId of addedMemberIds) {
        try {
          await fetch(`${API_URL}/channels/${connectMailChannelId}/members`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: targetId }),
          });
        } catch (e) {
          console.warn('Failed to add member to channel:', e);
        }
      }

      for (const targetId of removedMemberIds) {
        try {
          await fetch(`${API_URL}/channels/${connectMailChannelId}/members/${targetId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          console.warn('Failed to remove member from channel:', e);
        }
      }

      return connectMailChannelId;
    }
  }

  async function handleConnectEmail(
    provider: 'GOOGLE' | 'MICROSOFT' | 'CUSTOM',
    customEmail?: string,
    overrideChannelId?: string,
  ) {
    const isSharedMail = connectMailMode === 'group' || !!overrideChannelId;
    if (isSharedMail && !canManageGroupMail) {
      alert('Only Workspace Admins and Owners (SuperAdmins) can connect a group/shared mailbox.');
      return;
    }

    const effectiveChannelId = overrideChannelId || connectMailChannelId;

    if (isSharedMail) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('teamflow_mail_workspace_id', (workspaceId || '') as string);
        if (effectiveChannelId) {
          localStorage.setItem('teamflow_mail_channel_id', effectiveChannelId);
        }
        localStorage.setItem('teamflow_mail_is_shared', 'true');
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('teamflow_mail_workspace_id');
        localStorage.removeItem('teamflow_mail_channel_id');
        localStorage.removeItem('teamflow_mail_is_shared');
      }
    }

    if (provider === 'GOOGLE' && !customEmail) {
      try {
        setIsMailLoading(true);
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback?provider=google`);
        const res = await fetch(`${API_URL}/mail/auth/google/url?redirectUri=${redirectUri}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const url = data.authUrl || data.url;

        // If Google Cloud Client ID is configured on backend, proceed to real Google OAuth
        if (data.clientIdConfigured && url) {
          localStorage.setItem('teamflow_oauth_mode', 'connect_mail');
          localStorage.setItem('teamflow_oauth_return_tab', window.location.pathname + '?tab=mail');
          window.location.href = url;
          return;
        }

        // When GOOGLE_CLIENT_ID is not configured in local .env, connect directly with local development simulation
        const defaultLocalEmail =
          connectMailMode === 'group'
            ? `${channels.find((c) => c.id === effectiveChannelId)?.name || newGroupChannelName || 'support'}@gmail.com`
            : user?.email || `${user?.name?.toLowerCase().replace(/\s+/g, '') || 'user'}@gmail.com`;

        const enteredEmail = prompt(
          `Google OAuth Client ID is not configured in your local backend .env.\n\nEnter your Google or company email to connect locally:`,
          defaultLocalEmail,
        );

        if (!enteredEmail || !enteredEmail.includes('@')) {
          setIsMailLoading(false);
          return;
        }

        customEmail = enteredEmail.trim();
      } catch (err) {
        console.error('Failed to get Google OAuth URL:', err);
      } finally {
        setIsMailLoading(false);
      }
    }

    if (provider === 'MICROSOFT' && !customEmail) {
      try {
        setIsMailLoading(true);
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback?provider=microsoft`);
        const res = await fetch(`${API_URL}/mail/auth/microsoft/url?redirectUri=${redirectUri}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const url = data.authUrl || data.url;

        // If Microsoft Client ID is configured, proceed to real Microsoft OAuth
        if (data.clientIdConfigured && url) {
          localStorage.setItem('teamflow_oauth_mode', 'connect_mail');
          localStorage.setItem('teamflow_oauth_return_tab', window.location.pathname + '?tab=mail');
          window.location.href = url;
          return;
        }

        const defaultLocalEmail =
          connectMailMode === 'group'
            ? `${channels.find((c) => c.id === effectiveChannelId)?.name || newGroupChannelName || 'team'}@outlook.com`
            : user?.email || 'user@outlook.com';

        const enteredEmail = prompt(
          `Microsoft OAuth Client ID is not configured in your local backend .env.\n\nEnter your Microsoft email to connect locally:`,
          defaultLocalEmail,
        );

        if (!enteredEmail || !enteredEmail.includes('@')) {
          setIsMailLoading(false);
          return;
        }

        customEmail = enteredEmail.trim();
      } catch (err) {
        console.error('Failed to get Microsoft OAuth URL:', err);
      } finally {
        setIsMailLoading(false);
      }
    }

    try {
      const emailAddress =
        customEmail?.trim() ||
        (provider === 'GOOGLE'
          ? `${user?.name?.toLowerCase().replace(/\s+/g, '') || 'user'}@patterns.com`
          : 'user@outlook.com');

      const res = await fetch(`${API_URL}/mail/accounts/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailAddress,
          provider,
          displayName: user?.name || emailAddress.split('@')[0],
          workspaceId: workspaceId || undefined,
          channelId: isSharedMail && effectiveChannelId ? effectiveChannelId : undefined,
          isShared: isSharedMail,
        }),
      });

      if (res.ok) {
        const newAcc = await res.json();
        setShowConnectMailModal(false);
        setConnectEmailInput('');
        setNewGroupChannelName('');
        setGroupAssignMode('existing');
        setGroupSelectedMemberIds([]);
        setGroupOriginalMemberIds([]);
        setGroupMemberSearch('');
        await loadMailAccounts();
        setSelectedMailAccountId(newAcc.id);
        setMailFolder('INBOX');
        await loadMailMessages(newAcc.id, 'INBOX');
        const channelName = channels.find(c => c.id === effectiveChannelId)?.name || newGroupChannelName || 'channel';
        setCallNotificationMsg(
          isSharedMail
            ? `Connected group mailbox #${channelName}: ${newAcc.emailAddress}`
            : `Connected personal email: ${newAcc.emailAddress}`
        );
        setTimeout(() => setCallNotificationMsg(null), 4000);
      }
    } catch (e) {
      console.error('Failed to connect email:', e);
      alert('Could not connect email account');
    }
  }

  async function handleConnectCustomEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!customMailConfig.emailAddress.includes('@')) {
      setCustomMailError('Please enter a valid work email address.');
      return;
    }
    setCustomMailError(null);
    setIsVerifyingCustomMail(true);

    try {
      const emailDomain = customMailConfig.emailAddress.split('@')[1]?.trim();
      const resolvedImapHost = (customMailConfig.imapHost.trim() || `mail.${emailDomain}`).trim();
      const resolvedSmtpHost = (customMailConfig.smtpHost.trim() || `mail.${emailDomain}`).trim();
      const resolvedImapUser = customMailConfig.imapUser.trim() || customMailConfig.emailAddress.trim().toLowerCase();
      const resolvedSmtpUser = customMailConfig.smtpUser.trim() || resolvedImapUser;

      const res = await fetch(`${API_URL}/mail/accounts/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailAddress: customMailConfig.emailAddress.trim().toLowerCase(),
          displayName: customMailConfig.displayName.trim() || customMailConfig.emailAddress.split('@')[0],
          provider: 'CUSTOM',
          imapHost: resolvedImapHost,
          imapPort: Number(customMailConfig.imapPort) || 993,
          imapUser: resolvedImapUser,
          imapPassword: customMailConfig.imapPassword,
          imapTls: customMailConfig.imapTls,
          smtpHost: resolvedSmtpHost,
          smtpPort: Number(customMailConfig.smtpPort) || 587,
          smtpUser: resolvedSmtpUser,
          smtpPassword: customMailConfig.imapPassword,
          smtpTls: customMailConfig.smtpTls,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to verify and connect mail server.');
      }

      setShowConnectMailModal(false);
      setCustomMailConfig({
        emailAddress: '',
        displayName: '',
        imapHost: '',
        imapPort: 993,
        imapUser: '',
        imapPassword: '',
        imapTls: true,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpTls: true,
      });
      await loadMailAccounts();
      setSelectedMailAccountId(data.id);
      setMailFolder('INBOX');
      await loadMailMessages(data.id, 'INBOX');
      setCallNotificationMsg(`Connected corporate mailbox: ${data.emailAddress}`);
      setTimeout(() => setCallNotificationMsg(null), 4000);
    } catch (err: any) {
      setCustomMailError(err?.message || 'Connection failed. Please verify server host, port, and password.');
    } finally {
      setIsVerifyingCustomMail(false);
    }
  }

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '758995093643-eackobpibmmqga6lfd6fht757l2dd5h8.apps.googleusercontent.com';

  function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>, target: 'compose' | 'inline') {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 15 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 15MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const newAtt = {
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          base64Data,
          fileSize: file.size,
        };
        if (target === 'compose') {
          setComposeAttachments((prev) => [...prev, newAtt]);
        } else {
          setInlineReplyAttachments((prev) => [...prev, newAtt]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  async function handleSendEmail() {
    if (!selectedMailAccountId || !composeMailData.to.trim()) {
      alert('Please enter at least one recipient email.');
      return;
    }
    try {
      setIsSendingMail(true);
      const toList = composeMailData.to.split(/[,;\s]+/).filter((t) => t.includes('@'));
      const ccList = composeMailData.cc ? composeMailData.cc.split(/[,;\s]+/).filter((t) => t.includes('@')) : [];

      const res = await fetch(`${API_URL}/mail/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: selectedMailAccountId,
          to: toList,
          cc: ccList,
          subject: composeMailData.subject.trim() || '(No Subject)',
          bodyHtml: `<p>${composeMailData.body.replace(/\n/g, '<br/>')}</p>`,
          bodyText: composeMailData.body,
          attachments: composeAttachments.length > 0 ? composeAttachments : undefined,
        }),
      });

      if (res.ok) {
        const sendResult = await res.json();
        setShowComposeMailModal(false);
        setComposeMailData({ to: '', cc: '', subject: '', body: '' });
        setComposeAttachments([]);
        if (sendResult.sentViaGmail) {
          setCallNotificationMsg('Email sent successfully via Gmail API!');
        } else if (sendResult.gmailError === 'REQUIRES_REAUTH') {
          setCallNotificationMsg('Delivered internally. For external Gmail send, re-connect via "+"');
        } else {
          setCallNotificationMsg('Email sent successfully!');
        }
        setTimeout(() => setCallNotificationMsg(null), 3500);
        await loadMailAccounts();
        if (selectedMailAccountId) {
          loadMailMessages(selectedMailAccountId, mailFolder);
        }
      }
    } catch (e) {
      console.error('Failed to send email:', e);
      alert('Failed to send email');
    } finally {
      setIsSendingMail(false);
    }
  }

  async function handleSendInlineReply() {
    if (!selectedMailAccountId || !selectedEmail || (!inlineReplyText.trim() && inlineReplyAttachments.length === 0)) return;
    try {
      setIsSendingMail(true);
      const replyMsgId = selectedEmail.id;
      const res = await fetch(`${API_URL}/mail/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: selectedMailAccountId,
          replyToMessageId: replyMsgId,
          to: [selectedEmail.fromAddress],
          subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          bodyHtml: `<p>${(inlineReplyText || 'Please see attached.').replace(/\n/g, '<br/>')}</p><br/><blockquote>On ${new Date(selectedEmail.receivedAt).toLocaleString()}, ${selectedEmail.fromName || selectedEmail.fromAddress} wrote:<br/>${selectedEmail.bodyHtml || selectedEmail.snippet}</blockquote>`,
          bodyText: inlineReplyText || 'Please see attached.',
          attachments: inlineReplyAttachments.length > 0 ? inlineReplyAttachments : undefined,
        }),
      });

      if (res.ok) {
        const sendResult = await res.json();
        setInlineReplyText('');
        setInlineReplyAttachments([]);

        // Optimistically mark thread handled by current user
        setSelectedEmail((prev) =>
          prev
            ? {
                ...prev,
                isHandled: true,
                handledByName: user?.name || 'You',
                handledAt: new Date().toISOString(),
              }
            : null,
        );
        setMailMessages((prev) =>
          prev.map((m) =>
            m.id === replyMsgId
              ? {
                  ...m,
                  isHandled: true,
                  handledByName: user?.name || 'You',
                  handledAt: new Date().toISOString(),
                }
              : m,
          ),
        );
        setMailAccounts((prev) =>
          prev.map((a) =>
            a.id === selectedMailAccountId
              ? {
                  ...a,
                  unhandledCount: Math.max(0, (a.unhandledCount || 1) - 1),
                  handledCount: (a.handledCount || 0) + 1,
                }
              : a,
          ),
        );
        if (sendResult.sentViaGmail) {
          setCallNotificationMsg('Reply sent via Gmail & thread marked Done!');
        } else if (sendResult.gmailError === 'REQUIRES_REAUTH') {
          setCallNotificationMsg('Delivered internally. For external Gmail send, re-connect via "+"');
        } else {
          setCallNotificationMsg('Reply sent & thread marked Done!');
        }
        setTimeout(() => setCallNotificationMsg(null), 3500);
        await loadMailAccounts();
        if (selectedMailAccountId) {
          loadMailMessages(selectedMailAccountId, mailFolder);
        }
      }
    } catch (e) {
      console.error('Failed to send reply:', e);
      alert('Failed to send reply');
    } finally {
      setIsSendingMail(false);
    }
  }

  async function handleShareEmailToChannel() {
    if (!selectedEmail || !shareMailTargetChannelId) return;
    try {
      setIsSharingMail(true);
      const res = await fetch(`${API_URL}/mail/messages/${selectedEmail.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelId: shareMailTargetChannelId,
          note: shareMailNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowShareMailModal(false);
        setShareMailNote('');
        setCallNotificationMsg('Email shared to channel discussion!');
        setTimeout(() => setCallNotificationMsg(null), 4000);
      }
    } catch (e) {
      console.error('Failed to share email to channel:', e);
    } finally {
      setIsSharingMail(false);
    }
  }

  // Load emails when Mail View is activated or on initial token load
  useEffect(() => {
    if (token) {
      loadMailAccounts();
    }
  }, [token]);

  useEffect(() => {
    if (activeAppTab === 'mail' && token) {
      loadMailAccounts();
    }
  }, [activeAppTab, token]);

  useEffect(() => {
    if (activeAppTab === 'mail' && token && selectedMailAccountId) {
      loadMailMessages(selectedMailAccountId, mailFolder, mailSearchQuery);
    }
  }, [activeAppTab, selectedMailAccountId, mailFolder]);

  // 1. Initial Load: Workspace, Channels, and Members
  useEffect(() => {
    // Wait until AuthProvider has completed reading localStorage
    if (authLoading) return;

    if (!token) {
      router.push('/login');
      return;
    }

    async function loadWorkspace() {
      try {
        setLoading(true);

        const wsRes = await fetch(`${API_URL}/workspaces/${workspaceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!wsRes.ok) throw new Error('Workspace not found');
        const wsData = await wsRes.json();
        setCurrentWs(wsData);
        setCurrentWorkspace(wsData);

        const chRes = await fetch(`${API_URL}/workspaces/${workspaceId}/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (chRes.ok) {
          const chData: Channel[] = await chRes.json();
          setChannels(chData);
          if (chData.length > 0) {
            const generalCh = chData.find((c) => c.name === 'general') || chData[0];
            setActiveChannel(generalCh);
            if (generalCh.members) {
              setActiveChannelMembers(generalCh.members);
            }
          }
        }

        const membersRes = await fetch(`${API_URL}/workspaces/${workspaceId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
        router.push('/workspaces');
      } finally {
        setLoading(false);
      }
    }

    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId, token, authLoading, router, setCurrentWorkspace]);

  // 2. Load Messages & Socket.IO Realtime Listeners
  useEffect(() => {
    if (!activeChannel || !token) return;

    let isMounted = true;
    const socket = getSocket();

    async function loadMessages() {
      setMessagesLoading(true);
      try {
        const res = await fetch(`${API_URL}/channels/${activeChannel?.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const data: Message[] = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (isMounted) setMessagesLoading(false);
      }
    }

    async function loadChannelMembers() {
      try {
        const res = await fetch(`${API_URL}/channels/${activeChannel?.id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setActiveChannelMembers(data);
        }
      } catch (err) {
        console.error('Failed to load channel members:', err);
      }
    }

    loadMessages();
    loadChannelMembers();
    socket.emit('join_channel', { channelId: activeChannel.id });

    // Handle incoming main channel messages
    function handleNewMessage(msg: Message) {
      if (msg.channelId === activeChannel?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }

    // Handle thread replies
    function handleNewThreadReply(data: { parentId: string; reply: Message }) {
      // 1. Update parent message replies count in main channel feed
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.parentId) {
            const currentCount = m._count?.replies || 0;
            return {
              ...m,
              _count: { replies: currentCount + 1 },
              replies: [
                {
                  createdAt: data.reply.createdAt,
                  user: {
                    id: data.reply.user.id,
                    name: data.reply.user.name,
                    avatarUrl: data.reply.user.avatarUrl,
                  },
                },
                ...(m.replies || []),
              ].slice(0, 3),
            };
          }
          return m;
        }),
      );

      // 2. If thread drawer is open for this parent, append the reply!
      setActiveThreadParent((currentParent) => {
        if (currentParent && currentParent.id === data.parentId) {
          setThreadReplies((prevReplies) => {
            if (prevReplies.some((r) => r.id === data.reply.id)) return prevReplies;
            return [...prevReplies, data.reply];
          });
          return {
            ...currentParent,
            _count: { replies: (currentParent._count?.replies || 0) + 1 },
          };
        }
        return currentParent;
      });
    }

    // Handle real-time reactions
    function handleReactionUpdated(data: { messageId: string; reactions: Reaction[] }) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.messageId) {
            return { ...m, reactions: data.reactions };
          }
          return m;
        }),
      );

      setActiveThreadParent((parent) => {
        if (parent && parent.id === data.messageId) {
          return { ...parent, reactions: data.reactions };
        }
        return parent;
      });

      setThreadReplies((replies) =>
        replies.map((r) => {
          if (r.id === data.messageId) {
            return { ...r, reactions: data.reactions };
          }
          return r;
        }),
      );
    }

    // Handle typing indicator
    function handleUserTyping(data: { channelId: string; userName: string; isTyping: boolean }) {
      if (data.channelId === activeChannel?.id && data.userName !== user?.name) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            return prev.includes(data.userName) ? prev : [...prev, data.userName];
          } else {
            return prev.filter((name) => name !== data.userName);
          }
        });
      }
    }

    // Handle real-time message editing & deletion
    function handleMessageUpdated(updated: Message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...updated, isEdited: true } : m)),
      );
      setActiveThreadParent((parent) =>
        parent && parent.id === updated.id ? { ...parent, ...updated, isEdited: true } : parent,
      );
      setThreadReplies((replies) =>
        replies.map((r) => (r.id === updated.id ? { ...r, ...updated, isEdited: true } : r)),
      );
    }

    function handleMessageDeleted(data: { messageId: string; channelId?: string; parentId?: string | null }) {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      setActiveThreadParent((parent) => (parent && parent.id === data.messageId ? null : parent));
      setThreadReplies((replies) => replies.filter((r) => r.id !== data.messageId));
      if (data.parentId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.parentId
              ? {
                  ...m,
                  _count: {
                    ...m._count,
                    replies: Math.max(0, (m._count?.replies || 1) - 1),
                  },
                }
              : m,
          ),
        );
      }
    }

    socket.on('new_message', handleNewMessage);
    socket.on('new_thread_reply', handleNewThreadReply);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      isMounted = false;
      socket.emit('leave_channel', { channelId: activeChannel.id });
      socket.off('new_message', handleNewMessage);
      socket.off('new_thread_reply', handleNewThreadReply);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [activeChannel, token, user?.name]);

  // Module 5: Direct Messages Socket & Fetch Effect
  useEffect(() => {
    if (!activeConversation || !token) return;

    const socket = getSocket();
    socket.emit('join_conversation', { conversationId: activeConversation.id });

    function handleNewDirectMessage(msg: DirectMessage) {
      if (msg.conversationId === activeConversation?.id) {
        setDirectMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }

    function handleDirectReactionUpdated(data: { directMessageId: string; reactions: Reaction[] }) {
      setDirectMessages((prev) =>
        prev.map((m) => (m.id === data.directMessageId ? { ...m, reactions: data.reactions } : m)),
      );
    }

    function handleDirectMessageUpdated(updated: DirectMessage) {
      setDirectMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...updated, isEdited: true } : m)),
      );
    }

    function handleDirectMessageDeleted(data: { messageId: string; conversationId?: string }) {
      setDirectMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    }

    socket.on('new_direct_message', handleNewDirectMessage);
    socket.on('direct_reaction_updated', handleDirectReactionUpdated);
    socket.on('direct_message_updated', handleDirectMessageUpdated);
    socket.on('direct_message_deleted', handleDirectMessageDeleted);

    return () => {
      socket.emit('leave_conversation', { conversationId: activeConversation.id });
      socket.off('new_direct_message', handleNewDirectMessage);
      socket.off('direct_reaction_updated', handleDirectReactionUpdated);
      socket.off('direct_message_updated', handleDirectMessageUpdated);
      socket.off('direct_message_deleted', handleDirectMessageDeleted);
    };
  }, [activeConversation, token]);

  // Global Presence Socket Listener
  useEffect(() => {
    const socket = getSocket();

    function handlePresenceUpdated(updatedUser: { id: string; presence: PresenceStatus }) {
      setMembers((prev) =>
        prev.map((m) =>
          m.user.id === updatedUser.id
            ? { ...m, user: { ...m.user, presence: updatedUser.presence } }
            : m,
        ),
      );
      setActiveRecipient((prev) =>
        prev && prev.id === updatedUser.id
          ? { ...prev, presence: updatedUser.presence }
          : prev,
      );
      if (user && updatedUser.id === user.id) {
        setUserPresence(updatedUser.presence);
      }
    }

    socket.on('presence_updated', handlePresenceUpdated);

    return () => {
      socket.off('presence_updated', handlePresenceUpdated);
    };
  }, [user]);

  // Real-time Activity, Tab Visibility, and Idle / Screen Lock Detection
  const isAutoAwayRef = useRef<boolean>(false);
  const userPresenceRef = useRef<PresenceStatus>(userPresence);
  userPresenceRef.current = userPresence;

  useEffect(() => {
    if (!user || !token) return;

    const socket = getSocket();
    let idleTimeout: any = null;
    let visibilityTimeout: any = null;

    function resetIdleTimer() {
      // If status was auto-set to AWAY, return immediately to ONLINE upon activity
      if (isAutoAwayRef.current) {
        isAutoAwayRef.current = false;
        handleUpdatePresence('ONLINE');
      }

      if (idleTimeout) clearTimeout(idleTimeout);
      // Auto-set AWAY after 2 minutes of zero user interaction
      idleTimeout = setTimeout(() => {
        if (userPresenceRef.current === 'ONLINE') {
          isAutoAwayRef.current = true;
          handleUpdatePresence('AWAY');
        }
      }, 2 * 60 * 1000);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        // Tab hidden or screen locked: grace period of 2 seconds before setting AWAY
        // This ensures the socket emits AWAY before the OS puts the tab/process to sleep
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (document.visibilityState === 'hidden' && userPresenceRef.current === 'ONLINE') {
            isAutoAwayRef.current = true;
            handleUpdatePresence('AWAY');
          }
        }, 2000);
      } else {
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
        if (isAutoAwayRef.current) {
          isAutoAwayRef.current = false;
          handleUpdatePresence('ONLINE');
        }
      }
    }

    const currentUserId = user.id;

    function handlePageHide() {
      if (userPresenceRef.current === 'ONLINE') {
        isAutoAwayRef.current = true;
        socket.emit('set_presence', { userId: currentUserId, presence: 'AWAY' });
      }
    }

    function handleBeforeUnload() {
      socket.emit('set_presence', { userId: currentUserId, presence: 'OFFLINE' });
      socket.emit('leave_user', { userId: currentUserId });
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    resetIdleTimer();

    return () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, token]);

  // Synchronize presence to BUSY during active 1-on-1 calls or team meetings
  useEffect(() => {
    if (activeTeamMeeting || callStatus === 'connected' || callStatus === 'calling') {
      handleUpdatePresence('BUSY');
    } else if (callStatus === 'idle' && !activeTeamMeeting) {
      if (userPresence === 'BUSY') {
        handleUpdatePresence('ONLINE');
      }
    }
  }, [activeTeamMeeting, callStatus]);

  // Play subtle Slack-like synth chime
  function playNotificationChime() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay may be suppressed before user interaction
    }
  }

  // Keep call refs synchronized with state
  useEffect(() => {
    callPeerRef.current = callPeer;
  }, [callPeer]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Detect if a call was interrupted by a page reload
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('teamflow_interrupted_call');
        if (raw) {
          sessionStorage.removeItem('teamflow_interrupted_call');
          const parsed = JSON.parse(raw);
          if (Date.now() - (parsed.timestamp || 0) < 60000 && parsed.peerId && parsed.peerName) {
            setInterruptedCall({
              peerId: parsed.peerId,
              peerName: parsed.peerName,
              peerAvatar: parsed.peerAvatar,
              isVideo: !!parsed.isVideo,
            });
          }
        }
      }
    } catch (e) {}
  }, []);

  // Prevent accidental page reload during active calls & save session for recovery
  useEffect(() => {
    if (callStatus === 'connected' || callStatus === 'calling') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'You are currently in an active call. Reloading or leaving will disconnect the call.';
        return e.returnValue;
      };

      const handlePageHide = () => {
        if (callPeerRef.current?.id) {
          try {
            getSocket().emit('end_call', { toUserId: callPeerRef.current.id });
          } catch (e) {}
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handlePageHide);

      if (callPeer && callStatus === 'connected') {
        try {
          sessionStorage.setItem(
            'teamflow_interrupted_call',
            JSON.stringify({
              peerId: callPeer.id,
              peerName: callPeer.name,
              peerAvatar: callPeer.avatarUrl,
              isVideo: callType === 'video',
              timestamp: Date.now(),
            }),
          );
        } catch (e) {}
      }

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handlePageHide);
      };
    } else if (callStatus === 'idle') {
      try {
        sessionStorage.removeItem('teamflow_interrupted_call');
      } catch (e) {}
    }
  }, [callStatus, callPeer, callType]);

  function handleResumeInterruptedCall() {
    if (!interruptedCall) return;
    const { peerId, peerName, peerAvatar, isVideo } = interruptedCall;
    setInterruptedCall(null);
    handleStartCall({ id: peerId, name: peerName, avatarUrl: peerAvatar }, isVideo);
  }

  // High-reliability global STUN servers & ICE pool for crystal-clear WebRTC
  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
    iceCandidatePoolSize: 10,
  };

  async function requestWakeLock() {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.warn('Wake lock not granted:', e);
    }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
    }
  }

  // Ringtone Sounds
  function startOutgoingRingtone() {
    stopRingTone();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringtoneAudioCtxRef.current = ctx;

      const playBeep = () => {
        if (!ringtoneAudioCtxRef.current) return;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      };

      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, 2400);
    } catch (e) {
      console.warn('Outgoing ringtone error:', e);
    }
  }

  function startIncomingRingtone() {
    stopRingTone();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringtoneAudioCtxRef.current = ctx;

      const playChime = () => {
        if (!ringtoneAudioCtxRef.current) return;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.22, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.4);
        });
      };

      playChime();
      ringtoneIntervalRef.current = setInterval(playChime, 2200);
    } catch (e) {
      console.warn('Incoming ringtone error:', e);
    }
  }

  function stopRingTone() {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneAudioCtxRef.current) {
      try {
        ringtoneAudioCtxRef.current.close();
      } catch (e) {}
      ringtoneAudioCtxRef.current = null;
    }
  }

  // Resilient Media Stream Generation (with Synthetic Fallback for machines without webcam/mic)
  function createSyntheticStream(isVideo: boolean): MediaStream {
    const stream = new MediaStream();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        const dest = audioCtx.createMediaStreamDestination();
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) stream.addTrack(audioTrack);
      }
    } catch (e) {
      console.warn('Synthetic audio creation failed:', e);
    }

    if (isVideo && typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#6366f1';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Live WebRTC Stream', 320, 180);
        }
        const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : null;
        if (canvasStream && canvasStream.getVideoTracks().length > 0) {
          stream.addTrack(canvasStream.getVideoTracks()[0]);
        }
      } catch (e) {
        console.warn('Synthetic video creation failed:', e);
      }
    }

    return stream;
  }

  async function getMediaStream(isVideo: boolean, customFacing: 'user' | 'environment' = facingMode): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Media devices not supported in this browser. Please ensure you are using HTTPS or a modern browser like Chrome/Safari.');
      throw new Error('getUserMedia not supported');
    }

    // High Definition Audio with acoustic echo cancellation, noise suppression & auto gain
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true },
      sampleRate: { ideal: 48000 },
      channelCount: { ideal: 1 },
    };

    if (isVideo) {
      // 1. Try high-definition user-facing / selected camera first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: {
            facingMode: customFacing,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
        });
        setHasLocalCamera(true);
        setIsVideoMuted(false);
        return stream;
      } catch (hdErr: any) {
        console.warn('HD camera constraint failed, retrying standard video:', hdErr);
      }

      // 2. Try basic standard video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: true,
        });
        setHasLocalCamera(true);
        setIsVideoMuted(false);
        return stream;
      } catch (videoErr: any) {
        console.warn('Camera not found or camera access failed, falling back to microphone-only stream:', videoErr);
      }

      // 3. Graceful Fallback: The device has NO webcam or camera permission was denied.
      // Automatically fallback to audio-only stream so the user can still call and participate!
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
        setHasLocalCamera(false);
        setIsVideoMuted(true);
        setCallNotificationMsg('No camera detected on your device — connected with microphone only');
        setTimeout(() => setCallNotificationMsg(null), 6000);
        return audioOnlyStream;
      } catch (audioErr: any) {
        console.error('Microphone access also failed:', audioErr);
        if (audioErr.name === 'NotAllowedError' || audioErr.name === 'PermissionDeniedError') {
          alert('Microphone permission is required to join the call. Please allow microphone access in your browser or device settings.');
        } else if (audioErr.name === 'NotFoundError' || audioErr.name === 'DevicesNotFoundError') {
          alert('No microphone was found on your device. Please plug in a microphone or headset.');
        } else {
          alert(`Could not access audio device: ${audioErr.message || 'Microphone error'}`);
        }
        throw audioErr;
      }
    } else {
      // Standard audio-only call
      setHasLocalCamera(false);
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
      } catch (audioErr: any) {
        console.error('Microphone access failed:', audioErr);
        if (audioErr.name === 'NotAllowedError' || audioErr.name === 'PermissionDeniedError') {
          alert('Microphone permission is required to join the voice call. Please allow microphone access in your browser or device settings.');
        } else if (audioErr.name === 'NotFoundError' || audioErr.name === 'DevicesNotFoundError') {
          alert('No microphone was found on your device. Please connect a microphone or headset.');
        } else {
          alert(`Could not access microphone: ${audioErr.message || 'Audio error'}`);
        }
        throw audioErr;
      }
    }
  }

  async function flipCamera() {
    if (!hasLocalCamera || callStatus === 'idle') return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);

    try {
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: newFacing },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacing },
        });
      }

      const newTrack = newStream.getVideoTracks()[0];
      if (newTrack) {
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) {
            oldTrack.stop();
            localStreamRef.current.removeTrack(oldTrack);
          }
          localStreamRef.current.addTrack(newTrack);
        }

        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newTrack);
          }
        }

        setCallNotificationMsg(`Switched to ${newFacing === 'user' ? 'Front' : 'Back'} Camera`);
        setTimeout(() => setCallNotificationMsg(null), 3000);
      }
    } catch (err: any) {
      console.warn('Camera flip failed:', err);
      setCallNotificationMsg('Could not switch camera');
      setTimeout(() => setCallNotificationMsg(null), 3000);
    }
  }

  function cleanupCall(notifyPeer: boolean = true) {
    stopRingTone();
    if (incomingCallNotifRef.current) {
      incomingCallNotifRef.current.close();
      incomingCallNotifRef.current = null;
    }
    if (tabTitleIntervalRef.current) {
      clearInterval(tabTitleIntervalRef.current);
      tabTitleIntervalRef.current = null;
      document.title = originalTitleRef.current || 'Patterns';
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (screenAudioCtxRef.current) {
      try {
        screenAudioCtxRef.current.close();
      } catch (e) {}
      screenAudioCtxRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];

    if (notifyPeer && callPeerRef.current?.id) {
      const socket = getSocket();
      socket.emit('end_call', { toUserId: callPeerRef.current.id });
    }

    setCallStatus('idle');
    setCallPeer(null);
    setIncomingCall(null);
    setCallDuration(0);
    handleUpdatePresence('ONLINE');
    setIsMicMuted(false);
    setIsVideoMuted(false);
    setIsScreenSharing(false);
    setHasRemoteVideo(false);
    setIsPeerVideoEnabled(false);
    setHasLocalCamera(true);
    setShowSpeakerMenu(false);
    setSelectedAudioOutput('default');
    setIsSpeakerOn(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setIsPeerRecording(false);
    setIsPeerScreenSharing(false);
    setIsLocalPipMinimized(false);
    setScreenFitMode('contain');
    setRecordingDuration(0);
  }

  async function handleStartCall(targetUser: { id: string; name: string; avatarUrl?: string }, isVideo: boolean) {
    if (!user) return;
    if (targetUser.id === user.id) {
      alert('You cannot call yourself.');
      return;
    }

    cleanupCall(false);
    setCallPeer(targetUser);
    setCallType(isVideo ? 'video' : 'audio');
    setCallStatus('calling');
    startOutgoingRingtone();
    handleUpdatePresence('BUSY');

    // Unlock/pre-warm mobile audio pipeline on user touch gesture
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().catch(() => {});
    }

    try {
      const stream = await getMediaStream(isVideo);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const socket = getSocket();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // If local device has NO video track (no camera or audio call), add transceiver so remote peer's camera video can be received!
      if (stream.getVideoTracks().length === 0) {
        try {
          pc.addTransceiver('video', { direction: 'recvonly' });
        } catch (tErr) {
          console.warn('Transceiver addition warning:', tErr);
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            toUserId: targetUser.id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote media track:', event.track.kind, event.track.id);

        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }

        if (event.track.kind === 'video') {
          // Fix for Screen Share: Replace existing video tracks so the new incoming screen/camera track is index 0
          const currentVideos = remoteStreamRef.current.getVideoTracks();
          currentVideos.forEach((vt) => {
            if (vt.id !== event.track.id) {
              remoteStreamRef.current!.removeTrack(vt);
            }
          });
          if (!remoteStreamRef.current.getVideoTracks().some((vt) => vt.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }

          setHasRemoteVideo(true);
          setCallType('video');

          event.track.onunmute = () => {
            setHasRemoteVideo(true);
            if (remoteVideoRef.current && remoteStreamRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
              remoteVideoRef.current.play().catch(() => {});
            }
          };
          event.track.onended = () => {
            if (remoteStreamRef.current?.getVideoTracks().length === 0) {
              setHasRemoteVideo(false);
            }
          };
        } else if (event.track.kind === 'audio') {
          event.track.enabled = true;
          if (!remoteStreamRef.current.getAudioTracks().some((at) => at.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          event.track.onunmute = () => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.play().catch(() => {});
            }
          };
        }

        const remoteStream = remoteStreamRef.current;
        if (remoteStream.getVideoTracks().length > 0) {
          setHasRemoteVideo(true);
        }

        const streamToPlay = event.streams && event.streams[0] ? event.streams[0] : remoteStream;

        // Dedicated mobile and desktop audio player
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = streamToPlay;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().catch((e) => {
            console.warn('remoteAudioRef play error:', e);
          });
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch((e) => {
            console.warn('remoteVideoRef play error:', e);
          });
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        toUserId: targetUser.id,
        caller: {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        isVideo,
        signalData: offer,
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      cleanupCall(false);
      setCallNotificationMsg('Could not initiate call (Microphone permission needed)');
      setTimeout(() => setCallNotificationMsg(null), 4000);
    }
  }

  async function handleAcceptCall() {
    if (!incomingCall || !user) return;
    stopRingTone();
    if (incomingCallNotifRef.current) {
      incomingCallNotifRef.current.close();
      incomingCallNotifRef.current = null;
    }
    if (tabTitleIntervalRef.current) {
      clearInterval(tabTitleIntervalRef.current);
      tabTitleIntervalRef.current = null;
      document.title = originalTitleRef.current || 'Patterns';
    }

    const caller = incomingCall.from;
    const isVideo = incomingCall.isVideo;

    // If this call is an invitation to join a Team Meeting / Group Call:
    if (incomingCall.meetingId) {
      setActiveTeamMeeting({
        id: incomingCall.meetingId,
        workspaceId: workspaceId || '',
        title: `Team Meeting`,
        scheduledAt: new Date().toISOString(),
        duration: 60,
        hostId: caller.id,
        status: 'LIVE' as const,
        createdAt: new Date().toISOString(),
        host: { id: caller.id, name: caller.name, email: '' },
        participants: [],
      });
      cleanupCall(false);
      return;
    }

    setCallPeer(caller);
    setCallType(isVideo ? 'video' : 'audio');
    setCallStatus('connected');
    requestWakeLock();

    // Unlock/pre-warm mobile audio pipeline on user touch gesture
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().catch(() => {});
    }

    try {
      const stream = await getMediaStream(isVideo);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const socket = getSocket();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // If local device has NO video track (no camera), but this is a video call:
      // Add a video transceiver with direction 'recvonly' so we can still receive caller's camera video!
      if (isVideo && stream.getVideoTracks().length === 0) {
        try {
          pc.addTransceiver('video', { direction: 'recvonly' });
        } catch (tErr) {
          console.warn('Transceiver addition warning on accept:', tErr);
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            toUserId: caller.id,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote media track on accept:', event.track.kind, event.track.id);

        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }

        if (event.track.kind === 'video') {
          // Fix for Screen Share: Replace existing video tracks so the new incoming screen/camera track is index 0
          const currentVideos = remoteStreamRef.current.getVideoTracks();
          currentVideos.forEach((vt) => {
            if (vt.id !== event.track.id) {
              remoteStreamRef.current!.removeTrack(vt);
            }
          });
          if (!remoteStreamRef.current.getVideoTracks().some((vt) => vt.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }

          setHasRemoteVideo(true);
          setCallType('video');

          event.track.onunmute = () => {
            setHasRemoteVideo(true);
            if (remoteVideoRef.current && remoteStreamRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
              remoteVideoRef.current.play().catch(() => {});
            }
          };
          event.track.onended = () => {
            if (remoteStreamRef.current?.getVideoTracks().length === 0) {
              setHasRemoteVideo(false);
            }
          };
        } else if (event.track.kind === 'audio') {
          event.track.enabled = true;
          if (!remoteStreamRef.current.getAudioTracks().some((at) => at.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          event.track.onunmute = () => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.play().catch(() => {});
            }
          };
        }

        const remoteStream = remoteStreamRef.current;
        if (remoteStream.getVideoTracks().length > 0) {
          setHasRemoteVideo(true);
        }

        const streamToPlay = event.streams && event.streams[0] ? event.streams[0] : remoteStream;

        // Dedicated mobile and desktop audio player
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = streamToPlay;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().catch((e) => {
            console.warn('remoteAudioRef play error:', e);
          });
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch((e) => {
            console.warn('remoteVideoRef play error:', e);
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));

      for (const cand of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', {
        toUserId: caller.id,
        signalData: answer,
      });

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to accept call:', err);
      cleanupCall(true);
      setCallNotificationMsg('Call cancelled - camera/mic permission not granted');
      setTimeout(() => setCallNotificationMsg(null), 4000);
    }
  }

  function handleDeclineCall() {
    stopRingTone();
    if (incomingCallNotifRef.current) {
      incomingCallNotifRef.current.close();
      incomingCallNotifRef.current = null;
    }
    if (tabTitleIntervalRef.current) {
      clearInterval(tabTitleIntervalRef.current);
      tabTitleIntervalRef.current = null;
      document.title = originalTitleRef.current || 'Patterns';
    }
    if (incomingCall?.from?.id) {
      const socket = getSocket();
      socket.emit('decline_call', { toUserId: incomingCall.from.id });
    }
    setIncomingCall(null);
    setCallStatus('idle');
  }

  async function loadAudioOutputDevices() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === 'audiooutput');
      setAudioOutputDevices(outputs);
    } catch (err) {
      console.warn('Could not enumerate audio output devices:', err);
    }
  }

  async function switchAudioOutput(deviceId: string, deviceLabel?: string) {
    setSelectedAudioOutput(deviceId);
    setShowSpeakerMenu(false);

    try {
      if (remoteAudioRef.current && 'setSinkId' in HTMLMediaElement.prototype) {
        await (remoteAudioRef.current as any).setSinkId(deviceId);
      }
      if (remoteVideoRef.current && 'setSinkId' in HTMLMediaElement.prototype) {
        await (remoteVideoRef.current as any).setSinkId(deviceId);
      }

      const label = deviceLabel || (deviceId === 'default' ? 'Default Speaker' : 'Speaker');
      setCallNotificationMsg(`Audio output: ${label}`);
      setTimeout(() => setCallNotificationMsg(null), 3500);
    } catch (e: any) {
      console.warn('setSinkId error:', e);
      setCallNotificationMsg('Could not switch audio output on this device');
      setTimeout(() => setCallNotificationMsg(null), 3000);
    }
  }

  async function startRecording() {
    if (callStatus !== 'connected') {
      alert('You can only record an active, connected call.');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        alert('AudioContext is not supported in this browser.');
        return;
      }
      const audioCtx = new AudioCtx();
      recordingAudioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      // 1. Mix local microphone audio
      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        try {
          const localAudioSource = audioCtx.createMediaStreamSource(localStreamRef.current);
          localAudioSource.connect(dest);
        } catch (e) {
          console.warn('Could not connect local audio to recorder:', e);
        }
      }

      // 2. Mix remote peer audio
      if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
        try {
          const remoteAudioSource = audioCtx.createMediaStreamSource(remoteStreamRef.current);
          remoteAudioSource.connect(dest);
        } catch (e) {
          console.warn('Could not connect remote audio to recorder:', e);
        }
      }

      // 3. Assemble combined recording stream
      const recordStream = new MediaStream();
      const mixedAudioTrack = dest.stream.getAudioTracks()[0];
      if (mixedAudioTrack) {
        recordStream.addTrack(mixedAudioTrack);
      }

      // For video calls, attach live video track (remote video, screen share, or local camera)
      const activeVideoTrack =
        remoteStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live') ||
        screenStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live') ||
        localStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');

      const isVideoRecording = callType === 'video' && !!activeVideoTrack;
      if (isVideoRecording && activeVideoTrack) {
        recordStream.addTrack(activeVideoTrack);
      }

      // Determine best supported MIME type
      let mimeType = '';
      const candidateTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg',
      ];
      for (const type of candidateTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const recorder = new MediaRecorder(recordStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const hasVideo = recordStream.getVideoTracks().length > 0;
        const blobType = mimeType || (hasVideo ? 'video/webm' : 'audio/webm');
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const ext = 'webm';
          const fileName = `${hasVideo ? 'video' : 'call'}-recording-${callPeerRef.current?.name?.replace(/\s+/g, '_') || 'teamflow'}-${timestamp}.${ext}`;
          const duration = recordingDuration;
          const sizeFormatted = formatFileSize(blob.size);

          setCompletedRecording({
            blob,
            url,
            fileName,
            duration,
            isVideo: hasVideo,
            sizeFormatted,
          });

          // Upload and save directly in PostgreSQL database via /api/recordings
          if (token && workspaceId) {
            try {
              setCallNotificationMsg('Saving call recording to database...');
              const formData = new FormData();
              const file = new (window as any).File([blob], fileName, { type: blobType });
              formData.append('file', file);
              formData.append('workspaceId', workspaceId);
              formData.append('duration', String(duration));
              formData.append('isVideo', String(hasVideo));
              if (activeChannel?.id) formData.append('channelId', activeChannel.id);
              if (activeConversation?.id) formData.append('conversationId', activeConversation.id);
              if (callPeerRef.current?.id) formData.append('peerId', callPeerRef.current.id);

              const recRes = await fetch(`${API_URL}/recordings`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              });

              if (recRes.ok) {
                setCallNotificationMsg('✅ Call recording saved to database & chat!');
                loadWorkspaceRecordings();
              } else {
                setCallNotificationMsg('Recording saved locally! Ready to preview or download.');
              }
            } catch (err) {
              console.warn('Could not auto-save recording to backend:', err);
              setCallNotificationMsg('Recording saved! Ready to preview or download.');
            }
          }
          setTimeout(() => setCallNotificationMsg(null), 5000);
        }
        if (recordingAudioCtxRef.current) {
          try {
            recordingAudioCtxRef.current.close();
          } catch (e) {}
          recordingAudioCtxRef.current = null;
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Notify remote peer that call is being recorded
      if (callPeerRef.current?.id) {
        getSocket().emit('call_recording_state', {
          toUserId: callPeerRef.current.id,
          isRecording: true,
          recordedByName: user?.name,
        });
      }

      setCallNotificationMsg('Call recording started');
      setTimeout(() => setCallNotificationMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      alert(`Could not start call recording: ${err.message || 'MediaRecorder error'}`);
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping mediaRecorder:', e);
      }
    }
    setIsRecording(false);
    setRecordingDuration(0);

    if (callPeerRef.current?.id) {
      getSocket().emit('call_recording_state', {
        toUserId: callPeerRef.current.id,
        isRecording: false,
      });
    }
  }

  function downloadRecordingManually() {
    if (!completedRecording) return;
    const a = document.createElement('a');
    a.href = completedRecording.url;
    a.download = completedRecording.fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1000);
    setCallNotificationMsg('Recording downloaded to your Downloads folder!');
    setTimeout(() => setCallNotificationMsg(null), 4000);
  }

  async function shareRecordingToChat() {
    if (!completedRecording || !token) return;
    try {
      const file = new (window as any).File([completedRecording.blob], completedRecording.fileName, {
        type: completedRecording.blob.type,
      });
      const uploaded = await uploadFile(file);
      if (uploaded) {
        if (activeConversation) {
          setPendingDMAttachments((prev) => [...prev, uploaded]);
        } else {
          setPendingAttachments((prev) => [...prev, uploaded]);
        }
        setCallNotificationMsg('Recording attached to your message! Ready to send.');
        setTimeout(() => setCallNotificationMsg(null), 5000);
      }
    } catch (e) {
      console.error('Failed to share recording to chat:', e);
      alert('Could not attach recording to chat.');
    }
  }

  function closeRecordingModal() {
    if (completedRecording?.url) {
      URL.revokeObjectURL(completedRecording.url);
    }
    setCompletedRecording(null);
  }

  function toggleMic() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  }

  async function toggleCamera() {
    const existingVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (existingVideoTrack) {
      const willBeEnabled = !existingVideoTrack.enabled;
      existingVideoTrack.enabled = willBeEnabled;
      setIsVideoMuted(!willBeEnabled);

      if (callPeerRef.current?.id) {
        getSocket().emit('toggle_video', {
          toUserId: callPeerRef.current.id,
          videoEnabled: willBeEnabled,
        });
      }
      return;
    }

    // No local camera track existed initially (device had no camera initially, joined mic-only, or audio call)
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      });
      const newTrack = camStream.getVideoTracks()[0];
      if (newTrack) {
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        localStreamRef.current.addTrack(newTrack);
        setHasLocalCamera(true);
        setIsVideoMuted(false);
        setCallType('video');

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }

        if (peerConnectionRef.current) {
          const pc = peerConnectionRef.current;
          const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');
          if (videoTransceiver && videoTransceiver.sender) {
            videoTransceiver.direction = 'sendrecv';
            await videoTransceiver.sender.replaceTrack(newTrack);
          } else {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStreamRef.current);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (callPeerRef.current?.id) {
                getSocket().emit('renegotiate_call', {
                  toUserId: callPeerRef.current.id,
                  signalData: offer,
                });
              }
            }
          }
        }

        if (callPeerRef.current?.id) {
          getSocket().emit('toggle_video', {
            toUserId: callPeerRef.current.id,
            videoEnabled: true,
          });
        }

        setCallNotificationMsg('Camera activated');
        setTimeout(() => setCallNotificationMsg(null), 3000);
      }
    } catch (camErr) {
      setHasLocalCamera(false);
      setCallNotificationMsg('No camera detected on this device');
      setTimeout(() => setCallNotificationMsg(null), 4000);
    }
  }

  async function toggleScreenShare() {
    if (!peerConnectionRef.current) return;
    try {
      const pc = peerConnectionRef.current;
      if (!isScreenSharing) {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Screen sharing is not supported in this browser.');
          return;
        }

        let screenStream: MediaStream;
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            } as any,
          });
        } catch (err: any) {
          if (err.name === 'TypeError' || err.name === 'NotSupportedError') {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          } else {
            throw err;
          }
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        screenStreamRef.current = screenStream;
        setCallType('video');

        // Check if user shared audio (e.g. YouTube / video player / tab audio)
        const screenAudioTracks = screenStream.getAudioTracks();
        const hasScreenAudio = screenAudioTracks.length > 0;
        let broadcastAudioTrack: MediaStreamTrack | null = null;

        if (hasScreenAudio) {
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              screenAudioCtxRef.current = audioCtx;
              const destination = audioCtx.createMediaStreamDestination();

              const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTracks[0]]));
              screenSource.connect(destination);

              const micTrack = localStreamRef.current?.getAudioTracks().find((t) => t.readyState === 'live');
              if (micTrack) {
                const micSource = audioCtx.createMediaStreamSource(new MediaStream([micTrack]));
                micSource.connect(destination);
              }

              broadcastAudioTrack = destination.stream.getAudioTracks()[0] || null;
            }
          } catch (audioMixErr) {
            console.warn('Audio mixing error, using screen audio track directly:', audioMixErr);
            broadcastAudioTrack = screenAudioTracks[0];
          }
        }

        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video' || s.track === null);
        const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');

        if (videoTransceiver && videoTransceiver.sender) {
          videoTransceiver.direction = 'sendrecv';
          await videoTransceiver.sender.replaceTrack(screenTrack);
        } else if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, screenStream);
        }

        // Replace audio track with mixed track if screen audio is present
        if (broadcastAudioTrack) {
          const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(broadcastAudioTrack).catch(() => {});
          }
        }

        // Always perform SDP renegotiation so remote peer definitely receives the new track
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (callPeerRef.current?.id) {
            getSocket().emit('renegotiate_call', {
              toUserId: callPeerRef.current.id,
              signalData: offer,
            });
            getSocket().emit('toggle_video', {
              toUserId: callPeerRef.current.id,
              videoEnabled: true,
            });
            getSocket().emit('toggle_screen_share', {
              toUserId: callPeerRef.current.id,
              isScreenSharing: true,
            });
          }
        } catch (negErr) {
          console.warn('Renegotiation offer error during screen share:', negErr);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          localVideoRef.current.play().catch(() => {});
        }

        setCallNotificationMsg('You started sharing your screen');
        setTimeout(() => setCallNotificationMsg(null), 3000);
        setIsScreenSharing(true);
        setScreenFitMode('contain');

        screenTrack.onended = () => {
          stopScreenSharing();
        };
      } else {
        await stopScreenSharing();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.error('Screen sharing error:', err);
      }
      setIsScreenSharing(false);
    }
  }

  async function stopScreenSharing() {
    if (!peerConnectionRef.current) return;
    const pc = peerConnectionRef.current;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (screenAudioCtxRef.current) {
      try {
        await screenAudioCtxRef.current.close();
      } catch (e) {}
      screenAudioCtxRef.current = null;
    }

    const originalVideoTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');
    const originalMicTrack = localStreamRef.current?.getAudioTracks().find((t) => t.readyState === 'live');
    const hasLiveCamera = !!(originalVideoTrack && !isVideoMuted);

    const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');
    const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');

    if (videoTransceiver && videoTransceiver.sender) {
      if (hasLiveCamera && originalVideoTrack) {
        videoTransceiver.direction = 'sendrecv';
        await videoTransceiver.sender.replaceTrack(originalVideoTrack);
      } else {
        videoTransceiver.direction = 'recvonly';
        await videoTransceiver.sender.replaceTrack(null);
      }
    } else if (videoSender) {
      await videoSender.replaceTrack(hasLiveCamera && originalVideoTrack ? originalVideoTrack : null);
    }

    // Restore original mic audio track (remove mixed screen audio)
    if (originalMicTrack) {
      const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(originalMicTrack).catch(() => {});
      }
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }

    // Always renegotiate when stopping screen sharing as well
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (callPeerRef.current?.id) {
        getSocket().emit('renegotiate_call', {
          toUserId: callPeerRef.current.id,
          signalData: offer,
        });
        getSocket().emit('toggle_video', {
          toUserId: callPeerRef.current.id,
          videoEnabled: hasLiveCamera,
        });
        getSocket().emit('toggle_screen_share', {
          toUserId: callPeerRef.current.id,
          isScreenSharing: false,
        });
      }
    } catch (e) {
      console.warn('Renegotiation on stop screen sharing error:', e);
    }

    setIsScreenSharing(false);
    setCallNotificationMsg('Screen sharing stopped');
    setTimeout(() => setCallNotificationMsg(null), 3000);
  }

  function formatCallDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Bind video element streams on state changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callStatus, isVideoMuted]);

  useEffect(() => {
    if (callStatus === 'connected') {
      loadAudioOutputDevices();
      if (remoteStreamRef.current) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().catch((e) => console.warn('remoteAudio play failed:', e));
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch((e) => console.warn('remoteVideo play failed:', e));
        }
      }
    }
  }, [callStatus]);

  // Global Call Socket Signaling Listener
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    socket.emit('join_user', { userId: user.id });

    async function handleIncomingCall(data: {
      from: { id: string; name: string; avatarUrl?: string };
      isVideo: boolean;
      signalData: any;
      meetingId?: string;
    }) {
      // If this is a group meeting invite (has meetingId) — join group meeting directly
      if (data.meetingId) {
        stopRingTone();
        setActiveTeamMeeting({
          id: data.meetingId,
          workspaceId: workspaceId || '',
          title: `Meeting with ${data.from.name}`,
          scheduledAt: new Date().toISOString(),
          duration: 60,
          hostId: data.from.id,
          status: 'LIVE' as const,
          createdAt: new Date().toISOString(),
          host: { id: data.from.id, name: data.from.name, email: '' },
          participants: [],
        });
        // Show system notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`📹 ${data.from.name} invited you to a group meeting`, {
              body: 'Click to join the team video meeting now',
              icon: data.from.avatarUrl,
              requireInteraction: false,
            });
          } catch { /* silent */ }
        }
        return;
      }

      if (callStatusRef.current !== 'idle') {
        socket.emit('decline_call', { toUserId: data.from.id });
        return;
      }
      setIncomingCall(data);
      setCallPeer(data.from);
      setCallType(data.isVideo ? 'video' : 'audio');
      setCallStatus('incoming');
      startIncomingRingtone();


      // Trigger Cross-App System-Level Desktop Notification (Visible in Windows Action Center & over Excel, Chrome, etc.)
      try {
        const callerName = data.from.name || 'Team member';
        const callKind = data.isVideo ? 'Video' : 'Voice';

        if (typeof window !== 'undefined' && 'Notification' in window) {
          const triggerNotif = () => {
            try {
              if (incomingCallNotifRef.current) {
                incomingCallNotifRef.current.close();
              }
              const notif = new Notification(`📞 Incoming ${callKind} Call: ${callerName}`, {
                body: `${callerName} is calling you. Click here to answer or view call immediately!`,
                icon: data.from.avatarUrl || '/icons/call-ringing.png',
                tag: 'teamflow-incoming-call',
                requireInteraction: true, // Remains visible on Windows/Mac screen until clicked
                silent: false,
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
              incomingCallNotifRef.current = notif;
            } catch (err) {
              console.warn('System notification launch error:', err);
            }
          };

          if (Notification.permission === 'granted') {
            triggerNotif();
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((perm) => {
              if (perm === 'granted') triggerNotif();
            });
          }
        }

        // Flashing Tab Title visible when user is in Excel, Word, or other browser tabs
        if (typeof document !== 'undefined') {
          if (!originalTitleRef.current) originalTitleRef.current = document.title;
          if (tabTitleIntervalRef.current) clearInterval(tabTitleIntervalRef.current);
          let titleToggle = false;
          tabTitleIntervalRef.current = setInterval(() => {
            titleToggle = !titleToggle;
            document.title = titleToggle
              ? `🔴 CALL FROM ${callerName.toUpperCase()}...`
              : `📞 Incoming ${callKind} Call!`;
          }, 700);
        }
      } catch (e) {
        console.warn('Error displaying incoming call notification:', e);
      }
    }

    async function handleCallAccepted(data: { signalData: any }) {
      stopRingTone();
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signalData));
          for (const cand of pendingCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
          }
          pendingCandidatesRef.current = [];
        } catch (e) {
          console.error('Failed to set remote description on call_accepted:', e);
        }
      }
      setCallStatus('connected');
      requestWakeLock();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    async function handleIceCandidate(data: { candidate: any }) {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Error adding ice candidate:', e);
        }
      } else {
        pendingCandidatesRef.current.push(data.candidate);
      }
    }

    function handleCallEnded() {
      cleanupCall(false);
      setCallNotificationMsg('Call ended');
      setTimeout(() => setCallNotificationMsg(null), 3000);
    }

    function handleCallDeclined() {
      stopRingTone();
      cleanupCall(false);
      setCallNotificationMsg('User is busy or declined the call');
      setTimeout(() => setCallNotificationMsg(null), 3000);
    }

    function handlePeerVideoToggled(data: { videoEnabled: boolean }) {
      setIsPeerVideoEnabled(data.videoEnabled);
      setHasRemoteVideo(data.videoEnabled);
      if (data.videoEnabled) {
        setCallType('video');
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch(() => {});
        }
      } else if (!isPeerScreenSharing) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      }
    }

    async function handleCallRenegotiate(data: { signalData: any }) {
      if (!peerConnectionRef.current) return;
      try {
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));
        for (const cand of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
        }
        pendingCandidatesRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (callPeerRef.current?.id) {
          getSocket().emit('renegotiate_answer', {
            toUserId: callPeerRef.current.id,
            signalData: answer,
          });
        }
        setCallType('video');
        setHasRemoteVideo(true);

        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.warn('Call renegotiation failed:', e);
      }
    }

    async function handleCallRenegotiated(data: { signalData: any }) {
      if (!peerConnectionRef.current) return;
      try {
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));
        for (const cand of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
        }
        pendingCandidatesRef.current = [];
        if (remoteVideoRef.current && remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.warn('Setting remote description on renegotiated failed:', e);
      }
    }

    function handlePeerRecordingState(data: { isRecording: boolean; recordedByName?: string }) {
      setIsPeerRecording(data.isRecording);
      if (data.isRecording) {
        setCallNotificationMsg(`${data.recordedByName || 'Teammate'} started recording this call`);
        setTimeout(() => setCallNotificationMsg(null), 5000);
      } else {
        setCallNotificationMsg('Recording stopped');
        setTimeout(() => setCallNotificationMsg(null), 3000);
      }
    }

    function handlePeerScreenToggled(data: { isScreenSharing: boolean }) {
      setIsPeerScreenSharing(data.isScreenSharing);
      if (data.isScreenSharing) {
        setScreenFitMode('contain');
        setCallNotificationMsg(`${callPeerRef.current?.name || 'Teammate'} is sharing screen`);
        setTimeout(() => setCallNotificationMsg(null), 4000);
      } else {
        setCallNotificationMsg(`${callPeerRef.current?.name || 'Teammate'} stopped sharing screen`);
        setTimeout(() => setCallNotificationMsg(null), 3000);
        if (!isPeerVideoEnabled) {
          setHasRemoteVideo(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        }
      }
    }

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_declined', handleCallDeclined);
    socket.on('peer_video_toggled', handlePeerVideoToggled);
    socket.on('call_renegotiate', handleCallRenegotiate);
    socket.on('call_renegotiated', handleCallRenegotiated);
    socket.on('peer_recording_state', handlePeerRecordingState);
    socket.on('peer_screen_toggled', handlePeerScreenToggled);

    return () => {
      socket.emit('leave_user', { userId: user.id });
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_declined', handleCallDeclined);
      socket.off('peer_video_toggled', handlePeerVideoToggled);
      socket.off('call_renegotiate', handleCallRenegotiate);
      socket.off('call_renegotiated', handleCallRenegotiated);
      socket.off('peer_recording_state', handlePeerRecordingState);
      socket.off('peer_screen_toggled', handlePeerScreenToggled);
    };
  }, [user?.id]);

  // Load Notifications & Unread Count
  useEffect(() => {
    if (!workspaceId || !token || !user) return;

    async function loadNotifications() {
      try {
        const [notifRes, countRes] = await Promise.all([
          fetch(`${API_URL}/workspaces/${workspaceId}/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/workspaces/${workspaceId}/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
        }
        if (countRes.ok) {
          const { count } = await countRes.json();
          setUnreadNotificationCount(count);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }

    loadNotifications();
  }, [workspaceId, token, user]);

  // Global Notification, Pin & Unread Activity Socket Listener
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();

    socket.emit('join_user', { userId: user.id });
    if (workspaceId) {
      socket.emit('join_workspace', { workspaceId });
    }

    function handleNewNotification(notif: Notification) {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadNotificationCount((prev) => prev + 1);
      playNotificationChime();
    }

    function handleMessagePinned(data: { messageId: string; isPinned: boolean; message: Message }) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                isPinned: data.isPinned,
                pinnedBy: data.message.pinnedBy,
                pinnedAt: data.message.pinnedAt,
              }
            : m,
        ),
      );
      setPinnedMessages((prev) => {
        if (data.isPinned) {
          if (prev.some((m) => m.id === data.messageId)) return prev;
          return [data.message, ...prev];
        } else {
          return prev.filter((m) => m.id !== data.messageId);
        }
      });
    }

    function handleDirectMessagePinned(data: {
      messageId: string;
      isPinned: boolean;
      message: DirectMessage;
    }) {
      setDirectMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                isPinned: data.isPinned,
                pinnedBy: data.message.pinnedBy,
                pinnedAt: data.message.pinnedAt,
              }
            : m,
        ),
      );
      setPinnedMessages((prev) => {
        if (data.isPinned) {
          if (prev.some((m) => m.id === data.messageId)) return prev;
          return [data.message, ...prev];
        } else {
          return prev.filter((m) => m.id !== data.messageId);
        }
      });
    }

    function handleWorkspaceChannelMessage(data: any) {
      const channelId = data?.channelId || data?.channel?.id;
      const msg = data?.message || data;
      if (!channelId || !msg) return;

      // Ignore messages sent by current user
      if (msg.userId === user?.id) return;

      // If user is currently looking at this channel (and not viewing a DM), ignore
      if (activeChannelRef.current?.id === channelId && !activeRecipientRef.current) {
        return;
      }

      setUnreadChannels((prev) => ({
        ...prev,
        [channelId]: (prev[channelId] || 0) + 1,
      }));

      playNotificationChime();

      // Show floating notification banner for the incoming message
      const matchingChannel = channelsRef.current.find((c) => c.id === channelId);
      if (matchingChannel) {
        if (messageToastTimerRef.current) clearTimeout(messageToastTimerRef.current);
        setMessageToast({
          id: msg.id || Date.now().toString(),
          type: 'channel',
          chatTitle: `#${matchingChannel.name}`,
          senderName: msg.user?.name || 'Teammate',
          senderAvatar: msg.user?.avatarUrl,
          content: msg.content || (msg.attachments?.length ? 'Sent an attachment' : 'Sent a message'),
          channel: matchingChannel,
        });
        messageToastTimerRef.current = setTimeout(() => {
          setMessageToast(null);
        }, 4500);
      }
    }

    function handleGlobalDirectMessage(msg: DirectMessage) {
      if (!msg || !msg.userId) return;
      // Ignore messages sent by current user
      if (msg.userId === user?.id) return;

      // If user is currently in direct message chat with this sender:
      if (activeRecipientRef.current?.id === msg.userId) {
        setDirectMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        return;
      }

      setUnreadDirectMessages((prev) => ({
        ...prev,
        [msg.userId]: (prev[msg.userId] || 0) + 1,
      }));

      playNotificationChime();

      // Show floating notification banner for the incoming DM
      const senderMember = membersRef.current.find((m) => m.user.id === msg.userId);
      const senderUser = senderMember?.user || msg.user;
      if (senderUser) {
        if (messageToastTimerRef.current) clearTimeout(messageToastTimerRef.current);
        setMessageToast({
          id: msg.id || Date.now().toString(),
          type: 'dm',
          chatTitle: senderUser.name,
          senderName: senderUser.name,
          senderAvatar: senderUser.avatarUrl,
          content: msg.content || (msg.attachments?.length ? 'Sent an attachment' : 'Sent a direct message'),
          senderUser: senderUser,
        });
        messageToastTimerRef.current = setTimeout(() => {
          setMessageToast(null);
        }, 4500);
      }
    }

    function handleEmailHandledUpdated(data: {
      messageId: string;
      accountId: string;
      isHandled: boolean;
      handledById: string | null;
      handledByName: string | null;
      handledAt: string | null;
    }) {
      setMailMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                isHandled: data.isHandled,
                handledById: data.handledById,
                handledByName: data.handledByName,
                handledAt: data.handledAt,
              }
            : m,
        ),
      );
      if (selectedEmailRef.current?.id === data.messageId) {
        setSelectedEmail((prev) =>
          prev
            ? {
                ...prev,
                isHandled: data.isHandled,
                handledById: data.handledById,
                handledByName: data.handledByName,
                handledAt: data.handledAt,
              }
            : null,
        );
      }
      setMailAccounts((prev) =>
        prev.map((a) => {
          if (a.id === data.accountId) {
            const delta = data.isHandled ? -1 : 1;
            return {
              ...a,
              unhandledCount: Math.max(0, (a.unhandledCount || 0) + delta),
              handledCount: Math.max(0, (a.handledCount || 0) - delta),
            };
          }
          return a;
        }),
      );
    }

    function handleEmailReadUpdated(data: {
      messageId: string;
      accountId: string;
      isRead: boolean;
    }) {
      setMailMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, isRead: data.isRead } : m)),
      );
      if (selectedEmailRef.current?.id === data.messageId) {
        setSelectedEmail((prev) => (prev ? { ...prev, isRead: data.isRead } : null));
      }
      setMailAccounts((prev) =>
        prev.map((a) => {
          if (a.id === data.accountId) {
            const delta = data.isRead ? -1 : 1;
            const newCount = Math.max(0, (a.unreadCount || 0) + delta);
            return { ...a, unreadCount: newCount, inboxUnreadCount: newCount };
          }
          return a;
        }),
      );
    }

    function handleNewGroupEmail(data: {
      messageId: string;
      accountId: string;
      channelId?: string;
      channelName?: string;
      subject: string;
      fromName?: string;
      fromAddress: string;
    }) {
      playNotificationChime();

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`📩 Group Email in #${data.channelName || 'group'}`, {
            body: `${data.fromName || data.fromAddress}: ${data.subject}`,
            icon: '/favicon.ico',
          });
        } catch (nErr) {
          console.warn('Desktop notification failed:', nErr);
        }
      }

      setCallNotificationMsg(`📩 New Email in #${data.channelName || 'group'}: ${data.subject}`);
      setTimeout(() => setCallNotificationMsg(null), 5000);

      loadMailAccounts();
      if (selectedMailAccountId === data.accountId) {
        loadMailMessages(data.accountId, mailFolder, mailSearchQuery);
      }
    }

    // Auto-request desktop notification permission on desktop/laptop
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    socket.on('new_notification', handleNewNotification);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('direct_message_pinned', handleDirectMessagePinned);
    socket.on('workspace_channel_message', handleWorkspaceChannelMessage);
    socket.on('new_direct_message', handleGlobalDirectMessage);
    socket.on('email_handled_updated', handleEmailHandledUpdated);
    socket.on('email_read_updated', handleEmailReadUpdated);
    socket.on('new_group_email', handleNewGroupEmail);

    return () => {
      if (workspaceId) {
        socket.emit('leave_workspace', { workspaceId });
      }
      socket.emit('leave_user', { userId: user.id });
      socket.off('new_notification', handleNewNotification);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('direct_message_pinned', handleDirectMessagePinned);
      socket.off('workspace_channel_message', handleWorkspaceChannelMessage);
      socket.off('new_direct_message', handleGlobalDirectMessage);
      socket.off('email_handled_updated', handleEmailHandledUpdated);
      socket.off('email_read_updated', handleEmailReadUpdated);
      socket.off('new_group_email', handleNewGroupEmail);
    };
  }, [workspaceId, user?.id, soundEnabled, selectedMailAccountId, mailFolder, mailSearchQuery]);

  // Notifications Actions
  async function handleMarkNotificationAsRead(id: string) {
    if (!token) return;
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    if (!token || !workspaceId) return;
    try {
      await fetch(`${API_URL}/workspaces/${workspaceId}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }

  // Pin / Unpin Actions
  async function handleTogglePinMessage(messageId: string, isDM: boolean) {
    if (!token) return;
    try {
      const endpoint = isDM
        ? `${API_URL}/conversations/${activeConversation?.id}/messages/${messageId}/pin`
        : `${API_URL}/channels/${activeChannel?.id}/messages/${messageId}/pin`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (isDM) {
          setDirectMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isPinned: data.isPinned,
                    pinnedBy: data.message?.pinnedBy,
                    pinnedAt: data.message?.pinnedAt,
                  }
                : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isPinned: data.isPinned,
                    pinnedBy: data.message?.pinnedBy,
                    pinnedAt: data.message?.pinnedAt,
                  }
                : m,
            ),
          );
        }
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  async function handleLoadPinnedMessages() {
    if (!token) return;
    setLoadingPinned(true);
    setShowPinnedDrawer(true);
    try {
      const endpoint = activeRecipient
        ? `${API_URL}/conversations/${activeConversation?.id}/pins`
        : `${API_URL}/channels/${activeChannel?.id}/pins`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPinnedMessages(data);
      }
    } catch (err) {
      console.error('Failed to load pinned messages:', err);
    } finally {
      setLoadingPinned(false);
    }
  }

  // Module 9: Update Channel / Thread Message
  async function handleUpdateMessage(messageId: string, newContent: string) {
    if (!token || !newContent.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newContent.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...updated, isEdited: true } : m)),
        );
        setActiveThreadParent((parent) =>
          parent && parent.id === messageId ? { ...parent, ...updated, isEdited: true } : parent,
        );
        setThreadReplies((replies) =>
          replies.map((r) => (r.id === messageId ? { ...r, ...updated, isEdited: true } : r)),
        );
        setEditingMessageId(null);
        setEditingContent('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to update message');
      }
    } catch (err) {
      console.error('Failed to update message:', err);
    } finally {
      setIsSavingEdit(false);
    }
  }

  // Module 9: Delete Channel / Thread Message
  async function handleDeleteMessage(messageId: string) {
    if (!token) return;
    const confirmed = window.confirm('Are you sure you want to delete this message? This cannot be undone.');
    if (!confirmed) return;

    setDeletingMessageId(messageId);
    try {
      const res = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({ messageId }));
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        setActiveThreadParent((parent) => (parent && parent.id === messageId ? null : parent));
        setThreadReplies((replies) => replies.filter((r) => r.id !== messageId));
        if (data.parentId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.parentId
                ? {
                    ...m,
                    _count: {
                      ...m._count,
                      replies: Math.max(0, (m._count?.replies || 1) - 1),
                    },
                  }
                : m,
            ),
          );
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setDeletingMessageId(null);
    }
  }

  // Module 9: Update Direct Message
  async function handleUpdateDirectMessage(messageId: string, newContent: string) {
    if (!token || !newContent.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/direct-messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newContent.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setDirectMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...updated, isEdited: true } : m)),
        );
        setEditingMessageId(null);
        setEditingContent('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to update message');
      }
    } catch (err) {
      console.error('Failed to update direct message:', err);
    } finally {
      setIsSavingEdit(false);
    }
  }

  // Module 9: Delete Direct Message
  async function handleDeleteDirectMessage(messageId: string) {
    if (!token) return;
    const confirmed = window.confirm('Are you sure you want to delete this message? This cannot be undone.');
    if (!confirmed) return;

    setDeletingMessageId(messageId);
    try {
      const res = await fetch(`${API_URL}/direct-messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDirectMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Failed to delete direct message:', err);
    } finally {
      setDeletingMessageId(null);
    }
  }

  function handleJumpToMessage(
    messageId: string,
    targetChannelId?: string | null,
    targetConversationId?: string | null,
  ) {
    if (targetChannelId && activeChannel?.id !== targetChannelId) {
      const targetCh = channels.find((c) => c.id === targetChannelId);
      if (targetCh) {
        setActiveChannel(targetCh);
        setActiveRecipient(null);
        setActiveConversation(null);
      }
    } else if (targetConversationId && activeConversation?.id !== targetConversationId) {
      // Find other member in this conversation
      const otherMember = members.find((m) => m.user.id !== user?.id);
      if (otherMember) {
        handleSelectDirectMessage(otherMember.user);
      }
    }

    setShowPinnedDrawer(false);
    setShowSearchModal(false);
    setShowNotificationDrawer(false);

    // Scroll and flash highlight
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      }
    }, 300);
  }

  // Workspace Full-Text Search Handler with live fetch
  useEffect(() => {
    if (!showSearchModal || !workspaceId || !token) return;
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/workspaces/${workspaceId}/search?q=${encodeURIComponent(
            searchQuery,
          )}&filter=${searchFilter}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data: SearchResult = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Failed to search workspace:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFilter, showSearchModal, workspaceId, token]);

  // 3. Auto-scroll effects (Always scroll to latest messages on message updates, channel switch, or tab switch from mail)
  useEffect(() => {
    if (activeAppTab === 'chat' && !isMailViewActive && !showCalendarView) {
      const scrollDown = () => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          const parent = messagesEndRef.current.parentElement;
          if (parent) {
            parent.scrollTop = parent.scrollHeight;
          }
        }
      };
      scrollDown();
      const t1 = setTimeout(scrollDown, 50);
      const t2 = setTimeout(scrollDown, 150);
      const t3 = setTimeout(scrollDown, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [messages, directMessages, activeAppTab, isMailViewActive, showCalendarView, activeChannel?.id, activeRecipient?.id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadReplies]);

  // Invite Teammate Action Handler
  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !token || !workspaceId) return;

    setInviteLoading(true);
    setInviteSuccessMessage(null);
    setInviteErrorMessage(null);

    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteSuccessMessage(data.message || 'Teammate successfully added!');
        if (data.member) {
          setMembers((prev) => {
            if (prev.some((m) => m.id === data.member.id)) return prev;
            return [...prev, data.member];
          });
        }
        setInviteEmail('');
      } else {
        setInviteErrorMessage(
          data.message || 'Could not add user. Share the invite link or code with them.',
        );
      }
    } catch (err: any) {
      setInviteErrorMessage('Failed to connect to the server.');
    } finally {
      setInviteLoading(false);
    }
  }

  // Remove/Kick Member Action Handler
  async function handleConfirmRemoveMember() {
    if (!memberToRemove || !token || !workspaceId) return;

    setRemoveMemberLoading(true);
    setRemoveMemberError(null);

    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${memberToRemove.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));

        if (activeRecipient?.id === memberToRemove.user?.id) {
          setActiveRecipient(null);
          setActiveConversation(null);
          if (channels.length > 0) {
            setActiveChannel(channels[0]);
          }
        }

        setMemberToRemove(null);
      } else {
        setRemoveMemberError(data.message || 'Failed to remove member from workspace');
      }
    } catch (err: any) {
      setRemoveMemberError('Failed to connect to the server');
    } finally {
      setRemoveMemberLoading(false);
    }
  }

  // Module 5 Handlers: Direct Messages & Presence
  async function handleSelectDirectMessage(targetUser: ConversationParticipant) {
    if (!token || !user) return;
    setShowMobileSidebar(false);
    setShowCalendarView(false);
    setActiveChannel(null);
    setActiveThreadParent(null);
    setActiveRecipient(targetUser);
    setDmLoading(true);

    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId: targetUser.id }),
      });

      if (res.ok) {
        const convo: Conversation = await res.json();
        setActiveConversation(convo);
        const otherUser = convo.userOne?.id === user.id ? convo.userTwo : convo.userOne;
        if (otherUser) {
          setActiveRecipient(otherUser);
        }

        const msgRes = await fetch(`${API_URL}/conversations/${convo.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (msgRes.ok) {
          const msgs: DirectMessage[] = await msgRes.json();
          setDirectMessages(msgs);
        }
      }
    } catch (err) {
      console.error('Failed to open direct conversation:', err);
    } finally {
      setDmLoading(false);
    }
  }

  async function handleSendDirectMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (
      (!inputText.trim() && pendingDMAttachments.length === 0) ||
      !activeConversation ||
      !token ||
      !user
    )
      return;

    const content = inputText.trim();
    const attachmentsToSend =
      pendingDMAttachments.length > 0
        ? pendingDMAttachments.map((att) => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl || (att as any).url,
            fileType: att.fileType,
            fileSize: att.fileSize,
          }))
        : undefined;

    setIsSending(true);

    try {
      const res = await fetch(`${API_URL}/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          attachments: attachmentsToSend,
        }),
      });

      if (res.ok) {
        const saved: DirectMessage = await res.json();
        setDirectMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
        setInputText('');
        setPendingDMAttachments([]);
        setMentionType(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to send direct message. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send direct message:', err);
      alert('Network error while sending direct message.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleToggleDirectReaction(directMessageId: string, emoji: string) {
    if (!token || !user) return;

    try {
      const res = await fetch(`${API_URL}/conversations/messages/${directMessageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setDirectMessages((prev) =>
          prev.map((m) => (m.id === directMessageId ? { ...m, reactions: data.reactions } : m)),
        );
      }
    } catch (err) {
      console.error('Failed to toggle direct reaction:', err);
    }
  }

  // File Upload Helpers (Supports any file type and multi-GB file uploads)
  function formatFileSize(bytes?: number) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function uploadFile(file: File): Promise<Attachment | null> {
    return new Promise((resolve) => {
      if (!token) {
        resolve(null);
        return;
      }

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      const startTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          let speedStr = '';
          if (elapsed > 0.5) {
            const bytesPerSec = event.loaded / elapsed;
            speedStr = `${formatFileSize(bytesPerSec)}/s`;
          }

          setUploadProgress({
            fileName: file.name,
            percent,
            uploadedBytes: event.loaded,
            totalBytes: event.total,
            speed: speedStr,
          });
        }
      };

      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const normalized: Attachment = {
              id: data.id,
              fileName: data.fileName,
              fileUrl: data.fileUrl || data.url,
              fileType: data.fileType,
              fileSize: data.fileSize,
            };
            resolve(normalized);
          } catch (e) {
            console.error('Error parsing upload response:', e);
            resolve(null);
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            alert(err.message || 'File upload failed');
          } catch {
            alert(`File upload failed with status ${xhr.status}`);
          }
          resolve(null);
        }
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        alert('File transfer failed due to a network connection error.');
        resolve(null);
      };

      xhr.onabort = () => {
        setUploadProgress(null);
        resolve(null);
      };

      xhr.open('POST', `${API_URL}/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  async function handleChannelFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const uploaded = await uploadFile(files[i]);
      if (uploaded) {
        setPendingAttachments((prev) => [...prev, uploaded]);
      }
    }
    setIsUploading(false);
  }

  async function handleDMFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploadingDM(true);
    for (let i = 0; i < files.length; i++) {
      const uploaded = await uploadFile(files[i]);
      if (uploaded) {
        setPendingDMAttachments((prev) => [...prev, uploaded]);
      }
    }
    setIsUploadingDM(false);
  }

  async function handleThreadFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploadingThread(true);
    for (let i = 0; i < files.length; i++) {
      const uploaded = await uploadFile(files[i]);
      if (uploaded) {
        setPendingThreadAttachments((prev) => [...prev, uploaded]);
      }
    }
    setIsUploadingThread(false);
  }

  async function handleUpdatePresence(newPresence: PresenceStatus) {
    if (!token || !user) return;
    setUserPresence(newPresence);
    setShowPresenceMenu(false);

    try {
      getSocket().emit('set_presence', { userId: user.id, presence: newPresence });
      await fetch(`${API_URL}/users/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ presence: newPresence }),
      });
    } catch (err) {
      console.error('Failed to update presence:', err);
    }
  }

  async function handleAvatarFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setProfileErrorMsg(null);

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const fullUrl = data.fileUrl.startsWith('http')
          ? data.fileUrl
          : `${API_URL.replace(/\/api\/?$/, '')}${data.fileUrl}`;
        setEditAvatarUrl(fullUrl);
      }
    } catch (err) {
      console.warn('Backend upload failed, local preview retained:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      await updateProfile({
        name: editName.trim(),
        avatarUrl: editAvatarUrl || undefined,
      });
      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setShowEditProfileModal(false);
        setProfileSuccessMsg(null);
      }, 900);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  }

  // 4. Open Thread Drawer
  async function openThread(parentMessage: Message) {
    if (!token) return;
    setActiveThreadParent(parentMessage);
    setShowMembersDrawer(false);
    setThreadLoading(true);

    try {
      const res = await fetch(`${API_URL}/messages/${parentMessage.id}/thread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveThreadParent(data.parent);
        setThreadReplies(data.replies);
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
    } finally {
      setThreadLoading(false);
    }
  }

  // 5. Send Thread Reply
  async function handleSendThreadReply(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (
      (!threadInputText.trim() && pendingThreadAttachments.length === 0) ||
      !activeThreadParent ||
      !activeChannel ||
      !token
    )
      return;

    const content = threadInputText.trim();
    const attachmentsToSend =
      pendingThreadAttachments.length > 0
        ? pendingThreadAttachments.map((att) => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl || (att as any).url,
            fileType: att.fileType,
            fileSize: att.fileSize,
          }))
        : undefined;

    setIsSendingThreadReply(true);

    const socket = getSocket();

    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          parentId: activeThreadParent.id,
          attachments: attachmentsToSend,
        }),
      });

      if (res.ok) {
        const replyMsg: Message = await res.json();
        setThreadReplies((prev) => {
          if (prev.some((r) => r.id === replyMsg.id)) return prev;
          return [...prev, replyMsg];
        });
        setThreadInputText('');
        setPendingThreadAttachments([]);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to send thread reply. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send thread reply:', err);
      alert('Network error while sending thread reply.');
    } finally {
      setIsSendingThreadReply(false);
    }
  }

  // 6. Toggle Emoji Reaction
  async function handleToggleReaction(messageId: string, emoji: string) {
    if (!token || !user) return;

    try {
      const res = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m)),
        );
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  }

  // Send main message handler
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (
      (!inputText.trim() && pendingAttachments.length === 0) ||
      !activeChannel ||
      !token ||
      !user
    )
      return;

    const content = inputText.trim();
    const attachmentsToSend =
      pendingAttachments.length > 0
        ? pendingAttachments.map((att) => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl || (att as any).url,
            fileType: att.fileType,
            fileSize: att.fileSize,
          }))
        : undefined;

    setIsSending(true);

    const socket = getSocket();
    socket.emit('typing', { channelId: activeChannel.id, userName: user.name, isTyping: false });

    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          attachments: attachmentsToSend,
        }),
      });

      if (res.ok) {
        const savedMsg: Message = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === savedMsg.id)) return prev;
          return [...prev, savedMsg];
        });
        setInputText('');
        setPendingAttachments([]);
        setMentionType(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Network error while sending message.');
    } finally {
      setIsSending(false);
    }
  }

  // Typing debounce & Mention Detection
  function handleInputChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    target: 'channel' | 'dm' = 'channel',
  ) {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBefore = val.slice(0, cursorPos);
    const lastAt = textBefore.lastIndexOf('@');
    const lastHash = textBefore.lastIndexOf('#');

    if (lastAt !== -1 && lastAt >= textBefore.lastIndexOf(' ')) {
      const q = textBefore.slice(lastAt + 1);
      setMentionType('user');
      setMentionQuery(q);
      setMentionTarget(target);
    } else if (lastHash !== -1 && lastHash >= textBefore.lastIndexOf(' ')) {
      const q = textBefore.slice(lastHash + 1);
      setMentionType('channel');
      setMentionQuery(q);
      setMentionTarget(target);
    } else {
      setMentionType(null);
      setMentionQuery('');
    }

    if (target === 'channel' && activeChannel && user) {
      const socket = getSocket();
      socket.emit('typing', { channelId: activeChannel.id, userName: user.name, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { channelId: activeChannel.id, userName: user.name, isTyping: false });
      }, 1800);
    }
  }

  function handleInsertMention(textToInsert: string) {
    if (!mentionType) return;
    const prefix = mentionType === 'user' ? '@' : '#';
    const lastTrigger = inputText.lastIndexOf(prefix);
    if (lastTrigger !== -1) {
      const before = inputText.slice(0, lastTrigger);
      const after = inputText.slice(lastTrigger + 1 + mentionQuery.length);
      setInputText(`${before}${prefix}${textToInsert} ${after}`);
    } else {
      setInputText((prev) => `${prev} ${prefix}${textToInsert} `);
    }
    setMentionType(null);
    setMentionQuery('');
  }

  function handleSwitchChannelByName(channelName: string) {
    const target = channels.find((c) => c.name.toLowerCase() === channelName.toLowerCase());
    if (target) {
      setActiveChannel(target);
      setActiveConversation(null);
      setActiveRecipient(null);
      setActiveThreadParent(null);
    }
  }

  // Create Channel
  async function handleCreateChannel(e?: React.FormEvent, forceGoogleOAuth = false) {
    if (e) e.preventDefault();
    if (!newChannelName.trim() || !token) return;

    setChannelCreating(true);
    setChannelError(null);

    try {
      const formattedName = newChannelName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '');

      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formattedName,
          topic: newChannelTopic.trim() || undefined,
          isPrivate: newChannelIsPrivate,
          memberIds: newChannelSelectedMembers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create channel');
      }

      setChannels((prev) => [...prev, data]);
      setActiveChannel(data);
      if (data.members) {
        setActiveChannelMembers(data.members);
      }

      const shouldConnectGoogle =
        canManageGroupMail && newChannelEnableMail && (newChannelMailProvider === 'GOOGLE' || forceGoogleOAuth);
      const shouldConnectManual =
        canManageGroupMail &&
        newChannelEnableMail &&
        newChannelMailProvider === 'CUSTOM' &&
        newChannelGroupEmail.trim() &&
        !forceGoogleOAuth;

      const createdChannelId = data.id;
      setShowCreateChannelModal(false);
      setNewChannelName('');
      setNewChannelTopic('');
      setNewChannelIsPrivate(false);
      setNewChannelSelectedMembers([]);
      setNewChannelEnableMail(false);
      setNewChannelGroupEmail('');
      setNewChannelMailProvider('GOOGLE');

      // Automatically link and sync shared mailbox for this channel
      if (shouldConnectGoogle) {
        setConnectMailMode('group');
        setConnectMailChannelId(createdChannelId);
        await handleConnectEmail('GOOGLE', undefined, createdChannelId);
      } else if (shouldConnectManual) {
        try {
          await fetch(`${API_URL}/mail/accounts/connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              emailAddress: newChannelGroupEmail.trim().toLowerCase(),
              provider: 'CUSTOM',
              workspaceId,
              channelId: createdChannelId,
              isShared: true,
              displayName: `#${formattedName} Group Inbox`,
            }),
          });
          loadMailAccounts();
        } catch (mErr) {
          console.warn('Failed to link group email on channel creation:', mErr);
        }
      }
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Error creating channel');
    } finally {
      setChannelCreating(false);
    }
  }

  // Add members to active channel
  async function handleAddMembersToChannel() {
    if (!activeChannel || !token || selectedAddUserIds.length === 0) return;
    setIsAddingChannelMember(true);
    try {
      for (const targetUserId of selectedAddUserIds) {
        await fetch(`${API_URL}/channels/${activeChannel.id}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: targetUserId }),
        });
      }
      // Reload channel members
      const res = await fetch(`${API_URL}/channels/${activeChannel.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveChannelMembers(data);
        setChannels((prev) =>
          prev.map((c) =>
            c.id === activeChannel.id
              ? {
                  ...c,
                  members: data,
                  _count: {
                    ...c._count,
                    messages: c._count?.messages || 0,
                    members: data.length,
                  },
                }
              : c
          )
        );
      }
      setShowAddChannelMemberModal(false);
      setSelectedAddUserIds([]);
      setAddMemberSearchQuery('');
    } catch (err) {
      console.error('Failed to add members to channel:', err);
    } finally {
      setIsAddingChannelMember(false);
    }
  }

  // Remove member from active channel
  async function handleRemoveChannelMember(targetUserId: string) {
    if (!activeChannel || !token) return;
    try {
      const res = await fetch(`${API_URL}/channels/${activeChannel.id}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveChannelMembers((prev) => prev.filter((m) => m.user.id !== targetUserId));
        setChannels((prev) =>
          prev.map((c) =>
            c.id === activeChannel.id
              ? {
                  ...c,
                  members: c.members?.filter((m) => m.user.id !== targetUserId),
                  _count: {
                    ...c._count,
                    messages: c._count?.messages || 0,
                    members: Math.max(0, (c._count?.members || 1) - 1),
                  },
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Failed to remove member from channel:', err);
    }
  }

  function copyInviteCode() {
    if (!currentWs) return;
    navigator.clipboard.writeText(currentWs.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function copyInviteLink() {
    if (typeof window === 'undefined' || !currentWs) return;
    const origin = window.location.origin;
    const inviteUrl = `${origin}/workspaces?join=${currentWs.joinCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2500);
  }

  function openEditChannelModal(ch: Channel) {
    setChannelToEdit(ch);
    setEditChannelName(ch.name);
    setEditChannelTopic(ch.topic || '');
    setEditChannelIsPrivate(ch.isPrivate || false);
    const linked = mailAccounts.find((a) => a.channelId === ch.id);
    setEditChannelGroupEmail(linked?.emailAddress || '');
    setEditChannelError(null);
    setShowEditChannelModal(true);
  }

  async function handleUpdateChannel(e: React.FormEvent) {
    e.preventDefault();
    const target = channelToEdit || activeChannel;
    if (!target || !token) return;
    setEditChannelLoading(true);
    setEditChannelError(null);
    try {
      const res = await fetch(`${API_URL}/channels/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editChannelName.trim(),
          topic: editChannelTopic.trim(),
          isPrivate: editChannelIsPrivate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChannels((prev) =>
          prev.map((c) => (c.id === target.id ? { ...c, ...data } : c))
        );
        if (activeChannel?.id === target.id) {
          setActiveChannel((prev) => (prev ? { ...prev, ...data } : null));
        }

        // Link or update group mailbox if changed (Admins & Owners only)
        if (canManageGroupMail && editChannelGroupEmail.trim()) {
          const linked = mailAccounts.find((a) => a.channelId === target.id);
          if (!linked || linked.emailAddress.toLowerCase() !== editChannelGroupEmail.trim().toLowerCase()) {
            try {
              await fetch(`${API_URL}/mail/accounts/connect`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  emailAddress: editChannelGroupEmail.trim().toLowerCase(),
                  provider: 'CUSTOM',
                  workspaceId,
                  channelId: target.id,
                  isShared: true,
                  displayName: `#${editChannelName.trim()} Group Inbox`,
                }),
              });
              loadMailAccounts();
            } catch (mErr) {
              console.warn('Failed to update group email on channel update:', mErr);
            }
          }
        }

        setShowEditChannelModal(false);
        setChannelToEdit(null);
      } else {
        setEditChannelError(data.message || 'Could not update channel');
      }
    } catch (e) {
      setEditChannelError('Failed to connect to server');
    } finally {
      setEditChannelLoading(false);
    }
  }

  async function handleDeleteChannel(channelId: string) {
    if (!token) return;
    setDeleteChannelLoading(true);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
        if (activeChannel?.id === channelId) {
          const remaining = channels.filter((c) => c.id !== channelId);
          setActiveChannel(remaining.length > 0 ? remaining[0] : null);
        }
        setChannelToDelete(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Could not delete channel');
      }
    } catch (e) {
      alert('Failed to delete channel');
    } finally {
      setDeleteChannelLoading(false);
    }
  }

  async function handleUpdateMemberRole(memberId: string, newRole: WorkspaceRole) {
    if (!token || !workspaceId) return;
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        alert(data.message || 'Could not update role');
      }
    } catch (e) {
      alert('Failed to update member role');
    }
  }

  // Format message text with @mentions, #channels, inline code, and code blocks
  function renderMessageContent(content: string) {
    if (!content) return null;

    // Check if message contains code blocks (```...```)
    if (content.includes('```')) {
      const parts = content.split(/(```[\s\S]*?```)/g);
      return (
        <div className="space-y-1">
          {parts.map((part, pIdx) => {
            if (part.startsWith('```') && part.endsWith('```')) {
              return <CodeBlockView key={pIdx} content={part} />;
            }
            if (!part.trim()) return null;
            return (
              <div key={pIdx}>
                {renderFormattedParagraph(part)}
              </div>
            );
          })}
        </div>
      );
    }

    return renderFormattedParagraph(content);
  }

  function renderFormattedParagraph(text: string) {
    if (!text) return null;

    // Collect all unique member names sorted by length descending so longer multi-word names match first
    const memberNames = Array.from(
      new Set(
        members
          .map((m) => m.user?.name?.trim())
          .filter((n): n is string => Boolean(n && n.length > 0))
      )
    ).sort((a, b) => b.length - a.length);

    // Escape regex special chars in names
    const escapedNames = memberNames
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    // Build regex to split text while capturing full name mentions, single-word mentions, channels, and inline code
    const mentionRegex = escapedNames
      ? new RegExp(`(@(?:${escapedNames})|#[a-zA-Z0-9_-]+|\`[^\`]+\`|@[a-zA-Z0-9_.-]+)`, 'gi')
      : /(@[a-zA-Z0-9_.-]+|#[a-zA-Z0-9_-]+|`[^`]+`)/gi;

    const parts = text.split(mentionRegex);

    return (
      <p className="text-[14px] leading-relaxed text-slate-800 whitespace-pre-wrap font-normal selection:bg-indigo-500 selection:text-white">
        {parts.map((part, i) => {
          if (!part) return null;

          // Inline code check: `code`
          if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            const innerCode = part.slice(1, -1);
            return (
              <code
                key={i}
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-[12px] border border-slate-200/80 font-medium select-all"
              >
                {innerCode}
              </code>
            );
          }

          // Mention check: @name
          if (part.startsWith('@') && part.length > 1) {
            const rawName = part.slice(1);
            const currentUserName = user?.name?.toLowerCase().trim() || '';
            const rawNameLower = rawName.toLowerCase().trim();
            const isMe =
              Boolean(currentUserName) &&
              (currentUserName === rawNameLower ||
                currentUserName.includes(rawNameLower) ||
                rawNameLower.includes(currentUserName) ||
                (currentUserName.split(' ')[0] && currentUserName.split(' ')[0] === rawNameLower));

            return (
              <span
                key={i}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-xs transition-colors mx-0.5 ${
                  isMe
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100/70 font-semibold'
                }`}
              >
                @{rawName}
              </span>
            );
          }

          // Channel hashtag check: #channel
          if (part.startsWith('#') && part.length > 1) {
            const cleanChannel = part.slice(1);
            const channelExists = channels.some((c) => c.name.toLowerCase() === cleanChannel.toLowerCase());

            return (
              <button
                key={i}
                type="button"
                onClick={() => channelExists && handleSwitchChannelByName(cleanChannel)}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-xs transition-colors mx-0.5 ${
                  channelExists
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 cursor-pointer'
                    : 'text-indigo-600 font-medium'
                }`}
              >
                #{cleanChannel}
              </button>
            );
          }

          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  }

  // File Category Helper for Any Type of Shared Files
  function getFileCategory(fileType: string, fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (
      fileType.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
    ) {
      return 'image';
    }
    if (
      fileType.startsWith('video/') ||
      ['mp4', 'mov', 'mkv', 'webm', 'avi', 'wmv', 'flv'].includes(ext)
    ) {
      return 'video';
    }
    if (
      fileType.startsWith('audio/') ||
      ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)
    ) {
      return 'audio';
    }
    if (['pdf'].includes(ext) || fileType === 'application/pdf') {
      return 'pdf';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'dmg', 'tgz'].includes(ext)) {
      return 'archive';
    }
    if (
      [
        'js',
        'ts',
        'tsx',
        'jsx',
        'py',
        'json',
        'html',
        'css',
        'scss',
        'cpp',
        'c',
        'java',
        'go',
        'rs',
        'php',
        'sh',
        'sql',
        'yaml',
        'yml',
        'xml',
      ].includes(ext)
    ) {
      return 'code';
    }
    return 'generic';
  }

  // Render message file & media attachments (Any format & any size up to GBs)
  function renderAttachments(attachments?: Attachment[]) {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        {attachments.map((att, idx) => {
          const category = getFileCategory(att.fileType, att.fileName);
          const fullUrl = att.fileUrl.startsWith('http')
            ? att.fileUrl
            : `${API_URL.replace('/api', '')}${att.fileUrl}`;
          const downloadUrl = `${API_URL}/upload/download/${att.fileUrl.split('/').pop()}?name=${encodeURIComponent(
            att.fileName,
          )}`;

          if (category === 'image') {
            return (
              <div
                key={idx}
                onClick={() =>
                  setActiveLightboxImage({
                    url: fullUrl,
                    fileName: att.fileName,
                    fileSize: att.fileSize,
                  })
                }
                className="group/img relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 max-w-xs shadow-xs hover:shadow-md transition-all hover:scale-[1.01]"
              >
                <img
                  src={fullUrl}
                  alt={att.fileName}
                  className="max-h-56 w-auto object-cover rounded-2xl transition-transform group-hover/img:scale-105"
                />
                <div className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/30 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                  <div className="p-2 rounded-xl bg-white/90 backdrop-blur-sm text-slate-800 shadow-md flex items-center gap-1.5 text-xs font-semibold">
                    <Maximize2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Expand</span>
                  </div>
                </div>
              </div>
            );
          }

          if (category === 'video') {
            return (
              <VideoAttachmentCard
                key={idx}
                att={att}
                fullUrl={fullUrl}
                downloadUrl={downloadUrl}
                formatFileSize={formatFileSize}
              />
            );
          }

          if (category === 'audio') {
            return (
              <div
                key={idx}
                className="p-3 rounded-2xl border border-slate-200/90 bg-white max-w-sm shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Music className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate">{att.fileName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {formatFileSize(att.fileSize)}
                  </span>
                </div>
                <audio src={fullUrl} controls preload="metadata" className="w-full h-8" />
              </div>
            );
          }

          // Dynamic styling based on file category
          const styleConfig =
            category === 'pdf'
              ? {
                  badge: 'PDF',
                  badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
                  iconBox:
                    'bg-rose-50 border-rose-100 text-rose-600 group-hover/file:bg-rose-600',
                  Icon: FileText,
                }
              : category === 'archive'
              ? {
                  badge: att.fileName.split('.').pop()?.toUpperCase() || 'ARCHIVE',
                  badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
                  iconBox:
                    'bg-amber-50 border-amber-100 text-amber-600 group-hover/file:bg-amber-600',
                  Icon: Archive,
                }
              : category === 'code'
              ? {
                  badge: 'CODE',
                  badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  iconBox:
                    'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover/file:bg-emerald-600',
                  Icon: FileCode,
                }
              : {
                  badge: att.fileName.split('.').pop()?.toUpperCase() || 'FILE',
                  badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  iconBox:
                    'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover/file:bg-indigo-600',
                  Icon: File,
                };

          const CardIcon = styleConfig.Icon;

          return (
            <a
              key={idx}
              href={downloadUrl}
              download={att.fileName}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 transition-all shadow-xs hover:shadow-sm max-w-sm group/file"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${styleConfig.iconBox} group-hover/file:text-white`}
              >
                <CardIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover/file:text-indigo-600 transition-colors">
                    {att.fileName}
                  </p>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${styleConfig.badgeColor}`}
                  >
                    {styleConfig.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium font-mono">
                  {formatFileSize(att.fileSize)}
                </p>
              </div>
              <div className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0">
                <Download className="h-4 w-4" />
              </div>
            </a>
          );
        })}
      </div>
    );
  }

  const EMOJI_CATEGORIES = {
    popular: ['👍', '❤️', '🔥', '🚀', '🎉', '👀', '💯', '👏', '🎯', '✨'],
    smileys: ['😀', '😂', '😍', '🥳', '😎', '🤔', '🙌', '🤩', '😴', '🤯', '😇', '😋'],
    work: ['✅', '⭐', '💡', '📌', '💻', '☕', '⚡', '🏆', '🔒', '📊', '📝', '🤝'],
  };

  function formatTimestamp(dateString: string) {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function groupReactions(reactions?: Reaction[]) {
    if (!reactions || reactions.length === 0) return [];
    const map = new Map<string, { emoji: string; count: number; users: string[]; userHasReacted: boolean }>();

    for (const r of reactions) {
      const existing = map.get(r.emoji) || {
        emoji: r.emoji,
        count: 0,
        users: [],
        userHasReacted: false,
      };
      existing.count += 1;
      existing.users.push(r.user.name);
      if (r.userId === user?.id) {
        existing.userHasReacted = true;
      }
      map.set(r.emoji, existing);
    }

    return Array.from(map.values());
  }

  if (authLoading || loading || !currentWs || !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC] text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />
            <Loader2 className="h-6 w-6 animate-spin text-white absolute inset-0 m-auto" />
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-wide">Launching Patterns Workspace...</p>
        </div>
      </div>
    );
  }

  // Filtered lists for Command Palette
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(commandPaletteQuery.toLowerCase()),
  );
  const filteredMembers = members.filter((m) =>
    m.user.name.toLowerCase().includes(commandPaletteQuery.toLowerCase()),
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F4F5FA] text-slate-900 antialiased font-sans select-none relative">
      {/* Permanent, Always-Mounted Audio Output Element (never unmounts across call transitions) */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Mobile Backdrop Overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          GLOBAL TOP NAVIGATION (Chat ⇄ Mail Switcher & Brand Hub)
      ───────────────────────────────────────────────────────────── */}
      <header className="h-14 sm:h-16 w-full bg-white border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Left: Mobile Toggle, Brand & Workspace Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition-colors cursor-pointer"
            title="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/workspaces" className="flex items-center gap-2.5 group shrink-0" title="Return to Workspaces Dashboard">
            <img
              src="/patterns-icon.png?v=2"
              alt="Patterns Chat"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-2xs"
            />
            <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-tight text-slate-900">
              <span>Patterns</span>
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent font-black">Chat</span>
            </div>
          </Link>

        </div>

        {/* Center: PRIMARY MODULE SWITCHER (Chat ⇄ Mail) */}
        <div className="flex items-center mx-1 sm:mx-3">
          <nav aria-label="App Modules" className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/90 flex items-center gap-1 shadow-inner-2xs">
            {/* 💬 Chat Module Tab */}
            <button
              type="button"
              onClick={() => {
                handleSwitchAppTab('chat');
                setShowCalendarView(false);
              }}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                activeAppTab === 'chat' && !showCalendarView
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-900/5 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
              }`}
              title="Chat Module: Internal team conversations, client channels, and direct messages"
            >
              <div className={`p-1 rounded-lg transition-colors ${
                activeAppTab === 'chat' && !showCalendarView ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'
              }`}>
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <span className="tracking-tight">Chat</span>
              {totalUnreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-2xs">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            {/* ✉️ Mail Module Tab */}
            <button
              type="button"
              onClick={() => {
                handleSwitchAppTab('mail');
                setShowCalendarView(false);
              }}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                activeAppTab === 'mail' && !showCalendarView
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-900/5 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
              }`}
              title="Mail Module: Customer emails, Google/Outlook OAuth, collaborative shared mailboxes"
            >
              <div className={`p-1 rounded-lg transition-colors ${
                activeAppTab === 'mail' && !showCalendarView ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'
              }`}>
                <Mail className="h-3.5 w-3.5" />
              </div>
              <span className="tracking-tight">Mail</span>
              {totalUnreadEmails > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-black bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-2xs">
                  {totalUnreadEmails}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Center-Right: Global Spotlight Search Bar */}
        <div className="flex-1 max-w-xs lg:max-w-sm xl:max-w-md mx-2 hidden md:block">
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 text-xs text-slate-400 hover:text-slate-700 transition-all shadow-subtle group cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
              <span className="truncate text-slate-500 font-medium">Search messages, emails, team...</span>
            </div>
            <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 font-bold shadow-2xs shrink-0">
              ⌘ K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications, Help, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 md:hidden transition-colors"
            title="Search messages, emails, team"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowNotificationDrawer(true)}
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Activity & Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowCommandPalette(true)}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Help & Shortcuts (⌘K)"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* User Avatar with Zoom-Style Outside Status Dot */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setShowPresenceMenu(!showPresenceMenu)}
              className="relative flex items-center justify-center shrink-0 group focus:outline-none"
              title={`${user.name} (${userPresence})`}
            >
              {/* Inner Avatar with overflow-hidden ONLY on image circle */}
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-slate-200 group-hover:ring-indigo-400 transition-all overflow-hidden bg-slate-100 flex items-center justify-center shadow-2xs">
                <img
                  src={user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Zoom-style Status Badge: Sits OUTSIDE bottom-right with crisp ring */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-xs flex items-center justify-center pointer-events-none transition-transform group-hover:scale-110 ${
                  userPresence === 'AWAY'
                    ? 'bg-amber-400'
                    : userPresence === 'BUSY'
                    ? 'bg-rose-500'
                    : userPresence === 'OFFLINE'
                    ? 'bg-slate-400'
                    : 'bg-emerald-500'
                }`}
              >
                {userPresence === 'BUSY' && (
                  <span className="h-0.5 w-1.5 bg-white rounded-full" />
                )}
              </span>
            </button>

            {/* Top-Right User Menu Popover */}
            {showPresenceMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {/* User card info */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-3 mb-2">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-white shadow-2xs">
                      <img
                        src={user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                        userPresence === 'AWAY'
                          ? 'bg-amber-400'
                          : userPresence === 'BUSY'
                          ? 'bg-rose-500'
                          : userPresence === 'OFFLINE'
                          ? 'bg-slate-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 text-sm truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 uppercase">
                      {isWorkspaceOwner ? 'Owner' : currentUserRole}
                    </span>
                  </div>
                </div>

                {/* Edit Profile Action */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPresenceMenu(false);
                    setEditName(user.name);
                    setEditAvatarUrl(user.avatarUrl || '');
                    setProfileSuccessMsg(null);
                    setProfileErrorMsg(null);
                    setShowEditProfileModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 transition-all mb-1 border border-transparent hover:border-indigo-100"
                >
                  <Pencil className="h-4 w-4 text-indigo-600" />
                  <span>Edit Profile & Photo</span>
                </button>

                <div className="h-px bg-slate-100 my-1" />

                {/* Presence Status Selection (Zoom Style) */}
                <div className="space-y-0.5 py-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 block">
                    My Status (Zoom Style)
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      handleUpdatePresence('ONLINE');
                      setShowPresenceMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors ${
                      userPresence === 'ONLINE'
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-2xs" />
                      <span>Available (Online)</span>
                    </div>
                    {userPresence === 'ONLINE' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleUpdatePresence('BUSY');
                      setShowPresenceMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors ${
                      userPresence === 'BUSY'
                        ? 'bg-rose-50 text-rose-800 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white shadow-2xs flex items-center justify-center">
                        <span className="h-0.5 w-1.5 bg-white rounded-full" />
                      </span>
                      <span>Busy (Do Not Disturb)</span>
                    </div>
                    {userPresence === 'BUSY' && <Check className="h-3.5 w-3.5 text-rose-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleUpdatePresence('AWAY');
                      setShowPresenceMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors ${
                      userPresence === 'AWAY'
                        ? 'bg-amber-50 text-amber-800 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white shadow-2xs" />
                      <span>Away</span>
                    </div>
                    {userPresence === 'AWAY' && <Check className="h-3.5 w-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleUpdatePresence('OFFLINE');
                      setShowPresenceMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors ${
                      userPresence === 'OFFLINE'
                        ? 'bg-slate-100 text-slate-800 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full bg-slate-400 ring-2 ring-white shadow-2xs" />
                      <span>Invisible</span>
                    </div>
                    {userPresence === 'OFFLINE' && <Check className="h-3.5 w-3.5 text-slate-600" />}
                  </button>
                </div>

                <div className="h-px bg-slate-100 my-1" />

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {activeAppTab === 'mail' ? (
        /* ─────────────────────────────────────────────────────────────
            DEDICATED FULL-SCREEN MAIL & OAUTH INBOX CLIENT
        ───────────────────────────────────────────────────────────── */
        <div className="flex-1 flex overflow-hidden p-2 sm:p-3 md:p-4 gap-2 sm:gap-3 md:gap-4 min-h-0 relative">
          {/* ─────────────────────────────────────────────────────────────
              1. DEDICATED MAIL STUDIO SIDEBAR (Chat / Slack caliber)
          ───────────────────────────────────────────────────────────── */}
          <aside
            className={`fixed inset-y-0 left-0 z-40 w-72 bg-white flex flex-col shrink-0 border-r border-slate-200 shadow-2xl md:shadow-xs md:border md:rounded-2xl md:static md:translate-x-0 transition-transform duration-300 ease-in-out select-none overflow-hidden ${
              showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            {/* Workspace Hub & Switcher Header (Identical across Chat & Mail) */}
            <div className="p-3 border-b border-slate-100 relative">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
                  className="flex-1 flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100/80 transition-all text-left min-w-0 group cursor-pointer"
                  title="Switch Workspace"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white font-black text-sm shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                    {currentWs.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight truncate flex items-center gap-1.5">
                      <span className="truncate">{currentWs.name}</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform ${showWorkspaceSwitcher ? 'rotate-180 text-indigo-600' : ''}`} />
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                      {isWorkspaceOwner && (
                        <span className="text-[9px] font-bold uppercase text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200/80">
                          Owner
                        </span>
                      )}
                    </span>
                  </div>
                </button>

                {isWorkspaceOwner && (
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    title="Copy Workspace Invite Code"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 transition-all shadow-subtle active:scale-95 cursor-pointer"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}

                {/* Mobile close button */}
                <button
                  type="button"
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition-colors shrink-0 cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Workspace Switcher Popover */}
              {showWorkspaceSwitcher && (
                <div className="absolute top-full left-3 right-3 mt-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-2 z-50 animate-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 mb-1">
                    <span>Switch Workspace</span>
                    <span className="font-mono text-slate-400 font-normal">{workspaces.length} total</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {workspaces.map((ws) => {
                      const isActive = ws.id === currentWs.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => {
                            setShowWorkspaceSwitcher(false);
                            router.push(`/workspace/${ws.id}`);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-900 border border-indigo-200/80 shadow-2xs font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {ws.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate">{ws.name}</span>
                          </div>
                          {isActive && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
                    <Link
                      href="/workspaces"
                      onClick={() => setShowWorkspaceSwitcher(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>All Workspaces</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action: Compose Button */}
            <div className="p-3 pb-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (mailAccounts.length === 0) {
                    setShowConnectMailModal(true);
                  } else {
                    setShowComposeMailModal(true);
                  }
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-between transition-all active:scale-98 group"
              >
                <div className="flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  <span>Compose Email</span>
                </div>
                <span className="font-mono text-[10px] bg-white/20 border border-white/20 px-1.5 py-0.5 rounded text-white font-bold">
                  New
                </span>
              </button>

              {/* Quick Search */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={mailSearchQuery}
                  onChange={(e) => {
                    setMailSearchQuery(e.target.value);
                    loadMailMessages(selectedMailAccountId, mailFolder, e.target.value);
                  }}
                  placeholder="Search emails..."
                  className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs transition-all border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium placeholder-slate-400"
                />
                {mailSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setMailSearchQuery('');
                      loadMailMessages(selectedMailAccountId, mailFolder, '');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Navigation Sections */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 no-scrollbar text-xs">
              {/* FOLDERS SECTION */}
              <div>
                <div className="px-2 py-1 text-slate-400 flex items-center justify-between">
                  <span className="font-black text-[10px] uppercase tracking-wider text-slate-400">
                    Mailboxes
                  </span>
                  {totalUnreadEmails > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-2xs">
                      {totalUnreadEmails} unread
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 mt-1">
                  {[
                    { key: 'INBOX', label: 'Inbox', icon: Inbox, count: selectedMailAccount?.unreadCount || selectedMailAccount?.inboxUnreadCount || 0 },
                    { key: 'STARRED', label: 'Starred', icon: Star, count: selectedMailAccount?.starredCount || 0 },
                    { key: 'SENT', label: 'Sent', icon: Send, count: selectedMailAccount?.sentCount || 0 },
                    { key: 'DRAFTS', label: 'Drafts', icon: FileText, count: selectedMailAccount?.draftsCount || 0 },
                    { key: 'TRASH', label: 'Trash', icon: Trash2, count: selectedMailAccount?.trashCount || 0 },
                  ].map((f) => {
                    const Icon = f.icon;
                    const isActive = mailFolder === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          setMailFolder(f.key as any);
                          if (f.key === 'SENT' || f.key === 'DRAFTS' || f.key === 'TRASH') {
                            setMailStatusFilter('all');
                          }
                          setSelectedEmail(null);
                          setShowEmailDetailsModal(false);
                          setIsReplyingInline(false);
                          loadMailMessages(selectedMailAccountId, f.key, mailSearchQuery);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                          isActive
                            ? 'bg-indigo-50/90 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="truncate">{f.label}</span>
                        </div>
                        {f.count !== undefined && f.count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-2xs">
                            {f.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GROUP INBOXES SECTION (Collaborative Shared Mailboxes) */}
              <div>
                <div className="flex items-center justify-between px-2 py-1 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-indigo-600" />
                    <span className="font-black text-[10px] uppercase tracking-wider text-slate-500">
                      Group Inboxes ({mailAccounts.filter((a) => a.isShared).length})
                    </span>
                  </div>
                  {canManageGroupMail && (
                    <button
                      type="button"
                      onClick={() => {
                        setConnectMailMode('group');
                        setGroupAssignMode('existing');
                        if (channels.length > 0) {
                          handleSelectChannelForGroupMail(channels[0].id);
                        } else {
                          handleSwitchToNewGroup();
                        }
                        setShowConnectMailModal(true);
                      }}
                      className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                      title="Attach email inbox to a Channel/Group (Admins & Owners)"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 mt-1">
                  {mailAccounts.filter((a) => a.isShared).length === 0 ? (
                    <div className="p-2.5 text-center bg-indigo-50/40 rounded-xl border border-dashed border-indigo-200/60 my-1">
                      <p className="text-[11px] font-bold text-slate-700">No group mailboxes</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {canManageGroupMail
                          ? 'Link a team email to any channel'
                          : 'Configured by Workspace Admins & Owners'}
                      </p>
                      {canManageGroupMail ? (
                        <button
                          type="button"
                          onClick={() => {
                            setConnectMailMode('group');
                            setGroupAssignMode('existing');
                            if (channels.length > 0) {
                              handleSelectChannelForGroupMail(channels[0].id);
                            } else {
                              handleSwitchToNewGroup();
                            }
                            setShowConnectMailModal(true);
                          }}
                          className="mt-1.5 w-full py-1 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Group Mail</span>
                        </button>
                      ) : (
                        <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Admin & Owner access only</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    mailAccounts
                      .filter((a) => a.isShared)
                      .map((acc) => {
                        const isSelected = selectedMailAccountId === acc.id;
                        return (
                          <div
                            key={acc.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (selectedMailAccountId !== acc.id) {
                                setSelectedMailAccountId(acc.id);
                                setSelectedEmail(null);
                                loadMailMessages(acc.id, mailFolder, mailSearchQuery);
                                handleSyncMailAccount(acc.id, true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedMailAccountId(acc.id);
                                setSelectedEmail(null);
                                loadMailMessages(acc.id, mailFolder, mailSearchQuery);
                                handleSyncMailAccount(acc.id, true);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all group cursor-pointer select-none ${
                              isSelected
                                ? 'bg-indigo-50/90 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                                  #
                                </div>
                                {isSelected && (
                                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                                )}
                              </div>
                              <div className="truncate min-w-0">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="font-extrabold text-xs text-slate-900 truncate">
                                    #{acc.channelName || 'general'}
                                  </span>
                                  {acc.isAdminMaster && (
                                    <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black uppercase shrink-0" title="Workspace Admin Full Master Access">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-[10px] text-slate-400 font-mono leading-tight">{acc.emailAddress}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {acc.unhandledCount !== undefined && acc.unhandledCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black shadow-2xs" title="Needs Action by team">
                                  {acc.unhandledCount} act
                                </span>
                              )}
                              {acc.unreadCount !== undefined && acc.unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[8px] font-bold shadow-2xs">
                                  {acc.unreadCount}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDisconnectAccount(acc.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Disconnect account"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* PERSONAL ACCOUNTS SECTION */}
              <div>
                <div className="flex items-center justify-between px-2 py-1 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-slate-400" />
                    <span className="font-black text-[10px] uppercase tracking-wider text-slate-500">
                      Personal ({mailAccounts.filter((a) => !a.isShared).length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConnectMailMode('personal');
                      setShowConnectMailModal(true);
                    }}
                    className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors"
                    title="Connect personal email"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1 mt-1">
                  {mailAccounts.filter((a) => !a.isShared).length === 0 ? (
                    <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 rounded-xl">
                      No personal email linked
                    </div>
                  ) : (
                    mailAccounts
                      .filter((a) => !a.isShared)
                      .map((acc) => {
                        const isSelected = selectedMailAccountId === acc.id;
                        return (
                          <div
                            key={acc.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (selectedMailAccountId !== acc.id) {
                                setSelectedMailAccountId(acc.id);
                                setSelectedEmail(null);
                                loadMailMessages(acc.id, mailFolder, mailSearchQuery);
                                handleSyncMailAccount(acc.id, true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedMailAccountId(acc.id);
                                setSelectedEmail(null);
                                loadMailMessages(acc.id, mailFolder, mailSearchQuery);
                                handleSyncMailAccount(acc.id, true);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-all group cursor-pointer select-none ${
                              isSelected
                                ? 'bg-indigo-50/90 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                                  {acc.emailAddress.slice(0, 1).toUpperCase()}
                                </div>
                                {isSelected && (
                                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                                )}
                              </div>
                              <div className="truncate min-w-0">
                                <p className="truncate text-xs leading-tight font-semibold">{acc.emailAddress}</p>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                  {acc.provider}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {acc.unreadCount !== undefined && acc.unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold shadow-2xs">
                                  {acc.unreadCount}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDisconnectAccount(acc.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Disconnect account"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

          </aside>

          {/* ─────────────────────────────────────────────────────────────
              2. FOCUSED MAIL WORKSPACE & CANVAS (Identical card geometry to Chat)
          ───────────────────────────────────────────────────────────── */}
          <main className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-xs flex min-w-0 text-slate-900 relative overflow-hidden">
            {selectedEmail ? (
              /* ── 1. GMAIL FULL-WIDTH EMAIL DETAIL VIEW (Inside Email) ── */
              <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden relative">
                {/* Email Header Toolbar */}
                <header className="h-16 px-4 sm:px-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 z-10">
                  <div className="flex items-center gap-2.5 min-w-0 mr-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmail(null);
                        setIsReplyingInline(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-all shadow-2xs shrink-0 cursor-pointer group"
                      title="Back to all emails"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Back to Inbox</span>
                    </button>
                    <span className="h-4 w-px bg-slate-200 shrink-0" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 shrink-0">
                      {selectedEmail.folder === 'SENT' || mailFolder === 'SENT' ? 'Sent' : 'Inbox'}
                    </span>
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      {selectedEmail.subject || '(no subject)'}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Synchronized Done / Needs Action Button */}
                    {selectedMailAccount?.isShared && (
                      <button
                        type="button"
                        onClick={() => handleToggleHandledEmail(selectedEmail.id, selectedEmail.isHandled)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                          selectedEmail.isHandled
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                        }`}
                        title={selectedEmail.isHandled ? 'Click to reopen as Needs Action' : 'Click to mark as Done (updates for all team members)'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{selectedEmail.isHandled ? `Done by ${selectedEmail.handledByName || 'Team'}` : 'Mark as Done'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleToggleStarEmail(selectedEmail.id, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={selectedEmail.isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleReadEmail(selectedEmail.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Mark unread"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEmail(selectedEmail.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors hidden sm:inline-flex cursor-pointer"
                      title="Print Email"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <span className="h-4 w-[1px] bg-slate-200 mx-1" />

                    {/* 1-CLICK SHARE IN CHAT CHANNEL */}
                    <button
                      type="button"
                      onClick={() => {
                        if (channels.length > 0 && !shareMailTargetChannelId) {
                          setShareMailTargetChannelId(channels[0].id);
                        }
                        setShowShareMailModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-indigo-200/60 shadow-2xs cursor-pointer"
                      title="Share email discussion into a chat channel"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Share in Channel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsReplyingInline(true);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reply</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComposeMailData({
                          to: '',
                          cc: '',
                          subject: `Fwd: ${selectedEmail.subject}`,
                          body: `\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.fromName || selectedEmail.fromAddress} <${selectedEmail.fromAddress}>\nDate: ${new Date(selectedEmail.receivedAt).toLocaleString()}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.toAddresses.join(', ')}\n\n${selectedEmail.bodyText || selectedEmail.snippet}`,
                        });
                        setShowComposeMailModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Forward className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Forward</span>
                    </button>
                  </div>
                </header>

                {/* Email Reading Thread View (Full-Width Gmail Layout) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
                  <div className="max-w-5xl mx-auto space-y-6">
                    {/* Shared Group Mailbox Banner */}
                    {selectedMailAccount?.isShared && (
                      <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-semibold">
                            Shared Group Mailbox linked to <span className="font-bold underline">#{selectedMailAccount.channelName || 'channel'}</span>
                          </span>
                          {selectedMailAccount.isAdminMaster && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                              👑 Workspace Admin Master View
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-indigo-700 flex items-center gap-2">
                          {selectedEmail.isHandled ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done by {selectedEmail.handledByName || 'Team'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-700 font-bold bg-white px-2 py-0.5 rounded-md border border-amber-200">
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              Needs Action by any group member
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleHandledEmail(selectedEmail.id, selectedEmail.isHandled)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition-all cursor-pointer shadow-2xs"
                          >
                            {selectedEmail.isHandled ? 'Reopen' : 'Mark as Done'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Message Thread Card */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
                      {/* Subject Line & Badges */}
                      <div className="border-b border-slate-100 pb-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                              {selectedEmail.subject || '(no subject)'}
                            </h1>
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {selectedEmail.folder === 'SENT' || mailFolder === 'SENT' ? 'Sent' : 'Inbox'}
                            </span>
                            {selectedMailAccount?.isShared && (
                              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                #{selectedMailAccount.channelName || 'group'}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                            title="Print email"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Gmail-Standard Sender & Recipient Information */}
                        <div className="flex flex-wrap items-start justify-between gap-4 mt-5 pt-1">
                          <div className="flex items-start gap-3.5 min-w-0">
                            {/* Sender Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-2xs shrink-0 ${
                              selectedEmail.folder === 'SENT' || mailFolder === 'SENT'
                                ? 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white'
                                : 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white'
                            }`}>
                              {selectedEmail.folder === 'SENT' || mailFolder === 'SENT' ? (
                                <Send className="w-4 h-4" />
                              ) : (
                                (selectedEmail.fromName || selectedEmail.fromAddress || 'M').slice(0, 1).toUpperCase()
                              )}
                            </div>

                            <div className="relative min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900">
                                  {selectedEmail.folder === 'SENT' || mailFolder === 'SENT'
                                    ? selectedEmail.fromName || selectedEmail.fromAddress
                                    : selectedEmail.fromName || selectedEmail.fromAddress}
                                </span>
                                <span className="text-xs text-slate-400 font-normal">
                                  &lt;{selectedEmail.fromAddress}&gt;
                                </span>
                              </div>

                              {/* Recipient Dropdown Button (to me ▼ / to recipient ▼) */}
                              <div className="relative inline-block mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setShowEmailDetailsModal(!showEmailDetailsModal)}
                                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-medium py-0.5 px-1.5 rounded hover:bg-slate-100 transition-colors cursor-pointer select-none"
                                >
                                  <span>
                                    to {selectedEmail.folder === 'SENT' || mailFolder === 'SENT'
                                      ? (selectedEmail.toAddresses[0] || 'recipient')
                                      : 'me'}
                                  </span>
                                  <ChevronDown className="w-3 h-3 text-slate-400" />
                                </button>

                                {/* Google Gmail Metadata Details Popover */}
                                {showEmailDetailsModal && (
                                  <div className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 p-4 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-30 text-xs space-y-2 animate-in fade-in zoom-in-95">
                                    <div className="grid grid-cols-[68px_1fr] gap-y-1.5 gap-x-2 text-slate-600">
                                      <span className="text-slate-400 font-medium text-right">from:</span>
                                      <span className="text-slate-900 font-semibold truncate">
                                        {selectedEmail.fromName || selectedEmail.fromAddress} &lt;{selectedEmail.fromAddress}&gt;
                                      </span>
                                      <span className="text-slate-400 font-medium text-right">to:</span>
                                      <span className="text-slate-900 break-words">{selectedEmail.toAddresses.join(', ')}</span>
                                      {selectedEmail.ccAddresses && selectedEmail.ccAddresses.length > 0 && (
                                        <>
                                          <span className="text-slate-400 font-medium text-right">cc:</span>
                                          <span className="text-slate-900 break-words">{selectedEmail.ccAddresses.join(', ')}</span>
                                        </>
                                      )}
                                      <span className="text-slate-400 font-medium text-right">date:</span>
                                      <span className="text-slate-900">
                                        {new Date(selectedEmail.receivedAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                                      </span>
                                      <span className="text-slate-400 font-medium text-right">subject:</span>
                                      <span className="text-slate-900 font-medium">{selectedEmail.subject || '(no subject)'}</span>
                                      <span className="text-slate-400 font-medium text-right">security:</span>
                                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Standard encryption (TLS)
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Date and Quick Actions */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">
                              {new Date(selectedEmail.receivedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleToggleStarEmail(selectedEmail.id, e)}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title={selectedEmail.isStarred ? 'Unstar' : 'Star'}
                            >
                              <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsReplyingInline(true)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <Reply className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Email HTML or Text Body (Isolated & Contrast-Safe) */}
                      <EmailBodyViewer
                        key={selectedEmail.id}
                        emailId={selectedEmail.id}
                        bodyHtml={selectedEmail.bodyHtml}
                        bodyText={selectedEmail.bodyText}
                        snippet={selectedEmail.snippet}
                        subject={selectedEmail.subject}
                      />

                      {/* Attachments Section - Gmail Caliber with Real Image Previews & Document Chips */}
                      {(() => {
                        const currentAtts: Array<{ fileName: string; fileUrl: string; fileSize?: number; contentType?: string }> =
                          (selectedEmail.attachments && selectedEmail.attachments.length > 0
                            ? selectedEmail.attachments
                            : selectedEmail.attachmentsJson) || [];
                        if (currentAtts.length === 0) return null;

                        return (
                          <div className="pt-6 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-slate-400" />
                                <h4 className="text-xs font-bold text-slate-700 tracking-wide">
                                  {currentAtts.length} {currentAtts.length === 1 ? 'Attachment' : 'Attachments'}
                                </h4>
                              </div>
                              <span className="text-[11px] font-medium text-slate-400">
                                Click any file to preview or download
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {currentAtts.map((att: any, idx: number) => {
                                const isImage =
                                  (att.contentType && att.contentType.startsWith('image/')) ||
                                  /\.(png|jpe?g|webp|gif|svg)$/i.test(att.fileName || '');
                                const isPdf =
                                  (att.contentType && att.contentType.includes('pdf')) ||
                                  /\.pdf$/i.test(att.fileName || '');
                                const isDoc =
                                  (att.contentType && att.contentType.includes('word')) ||
                                  /\.(docx?|rtf)$/i.test(att.fileName || '');
                                const isSheet =
                                  (att.contentType && att.contentType.includes('spreadsheet')) ||
                                  /\.(xlsx?|csv)$/i.test(att.fileName || '');
                                const isZip =
                                  (att.contentType && att.contentType.includes('zip')) ||
                                  /\.(zip|rar|tar|gz)$/i.test(att.fileName || '');

                                let fileDownloadUrl = att.fileUrl || '#';
                                if (fileDownloadUrl !== '#' && !fileDownloadUrl.startsWith('http')) {
                                  fileDownloadUrl = `${API_URL.replace(/\/api$/, '')}${fileDownloadUrl}`;
                                }

                                return (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-2xl border border-slate-200/90 hover:border-indigo-300 bg-white hover:bg-indigo-50/20 shadow-2xs transition-all flex flex-col justify-between gap-3 group/att"
                                  >
                                    {isImage && att.fileUrl ? (
                                      <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={fileDownloadUrl}
                                          alt={att.fileName}
                                          className="h-full w-full object-contain group-hover/att:scale-105 transition-transform duration-200"
                                          loading="lazy"
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-16 w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                        {isPdf ? (
                                          <FileText className="w-8 h-8 text-rose-500" />
                                        ) : isDoc ? (
                                          <FileText className="w-8 h-8 text-blue-500" />
                                        ) : isSheet ? (
                                          <FileText className="w-8 h-8 text-emerald-500" />
                                        ) : isZip ? (
                                          <Archive className="w-8 h-8 text-amber-500" />
                                        ) : (
                                          <File className="w-8 h-8 text-slate-400" />
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between gap-2 min-w-0 pt-1 border-t border-slate-100">
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate" title={att.fileName}>
                                          {att.fileName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                          {att.fileSize ? `${(att.fileSize / 1024).toFixed(2)} KB` : 'Ready to download'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <a
                                          href={fileDownloadUrl}
                                          download={att.fileName}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                          title="Download attachment"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </a>
                                        <a
                                          href={fileDownloadUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                          title="Open in new tab"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Gmail Bottom Quick Actions (Reply / Forward) */}
                      {!isReplyingInline && (
                        <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsReplyingInline(true)}
                            className="px-5 py-2.5 rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                          >
                            <Reply className="w-4 h-4 text-slate-500" />
                            <span>Reply</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setComposeMailData({
                                to: '',
                                cc: '',
                                subject: `Fwd: ${selectedEmail.subject}`,
                                body: `\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.fromName || selectedEmail.fromAddress} <${selectedEmail.fromAddress}>\nDate: ${new Date(selectedEmail.receivedAt).toLocaleString()}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.toAddresses.join(', ')}\n\n${selectedEmail.bodyText || selectedEmail.snippet}`,
                              });
                              setShowComposeMailModal(true);
                            }}
                            className="px-5 py-2.5 rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                          >
                            <Forward className="w-4 h-4 text-slate-500" />
                            <span>Forward</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Reply Composer Card */}
                    {isReplyingInline && (
                      <div className="bg-white rounded-3xl border border-indigo-200 shadow-md p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Reply className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-slate-900">
                              Reply to {selectedEmail.fromName || selectedEmail.fromAddress}
                            </span>
                            <span className="text-slate-400">&lt;{selectedEmail.fromAddress}&gt;</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setInlineReplyText('');
                              setInlineReplyAttachments([]);
                              setIsReplyingInline(false);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Inline Reply Text Area */}
                        <textarea
                          rows={4}
                          value={inlineReplyText}
                          onChange={(e) => setInlineReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              handleSendInlineReply();
                            }
                          }}
                          placeholder="Type your reply here... (Ctrl + Enter to send)"
                          className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50/50 border border-slate-200/90 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all leading-relaxed"
                          autoFocus
                        />

                        {/* Staged Inline Attachments */}
                        {inlineReplyAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {inlineReplyAttachments.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-[11px] font-bold text-indigo-800 shadow-2xs"
                              >
                                <Paperclip className="w-3 h-3 text-indigo-600" />
                                <span className="truncate max-w-[140px]">{file.fileName}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlineReplyAttachments((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-0.5 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline Composer Action Bar */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1">
                            <label className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                              <Paperclip className="w-4 h-4" />
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleUploadMailAttachment(e.target.files, 'inline')}
                              />
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                              Ctrl + Enter
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineReplyText('');
                                setInlineReplyAttachments([]);
                                setIsReplyingInline(false);
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Discard draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={(!inlineReplyText.trim() && inlineReplyAttachments.length === 0) || isSendingMail}
                              onClick={handleSendInlineReply}
                              className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {isSendingMail ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Send</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── 2. GMAIL FULL-WIDTH ALL MAILS LIST VIEW (Only All Mail) ── */
              <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden relative">
                {/* Full-width Gmail Header Toolbar */}
                <header className="h-16 px-4 sm:px-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 z-10">
                  {/* Left: Folder Title & Badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                      {mailFolder === 'SENT' ? (
                        <Send className="h-4.5 w-4.5" />
                      ) : mailFolder === 'STARRED' ? (
                        <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
                      ) : mailFolder === 'DRAFTS' ? (
                        <FileText className="h-4.5 w-4.5" />
                      ) : mailFolder === 'TRASH' ? (
                        <Trash2 className="h-4.5 w-4.5" />
                      ) : (
                        <Inbox className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 justify-center">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm tracking-tight capitalize leading-tight">
                          {mailFolder === 'SENT' ? 'Sent' : mailFolder === 'INBOX' ? 'Inbox' : mailFolder.toLowerCase()}
                        </span>
                        {mailFolder === 'INBOX' && selectedMailAccount?.unreadCount !== undefined && selectedMailAccount.unreadCount > 0 ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {selectedMailAccount.unreadCount} unread
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {filteredMailMessages.length} {mailFolder === 'SENT' ? 'sent' : 'emails'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium truncate">
                        {selectedMailAccount?.emailAddress || 'Connected Mailbox'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Gmail Category & Filter Tabs */}
                  <div className="hidden md:flex items-center gap-3">
                    {mailFolder === 'INBOX' && (
                      <div className="flex items-center gap-1 bg-slate-50/90 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
                        {(['unhandled', 'done', 'all'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setMailStatusFilter(st)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                              mailStatusFilter === st
                                ? st === 'unhandled'
                                  ? 'bg-amber-500 text-white shadow-2xs'
                                  : st === 'done'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 font-semibold'
                            }`}
                          >
                            {st === 'unhandled' ? '⚡ Needs Action' : st === 'done' ? '✅ Done' : 'All'}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1 bg-slate-50/90 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
                      {(['all', 'unread', 'starred'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setEmailFilterMode(mode)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                            emailFilterMode === mode
                              ? 'text-indigo-700 font-bold bg-white shadow-2xs'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Pagination + Interactive Live Sync */}
                  <div className="flex items-center gap-2 shrink-0">
                    {mailTotalMessages > 0 && (
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-600 shadow-2xs">
                        <span>
                          {Math.min((mailPage - 1) * 100 + 1, mailTotalMessages)}–{Math.min(mailPage * 100, mailTotalMessages)} of {mailTotalMessages}
                        </span>
                        <div className="flex items-center ml-1 border-l border-slate-200 pl-1">
                          <button
                            type="button"
                            disabled={mailPage <= 1 || isMailLoading}
                            onClick={() => loadMailMessages(selectedMailAccountId, mailFolder, mailSearchQuery, mailPage - 1)}
                            className="p-1 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer rounded"
                            title="Previous page"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={mailPage >= mailTotalPages || isMailLoading}
                            onClick={() => loadMailMessages(selectedMailAccountId, mailFolder, mailSearchQuery, mailPage + 1)}
                            className="p-1 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer rounded"
                            title="Next page"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedMailAccount?.isShared && !canManageGroupMail ? (
                      <div
                        className="flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200/90 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-2xs shrink-0 cursor-default select-none"
                        title="Group mailbox sync is managed by Workspace Admins & Owners"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Synced by Admins</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSyncMailAccount()}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/80 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs shrink-0 transition-all active:scale-95 cursor-pointer"
                        title="Click to sync live emails with Gmail"
                      >
                        <span className={`h-2 w-2 rounded-full bg-emerald-500 ${isMailLoading ? 'animate-ping' : 'animate-pulse'}`} />
                        <span>{isMailLoading ? 'Syncing...' : 'Live Sync'}</span>
                      </button>
                    )}
                  </div>
                </header>

                {/* Mobile Filter Sub-bar */}
                <div className="md:hidden px-4 py-2 border-b border-slate-100 bg-white flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center gap-1">
                    {(['unhandled', 'done', 'all'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setMailStatusFilter(st)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                          mailStatusFilter === st
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {st === 'unhandled' ? '⚡ Needs Action' : st === 'done' ? '✅ Done' : 'All'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {(['all', 'unread', 'starred'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEmailFilterMode(mode)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${
                          emailFilterMode === mode ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-400'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reauth / Permission Warning Banner */}
                {selectedMailAccount?.provider === 'GOOGLE' && selectedMailAccount?.requiresReauth && (
                  <div className="mx-4 my-2 p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base">⚠️</span>
                      <div>
                        <p className="text-xs font-bold text-amber-900 leading-snug">Gmail Sync Permission Required</p>
                        <p className="text-[11px] text-amber-700 leading-normal">
                          Google requires permission to read incoming emails for {selectedMailAccount.emailAddress}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConnectEmail('GOOGLE')}
                      className="py-1.5 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-98 cursor-pointer shrink-0"
                    >
                      Grant Gmail Permission →
                    </button>
                  </div>
                )}

                {/* Email Messages Full-Width List (Gmail Aesthetic) */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {isMailLoading ? (
                    <div className="flex flex-col items-center justify-center py-28 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <span className="text-xs text-slate-400 font-medium">Syncing mailbox...</span>
                    </div>
                  ) : filteredMailMessages.length === 0 ? (
                    <div className="py-24 px-6 text-center text-slate-400 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto shadow-2xs">
                        <Inbox className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">No emails in {mailFolder.toLowerCase()}</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {mailStatusFilter === 'unhandled'
                            ? 'All caught up! No messages need action.'
                            : mailStatusFilter === 'done'
                            ? 'No handled emails yet.'
                            : 'Your inbox is completely caught up!'}
                        </p>
                      </div>
                      {mailAccounts.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowConnectMailModal(true)}
                          className="mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          Connect Your Email (OAuth)
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredMailMessages.map((msg) => {
                      const isSentFolder = mailFolder === 'SENT' || msg.folder === 'SENT';
                      const recipientsText = msg.toAddresses && msg.toAddresses.length > 0 ? msg.toAddresses.join(', ') : 'Recipient';
                      const displayTitle = isSentFolder ? `To: ${recipientsText}` : (msg.fromName || msg.fromAddress);
                      const senderInitial = (isSentFolder ? (recipientsText.slice(0, 1) || 'R') : (msg.fromName || msg.fromAddress || 'M').slice(0, 1)).toUpperCase();

                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleSelectEmail(msg)}
                          className={`flex items-center px-4 sm:px-6 py-3 sm:py-3.5 transition-all cursor-pointer group select-none relative ${
                            !msg.isRead
                              ? 'bg-white font-bold text-slate-900 shadow-2xs hover:bg-slate-50/90'
                              : 'bg-slate-50/20 text-slate-700 hover:bg-slate-50/90'
                          }`}
                        >
                          {/* Left Controls: Star & Done check */}
                          <div className="flex items-center gap-1.5 shrink-0 mr-3.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStarEmail(msg.id, e);
                              }}
                              className="p-1 text-slate-300 hover:text-amber-500 transition-colors cursor-pointer rounded"
                              title={msg.isStarred ? 'Unstar' : 'Star'}
                            >
                              <Star className={`w-4 h-4 ${msg.isStarred ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>

                            {!isSentFolder && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleHandledEmail(msg.id, msg.isHandled, e);
                                }}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  msg.isHandled ? 'text-emerald-600 hover:text-slate-400' : 'text-slate-300 hover:text-emerald-600'
                                }`}
                                title={msg.isHandled ? 'Reopen (mark as Needs Action)' : 'Mark Done for all group members'}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Sender Identity: Avatar + Name */}
                          <div className="w-44 sm:w-56 md:w-64 shrink-0 flex items-center gap-2.5 min-w-0 pr-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-2xs text-[11px] font-bold ${
                              isSentFolder
                                ? 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white'
                                : 'bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 text-white'
                            }`}>
                              {isSentFolder ? <Send className="w-3 h-3" /> : senderInitial}
                            </div>
                            <span className={`text-xs truncate block ${!msg.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                              {displayTitle}
                            </span>
                          </div>

                          {/* Subject & Snippet & Badges */}
                          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden pr-2">
                            {/* Done / Needs Action / Sent Badges */}
                            {isSentFolder ? (
                              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[10px] font-bold text-sky-700">
                                <Send className="w-2.5 h-2.5" />
                                <span>Sent</span>
                              </span>
                            ) : msg.isHandled ? (
                              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Done by {msg.handledByName || 'Team'}</span>
                              </span>
                            ) : selectedMailAccount?.isShared ? (
                              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>Needs Action</span>
                              </span>
                            ) : null}

                            {/* Subject */}
                            <span className={`text-xs truncate shrink-0 max-w-[240px] sm:max-w-[320px] md:max-w-[420px] ${!msg.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {msg.subject || '(no subject)'}
                            </span>

                            {/* Dash Separator */}
                            <span className="text-slate-300 text-xs shrink-0">—</span>

                            {/* Snippet */}
                            <span className="text-xs text-slate-400 font-normal truncate flex-1 min-w-0">
                              {msg.snippet}
                            </span>

                            {/* Attachment Pill */}
                            {(msg.hasAttachments || (msg.attachments && msg.attachments.length > 0) || (msg.attachmentsJson && msg.attachmentsJson.length > 0)) && (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] font-bold text-slate-600">
                                <Paperclip className="w-2.5 h-2.5 text-slate-500" />
                                <span>
                                  {msg.attachments && msg.attachments.length > 1
                                    ? `${msg.attachments.length} files`
                                    : msg.attachmentsJson && msg.attachmentsJson.length > 1
                                    ? `${msg.attachmentsJson.length} files`
                                    : 'Attachment'}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Right Controls: Hover Action Buttons & Timestamp */}
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {/* Hover Action Buttons */}
                            <div className="hidden group-hover:flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200/90 shadow-2xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleReadEmail(msg.id);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                title={msg.isRead ? 'Mark as unread' : 'Mark as read'}
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEmail(msg.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (channels.length > 0 && !shareMailTargetChannelId) {
                                    setShareMailTargetChannelId(channels[0].id);
                                  }
                                  setSelectedEmail(msg);
                                  setShowShareMailModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Share in channel"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Timestamp */}
                            <span className="text-[11px] text-slate-400 group-hover:hidden sm:group-hover:inline font-medium text-right w-16 sm:w-20 shrink-0">
                              {new Date(msg.receivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden p-2 sm:p-3 md:p-4 gap-2 sm:gap-3 md:gap-4 min-h-0 relative">
          {/* ─────────────────────────────────────────────────────────────
              MAIN CANVAS: FLOATING SIDEBAR & FLOATING CHAT CARD
          ───────────────────────────────────────────────────────────── */}
        {/* Floating Left Sidebar (Image 3 Caliber) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-white flex flex-col shrink-0 border-r border-slate-200 shadow-2xl md:shadow-xs md:border md:rounded-2xl md:static md:translate-x-0 transition-transform duration-300 ease-in-out select-none overflow-hidden ${
            showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
        {/* Workspace Hub & Switcher Header */}
        <div className="p-3 border-b border-slate-100 relative">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
              className="flex-1 flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100/80 transition-all text-left min-w-0 group"
              title="Switch Workspace"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white font-black text-sm shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                {currentWs.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight truncate flex items-center gap-1.5">
                  <span className="truncate">{currentWs.name}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform ${showWorkspaceSwitcher ? 'rotate-180 text-indigo-600' : ''}`} />
                </span>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                  {isWorkspaceOwner && (
                    <span className="text-[9px] font-bold uppercase text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200/80">
                      Owner
                    </span>
                  )}
                </span>
              </div>
            </button>

            {isWorkspaceOwner && (
              <button
                onClick={copyInviteCode}
                title="Copy Workspace Invite Code"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 transition-all shadow-subtle active:scale-95"
              >
                {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setShowMobileSidebar(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition-colors shrink-0"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Workspace Switcher Popover */}
          {showWorkspaceSwitcher && (
            <div className="absolute top-full left-3 right-3 mt-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-2 z-50 animate-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 mb-1">
                <span>Switch Workspace</span>
                <span className="font-mono text-slate-400 font-normal">{workspaces.length} total</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {workspaces.map((ws) => {
                  const isActive = ws.id === currentWs.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setShowWorkspaceSwitcher(false);
                        router.push(`/workspace/${ws.id}`);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200/80 shadow-2xs font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {ws.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{ws.name}</span>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
                <Link
                  href="/workspaces"
                  onClick={() => setShowWorkspaceSwitcher(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>All Workspaces</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
          <button
            type="button"
            onClick={() => {
              setShowCalendarView(true);
              setActiveThreadParent(null);
              setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              showCalendarView
                ? 'bg-indigo-50/90 text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className={`h-4 w-4 ${showCalendarView ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Calendar & Meetings</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              loadWorkspaceRecordings();
              setShowRecordingsModal(true);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Folder className="h-4 w-4 text-slate-400" />
            <span>Files</span>
          </button>

          <Link
            href="/workspaces"
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4 text-slate-400" />
            <span>All Workspaces</span>
          </Link>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar text-xs">
          {/* SPACES & CHANNELS */}
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-slate-400 hover:text-slate-700 group">
              <button
                onClick={() => setChannelsCollapsed(!channelsCollapsed)}
                className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    channelsCollapsed ? '-rotate-90' : ''
                  }`}
                />
                <span>CHANNELS ({channels.length})</span>
                {totalUnreadChannels > 0 && channelsCollapsed && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-2xs">
                    {totalUnreadChannels}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowCreateChannelModal(true)}
                title="Create new channel"
                className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {!channelsCollapsed && (
              <div className="space-y-0.5 mt-1">
                {channels.length === 0 ? (
                  <div className="p-3 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 my-1">
                    <p className="text-[11px] font-bold text-slate-700">No channels yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Create your custom channel</p>
                    <button
                      type="button"
                      onClick={() => setShowCreateChannelModal(true)}
                      className="mt-2 w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Create Channel</span>
                    </button>
                  </div>
                ) : (
                  channels.map((ch) => {
                    const isActive = activeChannel?.id === ch.id && !activeRecipient;
                    const unreadCount = unreadChannels[ch.id] || 0;
                    const chCanEdit = canEditChannel(currentUserRole, ch.createdById === user?.id);
                    const chCanDelete = canDeleteChannel(currentUserRole, ch.createdById === user?.id);

                    return (
                      <div
                        key={ch.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setShowMobileSidebar(false);
                          setShowCalendarView(false);
                          setActiveChannel(ch);
                          setActiveRecipient(null);
                          setActiveConversation(null);
                          setActiveThreadParent(null);
                          setUnreadChannels((prev) => ({ ...prev, [ch.id]: 0 }));
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 font-medium text-xs transition-all text-left cursor-pointer group ${
                          isActive
                            ? 'bg-indigo-50/90 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                            : unreadCount > 0
                            ? 'bg-indigo-50/60 text-slate-900 font-bold border border-indigo-100 hover:bg-indigo-50'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-md shrink-0 ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : unreadCount > 0
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70'
                            }`}
                          >
                            {ch.isPrivate ? (
                              <Lock className="h-2.5 w-2.5 text-amber-500" />
                            ) : (
                              <Hash className="h-3 w-3" />
                            )}
                          </div>
                          <span className={`truncate ${unreadCount > 0 && !isActive ? 'font-bold text-slate-900' : ''}`}>{ch.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Quick Edit/Delete buttons on hover for authorized users */}
                          {(chCanEdit || chCanDelete) && (
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              {chCanEdit && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditChannelModal(ch);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition-colors"
                                  title="Edit channel"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              {chCanDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChannelToDelete(ch);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-colors"
                                  title="Delete channel"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {unreadCount > 0 && !isActive && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-[10px] font-black text-white shadow-xs animate-pulse">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shadow-xs shrink-0 group-hover:hidden" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {channels.length > 0 && (
                  <button
                    onClick={() => setShowCreateChannelModal(true)}
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create channel</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* DIRECT MESSAGES */}
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-slate-400 hover:text-slate-700 group">
              <button
                onClick={() => setDmsCollapsed(!dmsCollapsed)}
                className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    dmsCollapsed ? '-rotate-90' : ''
                  }`}
                />
                <span>Direct Messages ({members.length})</span>
                {totalUnreadDMs > 0 && dmsCollapsed && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-2xs">
                    {totalUnreadDMs}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-0.5">
                {canInviteMembers(currentUserRole) && (
                  <button
                    onClick={() => {
                      setInviteErrorMessage(null);
                      setInviteSuccessMessage(null);
                      setShowInviteModal(true);
                    }}
                    title="Invite teammates"
                    className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowMembersDrawer(true)}
                  title="View all workspace members"
                  className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!dmsCollapsed && (
              <div className="space-y-0.5 mt-1">
                {members.map((m) => {
                  const isDmActive = activeRecipient?.id === m.user.id;
                  const isMe = m.user.id === user?.id;
                  const memberPresence = isMe ? userPresence : m.user.presence;
                  const unreadCount = unreadDirectMessages[m.user.id] || 0;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        handleSelectDirectMessage(m.user);
                        setUnreadDirectMessages((prev) => ({ ...prev, [m.user.id]: 0 }));
                      }}
                      title={`${m.user.name} (${memberPresence === 'BUSY' ? 'In a call' : memberPresence === 'AWAY' ? 'Away' : memberPresence === 'ONLINE' ? 'Active' : 'Offline'})`}
                      className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition-all group ${
                        isDmActive
                          ? 'bg-indigo-50/90 border border-indigo-200/80 text-indigo-900 font-bold shadow-2xs'
                          : unreadCount > 0
                          ? 'bg-emerald-50/80 border border-emerald-200/80 font-bold text-slate-900 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                            alt={m.user.name}
                            className="h-6 w-6 rounded-lg border border-slate-200 object-cover"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-2xs ${
                              memberPresence === 'BUSY'
                                ? 'bg-rose-500'
                                : memberPresence === 'AWAY'
                                ? 'bg-amber-400'
                                : memberPresence === 'ONLINE'
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                          />
                        </div>
                        <span className={`truncate text-xs ${unreadCount > 0 && !isDmActive ? 'font-bold text-slate-900' : 'font-medium'}`}>
                          {m.user.name} {isMe && <span className="text-[10px] text-slate-400 font-normal">(you)</span>}
                        </span>
                        {memberPresence === 'BUSY' && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200/80 shrink-0">
                            In call
                          </span>
                        )}
                        {memberPresence === 'AWAY' && (
                          <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/80 shrink-0">
                            Away
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCount > 0 && !isDmActive && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-emerald-600 text-[10px] font-black text-white shadow-xs animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                        {m.role === 'OWNER' && !unreadCount && (
                          <span className="text-[9px] font-bold text-indigo-700 uppercase bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/80 shrink-0">
                            Owner
                          </span>
                        )}
                        {!isMe && (
                          <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartCall(m.user, false);
                              }}
                              className="p-1 hover:bg-emerald-100 text-slate-400 hover:text-emerald-700 rounded-md transition-colors"
                              title={`Voice call ${m.user.name}`}
                            >
                              <Phone className="h-3 w-3" />
                            </span>
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartCall(m.user, true);
                              }}
                              className="p-1 hover:bg-indigo-100 text-slate-400 hover:text-indigo-700 rounded-md transition-colors"
                              title={`Video call ${m.user.name}`}
                            >
                              <Video className="h-3 w-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {canInviteMembers(currentUserRole) && (
                  <button
                    onClick={() => {
                      setInviteErrorMessage(null);
                      setInviteSuccessMessage(null);
                      setShowInviteModal(true);
                    }}
                    className="w-full mt-2 flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium transition-all group border border-dashed border-indigo-200"
                  >
                    <div className="h-5 w-5 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Plus className="h-3 w-3" />
                    </div>
                    <span>Add teammates</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. FOCUSED CHAT WORKSPACE & CANVAS
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col min-w-0 text-slate-900 relative overflow-hidden">
        {/* Spacious & Responsive Chat Header (Image 3 Caliber) */}
        {!showCalendarView && (
          <header className="h-16 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 z-10 bg-white">
          {/* Mobile hamburger menu button */}
          <button
            type="button"
            onClick={() => setShowMobileSidebar(true)}
            className="relative p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors shrink-0"
            title="Open channels & messages"
            aria-label="Open channels and messages"
          >
            <Menu className="h-5 w-5" />
            {totalUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600 ring-2 ring-white"></span>
              </span>
            )}
          </button>

          {showCalendarView ? (
            <div className="flex items-center gap-3 min-w-0 shrink">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-base tracking-tight leading-tight shrink-0">
                    Team Calendar & Meetings
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    Teams & Zoom Mode
                  </span>
                </div>
                <span className="text-xs text-slate-400 truncate font-normal leading-tight mt-0.5">
                  Schedule, organize team video meetings, and manage participants
                </span>
              </div>
            </div>
          ) : activeRecipient ? (() => {
            const recipientMember = members.find((m) => m.user.id === activeRecipient.id);
            const rPresence: PresenceStatus = recipientMember?.user?.presence || activeRecipient.presence || 'OFFLINE';
            return (
              <div className="flex items-center gap-3 min-w-0 shrink">
                <div className="relative shrink-0">
                  <img
                    src={activeRecipient.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                    alt={activeRecipient.name}
                    className="h-9 w-9 rounded-xl border border-slate-200 object-cover shadow-2xs"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white shadow-xs ${
                      rPresence === 'BUSY'
                        ? 'bg-rose-500'
                        : rPresence === 'AWAY'
                        ? 'bg-amber-400'
                        : rPresence === 'ONLINE'
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0 justify-center">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base tracking-tight leading-tight shrink-0">
                      {activeRecipient.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        rPresence === 'BUSY'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : rPresence === 'AWAY'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : rPresence === 'ONLINE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {rPresence === 'BUSY'
                        ? 'In a call'
                        : rPresence === 'AWAY'
                        ? 'Away'
                        : rPresence === 'ONLINE'
                        ? 'Active now'
                        : 'Offline'}
                    </span>
                  </div>
                <span
                  className="text-xs text-slate-400 truncate max-w-xs md:max-w-md font-mono leading-tight mt-0.5"
                  title={activeRecipient.email}
                >
                  {activeRecipient.email}
                </span>
              </div>
            </div>
          ); })() : isMailViewActive ? (
            <div className="flex items-center gap-3 min-w-0 shrink">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shrink-0 shadow-sm">
                <Mail className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-base tracking-tight leading-tight shrink-0">
                    Patterns Mailbox
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    OAuth 2.0
                  </span>
                </div>
                <span className="text-xs text-slate-500 truncate max-w-sm font-medium leading-tight mt-0.5">
                  {selectedMailAccount ? selectedMailAccount.emailAddress : 'Connect your Google email'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0 shrink">
              <button
                onClick={() => setIsStarred(!isStarred)}
                className="text-slate-400 hover:text-amber-500 transition-colors p-1 shrink-0"
                title="Star channel"
              >
                <Star
                  className={`h-4 w-4 ${
                    isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'
                  }`}
                />
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 shrink-0">
                  {activeChannel?.isPrivate ? (
                    <Lock className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Hash className="h-4.5 w-4.5" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-base tracking-tight leading-tight shrink-0">
                      {activeChannel?.name}
                    </span>
                    {activeChannel && canEditChannel(currentUserRole, activeChannel?.createdById === user?.id) && (
                      <button
                        type="button"
                        onClick={() => openEditChannelModal(activeChannel)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit channel name & topic"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {activeChannel && canDeleteChannel(currentUserRole, activeChannel?.createdById === user?.id) && (
                      <button
                        type="button"
                        onClick={() => setChannelToDelete(activeChannel)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete channel"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Cross-Module Bridge: Linked Group Mailbox Badge */}
                    {activeChannel && (() => {
                      const linkedMailAcc = mailAccounts.find((a) => a.channelId === activeChannel.id || a.channelName === activeChannel.name);
                      if (!linkedMailAcc) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMailAccountId(linkedMailAcc.id);
                            handleSwitchAppTab('mail');
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200/80 transition-all cursor-pointer shadow-2xs shrink-0 ml-1"
                          title={`Open linked group mailbox (${linkedMailAcc.emailAddress}) in Mail Studio`}
                        >
                          <Mail className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="font-mono truncate max-w-[140px]">{linkedMailAcc.emailAddress}</span>
                          {linkedMailAcc.unreadCount !== undefined && linkedMailAcc.unreadCount > 0 && (
                            <span className="px-1 py-0.1 rounded-full bg-indigo-600 text-white text-[9px] font-black shrink-0">
                              {linkedMailAcc.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  {activeChannel?.topic && (
                    <span
                      className="text-xs text-slate-500 truncate max-w-sm md:max-w-md lg:max-w-xl font-normal leading-tight mt-0.5"
                      title={activeChannel.topic}
                    >
                      {activeChannel.topic}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Header Right Actions & Live Controls (Image 3 Caliber) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Back to Chat button when viewing Calendar */}
            {showCalendarView && (
              <button
                type="button"
                onClick={() => setShowCalendarView(false)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold transition-all shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                <span>Back to Chat</span>
              </button>
            )}

            {/* 1-on-1 Audio / Video Call Controls for DM */}
            {activeRecipient && !showCalendarView && (
              <>
                <button
                  type="button"
                  onClick={() => handleStartCall(activeRecipient, false)}
                  className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all shrink-0"
                  title={`Start voice call with ${activeRecipient.name}`}
                >
                  <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline font-bold">Voice Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCall(activeRecipient, true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 px-3 py-1.5 text-xs font-bold transition-all shrink-0"
                  title={`Start video call with ${activeRecipient.name}`}
                >
                  <Video className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline font-bold">Video Call</span>
                </button>
              </>
            )}

            {/* Linked Group Mailbox pill for Active Channel */}
            {!activeRecipient && !showCalendarView && activeChannel && (() => {
              const channelMail = mailAccounts.find((a) => a.channelId === activeChannel.id);
              if (channelMail) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMailAccountId(channelMail.id);
                      setActiveAppTab('mail');
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/90 px-2.5 py-1.5 text-xs font-semibold text-indigo-900 transition-all shadow-2xs shrink-0 group"
                    title={`Group Mailbox: ${channelMail.emailAddress} - Click to open in Mail Studio`}
                  >
                    <Mail className="h-3.5 w-3.5 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="font-bold text-indigo-700 hidden lg:inline max-w-[150px] truncate">
                      {channelMail.emailAddress}
                    </span>
                    <span className="font-bold text-indigo-700 lg:hidden">
                      Group Mail
                    </span>
                    {channelMail.unhandledCount !== undefined && channelMail.unhandledCount > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-amber-500 text-white shadow-xs animate-pulse">
                        {channelMail.unhandledCount}
                      </span>
                    )}
                  </button>
                );
              } else if (canManageGroupMail) {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setConnectMailMode('group');
                      setGroupAssignMode('existing');
                      handleSelectChannelForGroupMail(activeChannel.id);
                      setShowConnectMailModal(true);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 transition-all shrink-0 cursor-pointer"
                    title="Link a shared group mailbox for this channel (Admins & Owners)"
                  >
                    <Mail className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="hidden xl:inline">+ Link Group Mail</span>
                  </button>
                );
              }
              return null;
            })()}

            {/* Instant Team Meeting Button */}
            {!activeRecipient && !showCalendarView && activeChannel && (
              <button
                type="button"
                onClick={() => {
                  const instantMeeting: Meeting = {
                    id: `meeting-${activeChannel.id}`,
                    workspaceId,
                    title: `${activeChannel.name} Team Meeting`,
                    description: `Live group conference for #${activeChannel.name}`,
                    scheduledAt: new Date().toISOString(),
                    duration: 60,
                    hostId: user?.id || '',
                    channelId: activeChannel.id,
                    status: 'LIVE' as const,
                    createdAt: new Date().toISOString(),
                    host: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : { id: '', name: 'Host', email: '' },
                    channel: { id: activeChannel.id, name: activeChannel.name },
                    participants: members.map((m) => ({
                      id: `p-${m.id}`,
                      meetingId: `meeting-${activeChannel.id}`,
                      userId: m.user.id,
                      role: m.role || 'MEMBER',
                      status: 'ACCEPTED' as const,
                      user: m.user,
                    })),
                  };
                  setActiveTeamMeeting(instantMeeting);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-95"
                title="Start or join Team Video Meeting"
              >
                <Video className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Team Meeting</span>
              </button>
            )}

            {/* Pinned Messages Button */}
            <button
              type="button"
              onClick={handleLoadPinnedMessages}
              className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all shrink-0"
              title="View pinned messages"
            >
              <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
              <span className="hidden md:inline">Pinned</span>
            </button>

            {/* Call Recordings Database Button */}
            <button
              type="button"
              onClick={() => {
                loadWorkspaceRecordings();
                setShowRecordingsModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all shrink-0"
              title="View saved recordings"
            >
              <Disc className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span className="hidden md:inline">Recordings</span>
              {workspaceRecordings.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {workspaceRecordings.length}
                </span>
              )}
            </button>

            {/* Add People Button */}
            {!activeRecipient && activeChannel && canInviteMembers(currentUserRole) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAddUserIds([]);
                  setAddMemberSearchQuery('');
                  setShowAddChannelMemberModal(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all shrink-0"
                title="Add people to this channel"
              >
                <UserPlus className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                <span className="hidden md:inline">Add People</span>
              </button>
            )}

            {/* More actions menu (•••) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHeaderMoreMenu(!showHeaderMoreMenu)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showHeaderMoreMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setChannelMembersTab('channel');
                      setShowMembersDrawer(true);
                      setShowHeaderMoreMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>Channel Members</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {activeRecipient ? members.length : (activeChannelMembers.length || members.length)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      setShowHeaderMoreMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-rose-500" />
                      )}
                      <span>Sound Chimes</span>
                    </div>
                    <span className={`text-[10px] font-bold ${soundEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {soundEnabled ? 'ON' : 'MUTED'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsStarred(!isStarred);
                      setShowHeaderMoreMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                      <span>Star Channel</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {isStarred ? 'Starred' : 'Unstarred'}
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <div className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-semibold text-emerald-700">Live Sync Active</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">WebRTC</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        )}

          {/* Main Feed + Thread Split */}
          <div className="flex-1 flex overflow-hidden">
            {showCalendarView ? (
              <CalendarView
                workspaceId={workspaceId}
                token={token}
                currentUser={user}
                currentUserRole={currentUserRole || 'MEMBER'}
                channels={channels}
                members={members}
                onToggleSidebar={() => setShowMobileSidebar(true)}
                onStartInstantMeeting={(meetingTitle, channelId) => {
                  const targetChannel = channels.find((c) => c.id === channelId) || activeChannel;
                  const instantMeeting: Meeting = {
                    id: `meeting-${Date.now()}`,
                    workspaceId,
                    title: meetingTitle || `${targetChannel?.name ? '#' + targetChannel.name : 'Team'} Instant Meeting`,
                    description: 'Instant ad-hoc team video conference',
                    scheduledAt: new Date().toISOString(),
                    duration: 45,
                    hostId: user?.id || '',
                    channelId: targetChannel?.id,
                    status: 'LIVE' as const,
                    createdAt: new Date().toISOString(),
                    host: user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : { id: '', name: 'Host', email: '' },
                    channel: targetChannel ? { id: targetChannel.id, name: targetChannel.name } : undefined,
                    participants: members.map((m) => ({
                      id: `p-${m.id}`,
                      meetingId: `meeting-${Date.now()}`,
                      userId: m.user.id,
                      role: m.role || 'MEMBER',
                      status: 'ACCEPTED' as const,
                      user: m.user,
                    })),
                  };
                  setActiveTeamMeeting(instantMeeting);
                }}
                onJoinMeeting={(meeting) => {
                  setActiveTeamMeeting(meeting);
                }}
                onClose={() => setShowCalendarView(false)}
              />
            ) : activeRecipient ? (
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
                {/* Direct Message Feed Stream */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3">
                  {/* Direct Message Start Hero Card */}
                  <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 border border-slate-200/80 mb-6 shadow-xs">
                    {(() => {
                      const recipientMember = members.find((m) => m.user.id === activeRecipient.id);
                      const rPresence: PresenceStatus = recipientMember?.user?.presence || activeRecipient.presence || 'OFFLINE';
                      return (
                        <div className="relative inline-block mb-3">
                          <img
                            src={activeRecipient.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                            alt={activeRecipient.name}
                            className="h-14 w-14 rounded-2xl border border-slate-200 object-cover shadow-md"
                          />
                          <span
                            className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-xs ${
                              rPresence === 'BUSY'
                                ? 'bg-rose-500'
                                : rPresence === 'AWAY'
                                ? 'bg-amber-400'
                                : rPresence === 'ONLINE'
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                          />
                        </div>
                      );
                    })()}
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {activeRecipient.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 max-w-xl leading-relaxed">
                      This is the start of your 1-on-1 direct conversation with <strong>{activeRecipient.name}</strong>. Messages sent here are private and only visible between the two of you.
                    </p>
                  </div>

                  {/* Direct Messages List */}
                  {dmLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  ) : directMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No direct messages yet. Say hello to {activeRecipient.name.split(' ')[0]}! 👋
                    </div>
                  ) : (
                    directMessages.map((msg, index) => {
                      const prevMsg = directMessages[index - 1];
                      const isConsecutive =
                        prevMsg &&
                        prevMsg.userId === msg.userId &&
                        new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() <
                          5 * 60 * 1000;

                      const groupedDMReactions = groupReactions(msg.reactions);

                      const msgDate = new Date(msg.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const prevDate = prevMsg
                        ? new Date(prevMsg.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : null;
                      const showDateDivider = !prevDate || msgDate !== prevDate;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateDivider && (
                            <div className="relative flex items-center justify-center my-6 select-none">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200/80" />
                              </div>
                              <div className="relative px-3.5 py-0.5 bg-white border border-slate-200/70 rounded-full text-[11px] font-semibold text-slate-400 tracking-wide shadow-2xs">
                                {msgDate}
                              </div>
                            </div>
                          )}
                          <div
                            id={`msg-${msg.id}`}
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                          className={`group relative flex items-start gap-3.5 rounded-2xl px-4 py-2 -mx-2 hover:bg-slate-50/90 transition-all ${
                            isConsecutive ? 'mt-0.5' : 'mt-2.5'
                          } ${
                            highlightedMessageId === msg.id
                              ? 'ring-2 ring-indigo-500 bg-indigo-50/70 shadow-md scale-[1.01]'
                              : ''
                          }`}
                        >
                          {/* Floating Action Bar for DM */}
                          {hoveredMessageId === msg.id && (
                            <div className="absolute right-4 -top-3.5 z-10 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md px-2 py-1 shadow-lg text-slate-600">
                              {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleDirectReaction(msg.id, emoji)}
                                  className="p-1 hover:bg-slate-100 rounded-lg text-xs transition-transform hover:scale-125"
                                  title={`React ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() => setActiveEmojiPickerFor({ messageId: msg.id, isDM: true })}
                                className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-500 text-xs transition-colors"
                                title="More reactions"
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                              <button
                                onClick={() => handleTogglePinMessage(msg.id, true)}
                                className={`p-1 rounded-lg text-xs transition-colors ${
                                  msg.isPinned
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                }`}
                                title={msg.isPinned ? 'Unpin message' : 'Pin to conversation'}
                              >
                                <Pin className={`h-3.5 w-3.5 ${msg.isPinned ? 'fill-amber-400 text-amber-600' : ''}`} />
                              </button>

                              {/* Edit & Delete Actions for Author */}
                              {(msg.userId === user?.id || msg.user?.id === user?.id) && (
                                <>
                                  <span className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setEditingContent(msg.content);
                                    }}
                                    className="p-1 hover:bg-slate-100 hover:text-indigo-600 rounded-lg text-slate-500 text-xs transition-colors"
                                    title="Edit message"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDirectMessage(msg.id)}
                                    className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 text-xs transition-colors"
                                    title="Delete message"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {!isConsecutive ? (
                            <div className="relative shrink-0 mt-0.5">
                              <img
                                src={msg.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                alt={msg.user.name}
                                className="h-10 w-10 rounded-xl border border-slate-200 object-cover shadow-2xs"
                              />
                            </div>
                          ) : (
                            <div className="w-10 shrink-0 text-right pr-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 select-none">
                              {formatTimestamp(msg.createdAt)}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {msg.isPinned && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50/90 border border-amber-200/90 px-2.5 py-0.5 rounded-lg w-fit mb-1 shadow-2xs">
                                <Pin className="h-3 w-3 fill-amber-500 text-amber-600" />
                                <span>Pinned by {msg.pinnedBy?.name || 'user'}</span>
                              </div>
                            )}

                            {!isConsecutive && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-[14px] text-slate-900 tracking-tight">
                                  {msg.user.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-normal">
                                  {formatTimestamp(msg.createdAt)}
                                </span>
                                {msg.isEdited && (
                                  <span className="text-[10px] text-slate-400 italic font-normal" title="Edited message">
                                    (edited)
                                  </span>
                                )}
                              </div>
                            )}

                            {editingMessageId === msg.id ? (
                              <div className="mt-1.5 rounded-xl border border-indigo-300 bg-white p-2.5 shadow-sm">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleUpdateDirectMessage(msg.id, editingContent);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingMessageId(null);
                                      setEditingContent('');
                                    }
                                  }}
                                  rows={3}
                                  autoFocus
                                  className="w-full resize-none text-[14px] text-slate-900 bg-transparent focus:outline-none leading-relaxed"
                                />
                                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                                  <span className="text-[11px] text-slate-400">
                                    <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">Enter</kbd> to save • <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">Esc</kbd> to cancel
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditingContent('');
                                      }}
                                      disabled={isSavingEdit}
                                      className="px-2.5 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDirectMessage(msg.id, editingContent)}
                                      disabled={isSavingEdit || !editingContent.trim()}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-2xs"
                                    >
                                      {isSavingEdit ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                                        </>
                                      ) : (
                                        'Save Changes'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              msg.content && (
                                <div className="text-[14px] text-slate-800 leading-relaxed">
                                  {renderMessageContent(msg.content)}
                                  {isConsecutive && msg.isEdited && (
                                    <span className="ml-1 text-[10px] text-slate-400 italic select-none">
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              )
                            )}

                            {/* Render Attachments */}
                            {renderAttachments(msg.attachments)}

                            {/* Reaction Pills for DM */}
                            {groupedDMReactions.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {groupedDMReactions.map((r) => (
                                  <button
                                    key={r.emoji}
                                    onClick={() => handleToggleDirectReaction(msg.id, r.emoji)}
                                    title={`${r.users.join(', ')} reacted with ${r.emoji}`}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 text-xs font-semibold border transition-all ${
                                      r.userHasReacted
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/60'
                                    }`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span>{r.count}</span>
                                  </button>
                                ))}

                                <button
                                  onClick={() => setActiveEmojiPickerFor({ messageId: msg.id, isDM: true })}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 text-slate-500 hover:text-indigo-600 text-xs transition-colors"
                                  title="Add reaction"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Direct Message Composer */}
                <div className="px-3 sm:px-6 pb-3 sm:pb-6 pt-1 relative">
                  {/* Mention Autocomplete Dropdown for DM */}
                  {mentionType && mentionTarget === 'dm' && (
                    <div className="absolute left-3 right-3 sm:left-6 sm:right-6 bottom-[100%] mb-2 z-30 max-h-56 overflow-y-auto rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center justify-between">
                        <span>{mentionType === 'user' ? 'Mention Member' : 'Mention Space / Channel'}</span>
                        <span>esc to dismiss</span>
                      </div>
                      {mentionType === 'user' ? (
                        members
                          .filter((m) => m.user.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                          .map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleInsertMention(m.user.name)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-indigo-50/70 hover:text-indigo-900 transition-colors text-slate-700"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                  alt={m.user.name}
                                  className="h-6 w-6 rounded-lg border border-slate-200 object-cover"
                                />
                                <span className="font-bold text-slate-900">{m.user.name}</span>
                              </div>
                              <span className="text-[10px] text-indigo-500 font-medium">@{m.user.name}</span>
                            </button>
                          ))
                      ) : (
                        channels
                          .filter((c) => c.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleInsertMention(c.name)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-emerald-50/70 hover:text-emerald-900 transition-colors text-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <Hash className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="font-bold text-slate-900">{c.name}</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-medium">#{c.name}</span>
                            </button>
                          ))
                      )}
                    </div>
                  )}

                  <form
                    onSubmit={handleSendDirectMessage}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOverDM(true);
                    }}
                    onDragLeave={() => setIsDraggingOverDM(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOverDM(false);
                      handleDMFileUpload(e.dataTransfer.files);
                    }}
                    className={`rounded-2xl border bg-white shadow-xl shadow-slate-200/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden ${
                      isDraggingOverDM ? 'border-dashed border-2 border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20' : 'border-slate-200/90'
                    }`}
                  >
                    <input
                      type="file"
                      ref={dmFileInputRef}
                      onChange={(e) => handleDMFileUpload(e.target.files)}
                      className="hidden"
                      multiple
                    />

                    {/* Pending Attachments preview in DM composer */}
                    {pendingDMAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50">
                        {pendingDMAttachments.map((att, idx) => {
                          const cat = getFileCategory(att.fileType, att.fileName);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs group"
                            >
                              {cat === 'image' ? (
                                <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                              ) : cat === 'video' ? (
                                <Film className="h-3.5 w-3.5 text-indigo-600" />
                              ) : cat === 'audio' ? (
                                <Music className="h-3.5 w-3.5 text-purple-600" />
                              ) : cat === 'archive' ? (
                                <Archive className="h-3.5 w-3.5 text-amber-600" />
                              ) : cat === 'code' ? (
                                <FileCode className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                              )}
                              <span className="font-semibold text-slate-800 max-w-[140px] truncate">{att.fileName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({formatFileSize(att.fileSize)})</span>
                              <button
                                type="button"
                                onClick={() => setPendingDMAttachments((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-0.5 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition-colors ml-0.5"
                                title="Remove file"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Real-Time Live Multi-GB Upload Progress Bar */}
                    {uploadProgress && (
                      <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-slate-50 border-b border-indigo-100/90 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-slate-700 mb-1.5">
                          <div className="flex items-center gap-2 truncate mr-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" />
                            <span className="font-bold text-slate-900 truncate">{uploadProgress.fileName}</span>
                            <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                              ({formatFileSize(uploadProgress.uploadedBytes)} / {formatFileSize(uploadProgress.totalBytes)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                            {uploadProgress.speed && (
                              <span className="text-indigo-600 font-semibold">{uploadProgress.speed}</span>
                            )}
                            <span className="font-extrabold text-slate-900">{uploadProgress.percent}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200/90 h-2 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-150 ease-out"
                            style={{ width: `${uploadProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Unified DM Composer Bar (Image 3 Caliber) */}
                    <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
                      {/* Left Actions: Smile, Paperclip, AtSign */}
                      <div className="flex items-center gap-1 text-slate-400 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInputText((prev) => prev + ' 👋')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Say wave"
                        >
                          <Smile className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dmFileInputRef.current?.click()}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Attach File or Image"
                        >
                          <Paperclip className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + '@');
                            setMentionType('user');
                            setMentionTarget('dm');
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Mention someone"
                        >
                          <AtSign className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Composer Textarea */}
                      <textarea
                        value={inputText}
                        onChange={(e) => handleInputChange(e, 'dm')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendDirectMessage();
                          }
                        }}
                        placeholder={`Direct message ${activeRecipient.name}... (Enter to send, Shift+Enter for new line)`}
                        rows={1}
                        className="flex-1 resize-none py-1.5 px-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none max-h-32 min-h-[28px]"
                      />

                      {/* Right: Solid Send Button (Image 3 Caliber) */}
                      <button
                        type="submit"
                        disabled={isSending || (!inputText.trim() && pendingDMAttachments.length === 0)}
                        className={`px-4 sm:px-5 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 shadow-sm ${
                          inputText.trim() || pendingDMAttachments.length > 0
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25 active:scale-95'
                            : 'bg-indigo-300 text-white cursor-not-allowed opacity-70'
                        }`}
                        title="Send Message"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : !activeChannel ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                <div className="h-16 w-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <Hash className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Welcome to {currentWs?.name || 'Workspace'}</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
                  No channels have been created yet. Create your first channel with your own choice of name, or pick a teammate from the left sidebar to send a direct message.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Your First Channel</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
                {/* Message Feed Stream */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3">
                  {/* Modern Start-Of-Channel Hero */}
                  <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 border border-slate-200/80 mb-6 shadow-xs">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white mb-3 shadow-md shadow-indigo-600/20">
                      <Hash className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Welcome to #{activeChannel?.name}!
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
                      {activeChannel?.topic ||
                        `This channel is the dedicated collaborative space for #${activeChannel?.name}. Share messages, reply in threads, or react with emojis.`}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => setShowMembersDrawer(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                      >
                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                        <span>View members</span>
                      </button>
                      {isWorkspaceOwner && (
                        <button
                          onClick={copyInviteCode}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <Copy className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Copy invite code</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages Stream */}
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No messages in this space yet. Say hello to your team! 👋
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const prevMsg = messages[index - 1];
                      const isConsecutive =
                        prevMsg &&
                        prevMsg.userId === msg.userId &&
                        new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() <
                          5 * 60 * 1000;

                      const groupedReactions = groupReactions(msg.reactions);
                      const repliesCount = msg._count?.replies || 0;

                      const userFirstName = user?.name ? user.name.split(' ')[0].toLowerCase() : '';
                      const userFullName = user?.name ? user.name.toLowerCase() : '';
                      const isMentioned = Boolean(
                        user &&
                        (
                          (userFullName && msg.content.toLowerCase().includes('@' + userFullName)) ||
                          (userFirstName && userFirstName.length >= 2 && msg.content.toLowerCase().includes('@' + userFirstName))
                        )
                      );

                      const msgDate = new Date(msg.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const prevDate = prevMsg
                        ? new Date(prevMsg.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : null;
                      const showDateDivider = !prevDate || msgDate !== prevDate;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateDivider && (
                            <div className="relative flex items-center justify-center my-6 select-none">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200/80" />
                              </div>
                              <div className="relative px-3.5 py-0.5 bg-white border border-slate-200/70 rounded-full text-[11px] font-semibold text-slate-400 tracking-wide shadow-2xs">
                                {msgDate}
                              </div>
                            </div>
                          )}
                          <div
                            id={`msg-${msg.id}`}
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                          className={`group relative flex items-start gap-3.5 rounded-2xl px-4 py-2 -mx-2 hover:bg-slate-50/90 transition-all ${
                            isConsecutive ? 'mt-0.5' : 'mt-2.5'
                          } ${
                            highlightedMessageId === msg.id
                              ? 'ring-2 ring-indigo-500 bg-indigo-50/70 shadow-md scale-[1.01]'
                              : activeThreadParent?.id === msg.id
                              ? 'bg-indigo-50/60 border border-indigo-200/90'
                              : isMentioned
                              ? 'bg-amber-50/40'
                              : ''
                          }`}
                        >
                          {/* Modern Floating Action Bar */}
                          {hoveredMessageId === msg.id && (
                            <div className="absolute right-4 -top-3.5 z-10 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md px-2 py-1 shadow-lg text-slate-600">
                              {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className="p-1 hover:bg-slate-100 rounded-lg text-xs transition-transform hover:scale-125"
                                  title={`React ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() => setActiveEmojiPickerFor({ messageId: msg.id, isDM: false })}
                                className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-500 text-xs transition-colors"
                                title="More reactions"
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                              <button
                                onClick={() => handleTogglePinMessage(msg.id, false)}
                                className={`p-1 rounded-lg text-xs transition-colors ${
                                  msg.isPinned
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                }`}
                                title={msg.isPinned ? 'Unpin message' : 'Pin to channel'}
                              >
                                <Pin className={`h-3.5 w-3.5 ${msg.isPinned ? 'fill-amber-400 text-amber-600' : ''}`} />
                              </button>
                              <span className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                              <button
                                onClick={() => openThread(msg)}
                                className="p-1 hover:bg-indigo-600 hover:text-white rounded-lg text-slate-700 flex items-center gap-1 text-xs transition-colors"
                                title="Reply in thread"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                                <span className="text-[11px] font-semibold hidden sm:inline">Reply</span>
                              </button>

                              {/* Edit & Delete Actions for Author or Workspace Owner */}
                              {(msg.userId === user?.id || msg.user?.id === user?.id) && (
                                <>
                                  <span className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(msg.id);
                                      setEditingContent(msg.content);
                                    }}
                                    className="p-1 hover:bg-slate-100 hover:text-indigo-600 rounded-lg text-slate-500 text-xs transition-colors"
                                    title="Edit message"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {(msg.userId === user?.id || msg.user?.id === user?.id || isWorkspaceOwner) && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 text-xs transition-colors"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Avatar Squircle / Timestamp */}
                          {!isConsecutive ? (
                            <div className="relative shrink-0 mt-0.5">
                              <img
                                src={msg.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                alt={msg.user.name}
                                className="h-10 w-10 rounded-xl border border-slate-200 object-cover shadow-2xs"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                            </div>
                          ) : (
                            <div className="w-10 shrink-0 text-right pr-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 select-none">
                              {formatTimestamp(msg.createdAt)}
                            </div>
                          )}

                          {/* Message Content */}
                          <div className="flex-1 min-w-0">
                            {msg.isPinned && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50/90 border border-amber-200/90 px-2.5 py-0.5 rounded-lg w-fit mb-1 shadow-2xs">
                                <Pin className="h-3 w-3 fill-amber-500 text-amber-600" />
                                <span>Pinned by {msg.pinnedBy?.name || 'team member'}</span>
                              </div>
                            )}

                            {!isConsecutive && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-[14px] text-slate-900 hover:underline cursor-pointer tracking-tight">
                                  {msg.user.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-normal">
                                  {formatTimestamp(msg.createdAt)}
                                </span>
                                {msg.isEdited && (
                                  <span className="text-[10px] text-slate-400 italic font-normal" title="Edited message">
                                    (edited)
                                  </span>
                                )}
                              </div>
                            )}

                            {editingMessageId === msg.id ? (
                              <div className="mt-1.5 rounded-xl border border-indigo-300 bg-white p-2.5 shadow-sm">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleUpdateMessage(msg.id, editingContent);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingMessageId(null);
                                      setEditingContent('');
                                    }
                                  }}
                                  rows={3}
                                  autoFocus
                                  className="w-full resize-none text-[14px] text-slate-900 bg-transparent focus:outline-none leading-relaxed"
                                />
                                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                                  <span className="text-[11px] text-slate-400">
                                    <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">Enter</kbd> to save • <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">Esc</kbd> to cancel
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditingContent('');
                                      }}
                                      disabled={isSavingEdit}
                                      className="px-2.5 py-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMessage(msg.id, editingContent)}
                                      disabled={isSavingEdit || !editingContent.trim()}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-2xs"
                                    >
                                      {isSavingEdit ? (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                                        </>
                                      ) : (
                                        'Save Changes'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              msg.content && (
                                <div className="text-[14px] text-slate-800 leading-relaxed">
                                  {renderMessageContent(msg.content)}
                                  {isConsecutive && msg.isEdited && (
                                    <span className="ml-1 text-[10px] text-slate-400 italic select-none">
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              )
                            )}

                            {/* Render Attachments */}
                            {renderAttachments(msg.attachments)}

                            {/* Reaction Pills */}
                            {groupedReactions.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {groupedReactions.map((r) => (
                                  <button
                                    key={r.emoji}
                                    onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                    title={`${r.users.join(', ')} reacted with ${r.emoji}`}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 text-xs font-semibold border transition-all ${
                                      r.userHasReacted
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/60'
                                    }`}
                                  >
                                    <span>{r.emoji}</span>
                                    <span>{r.count}</span>
                                  </button>
                                ))}

                                <button
                                  onClick={() => setActiveEmojiPickerFor({ messageId: msg.id, isDM: false })}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 text-slate-500 hover:text-indigo-600 text-xs transition-colors"
                                  title="Add reaction"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            {/* Connected Thread Preview Pill */}
                            {repliesCount > 0 && (
                              <div className="mt-2.5">
                                <button
                                  onClick={() => openThread(msg)}
                                  className="group/pill inline-flex items-center gap-2.5 rounded-xl py-1 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200/90 transition-all shadow-2xs"
                                >
                                  {msg.replies && msg.replies.length > 0 && (
                                    <div className="flex -space-x-1.5 overflow-hidden">
                                      {msg.replies.map((reply, idx) => (
                                        <img
                                          key={idx}
                                          src={reply.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                          alt={reply.user.name}
                                          className="inline-block h-4.5 w-4.5 rounded-full ring-1 ring-white"
                                        />
                                      ))}
                                    </div>
                                  )}
                                  <span>{repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}</span>
                                  <span className="text-[11px] text-slate-500 font-normal">
                                    View discussion
                                  </span>
                                  <ChevronRight className="h-3 w-3 text-indigo-600 group-hover/pill:translate-x-0.5 transition-transform" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                <div className="px-3 sm:px-6 h-5 flex items-center text-xs text-indigo-600 font-medium italic">
                  {typingUsers.length > 0 && (
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
                    </span>
                  )}
                </div>

                {/* Modern Floating Glass Message Composer */}
                <div className="px-3 sm:px-6 pb-3 sm:pb-6 pt-1 relative">
                  {/* Mention Autocomplete Dropdown for Channel */}
                  {mentionType && mentionTarget === 'channel' && (
                    <div className="absolute left-3 right-3 sm:left-6 sm:right-6 bottom-[100%] mb-2 z-30 max-h-56 overflow-y-auto rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 flex items-center justify-between">
                        <span>{mentionType === 'user' ? 'Mention Member' : 'Mention Space / Channel'}</span>
                        <span>esc to dismiss</span>
                      </div>
                      {mentionType === 'user' ? (
                        members
                          .filter((m) => m.user.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                          .map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleInsertMention(m.user.name)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-indigo-50/70 hover:text-indigo-900 transition-colors text-slate-700"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                  alt={m.user.name}
                                  className="h-6 w-6 rounded-lg border border-slate-200 object-cover"
                                />
                                <span className="font-bold text-slate-900">{m.user.name}</span>
                              </div>
                              <span className="text-[10px] text-indigo-500 font-medium">@{m.user.name}</span>
                            </button>
                          ))
                      ) : (
                        channels
                          .filter((c) => c.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleInsertMention(c.name)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-emerald-50/70 hover:text-emerald-900 transition-colors text-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <Hash className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="font-bold text-slate-900">{c.name}</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-medium">#{c.name}</span>
                            </button>
                          ))
                      )}
                    </div>
                  )}

                  <form
                    onSubmit={handleSendMessage}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOverChannel(true);
                    }}
                    onDragLeave={() => setIsDraggingOverChannel(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOverChannel(false);
                      handleChannelFileUpload(e.dataTransfer.files);
                    }}
                    className={`rounded-2xl border bg-white shadow-xl shadow-slate-200/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden ${
                      isDraggingOverChannel ? 'border-dashed border-2 border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20' : 'border-slate-200/90'
                    }`}
                  >
                    <input
                      type="file"
                      ref={channelFileInputRef}
                      onChange={(e) => handleChannelFileUpload(e.target.files)}
                      className="hidden"
                      multiple
                    />

                    {/* Pending Attachments preview */}
                    {pendingAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50">
                        {pendingAttachments.map((att, idx) => {
                          const cat = getFileCategory(att.fileType, att.fileName);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs group"
                            >
                              {cat === 'image' ? (
                                <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                              ) : cat === 'video' ? (
                                <Film className="h-3.5 w-3.5 text-indigo-600" />
                              ) : cat === 'audio' ? (
                                <Music className="h-3.5 w-3.5 text-purple-600" />
                              ) : cat === 'archive' ? (
                                <Archive className="h-3.5 w-3.5 text-amber-600" />
                              ) : cat === 'code' ? (
                                <FileCode className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                              )}
                              <span className="font-semibold text-slate-800 max-w-[140px] truncate">{att.fileName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({formatFileSize(att.fileSize)})</span>
                              <button
                                type="button"
                                onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-0.5 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition-colors ml-0.5"
                                title="Remove file"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Real-Time Live Multi-GB Upload Progress Bar */}
                    {uploadProgress && (
                      <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-slate-50 border-b border-indigo-100/90 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-slate-700 mb-1.5">
                          <div className="flex items-center gap-2 truncate mr-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" />
                            <span className="font-bold text-slate-900 truncate">{uploadProgress.fileName}</span>
                            <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                              ({formatFileSize(uploadProgress.uploadedBytes)} / {formatFileSize(uploadProgress.totalBytes)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                            {uploadProgress.speed && (
                              <span className="text-indigo-600 font-semibold">{uploadProgress.speed}</span>
                            )}
                            <span className="font-extrabold text-slate-900">{uploadProgress.percent}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200/90 h-2 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-150 ease-out"
                            style={{ width: `${uploadProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Unified Composer Bar (Image 3 Caliber) */}
                    <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
                      {/* Left Actions: Smile, Paperclip, AtSign */}
                      <div className="flex items-center gap-1 text-slate-400 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInputText((prev) => prev + ' 😊')}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Add Emoji"
                        >
                          <Smile className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => channelFileInputRef.current?.click()}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Attach File or Image"
                        >
                          <Paperclip className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + '@');
                            setMentionType('user');
                            setMentionTarget('channel');
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="Mention someone"
                        >
                          <AtSign className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Composer Textarea */}
                      <textarea
                        value={inputText}
                        onChange={(e) => handleInputChange(e, 'channel')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Message #${activeChannel?.name || 'general'} (Enter to send, Shift+Enter for new line)...`}
                        rows={1}
                        className="flex-1 resize-none py-1.5 px-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none max-h-32 min-h-[28px]"
                      />

                      {/* Right: Solid Send Button (Image 3 Caliber) */}
                      <button
                        type="submit"
                        disabled={isSending || (!inputText.trim() && pendingAttachments.length === 0)}
                        className={`px-4 sm:px-5 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 shadow-sm ${
                          inputText.trim() || pendingAttachments.length > 0
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25 active:scale-95'
                            : 'bg-indigo-300 text-white cursor-not-allowed opacity-70'
                        }`}
                        title="Send Message"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                5. MODERN THREAD DRAWER (Slideout Side-Panel Light)
            ───────────────────────────────────────────────────────────── */}
            {activeThreadParent && (
              <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] md:relative md:inset-auto md:w-[380px] lg:w-[420px] border-l border-slate-200/80 bg-slate-50/95 flex flex-col shrink-0 animate-in slide-in-from-right duration-200 shadow-2xl">
                {/* Thread Header */}
                <div className="h-14 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">Thread Discussion</span>
                    <span className="text-xs text-indigo-600 font-bold">#{activeChannel?.name}</span>
                  </div>
                  <button
                    onClick={() => setActiveThreadParent(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Thread Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Parent Message Card */}
                  <div className="p-4 rounded-2xl bg-white border-l-2 border-indigo-600 border border-slate-200/80 shadow-xs flex items-start gap-3">
                    <img
                      src={activeThreadParent.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                      alt={activeThreadParent.user.name}
                      className="h-9 w-9 rounded-xl border border-slate-200 object-cover shrink-0 mt-0.5 shadow-2xs"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[13.5px] text-slate-900">
                          {activeThreadParent.user.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {formatTimestamp(activeThreadParent.createdAt)}
                        </span>
                        {activeThreadParent.isEdited && (
                          <span className="text-[10px] text-slate-400 italic font-normal" title="Edited message">
                            (edited)
                          </span>
                        )}
                      </div>
                      <div className="text-[13.5px] text-slate-800">
                        {renderMessageContent(activeThreadParent.content)}
                      </div>
                      {renderAttachments(activeThreadParent.attachments)}
                    </div>
                  </div>

                  {/* Replies Separator */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="h-[1px] flex-1 bg-slate-200" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-200" />
                  </div>

                  {/* Replies Stream */}
                  {threadLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    </div>
                  ) : threadReplies.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No replies in this thread yet. Be the first to chime in!
                    </div>
                  ) : (
                    threadReplies.map((reply) => {
                      const isReplyAuthor = reply.user.id === user?.id || reply.userId === user?.id;
                      const canDeleteReply = isReplyAuthor || isWorkspaceOwner;

                      return (
                        <div
                          key={reply.id}
                          onMouseEnter={() => setHoveredMessageId(reply.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                          className="group relative flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors"
                        >
                          {/* Floating Action Bar for Reply */}
                          {hoveredMessageId === reply.id && (isReplyAuthor || canDeleteReply) && (
                            <div className="absolute right-3 -top-2.5 z-10 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md px-1.5 py-0.5 shadow-md text-slate-600">
                              {isReplyAuthor && (
                                <button
                                  onClick={() => {
                                    setEditingMessageId(reply.id);
                                    setEditingContent(reply.content);
                                  }}
                                  className="p-1 hover:bg-slate-100 hover:text-indigo-600 rounded-lg text-slate-500 text-xs transition-colors"
                                  title="Edit reply"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              {canDeleteReply && (
                                <button
                                  onClick={() => handleDeleteMessage(reply.id)}
                                  className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 text-xs transition-colors"
                                  title="Delete reply"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}

                          <img
                            src={reply.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                            alt={reply.user.name}
                            className="h-8 w-8 rounded-lg border border-slate-200 object-cover shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-[13px] text-slate-900">
                                {reply.user.name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {formatTimestamp(reply.createdAt)}
                              </span>
                              {reply.isEdited && (
                                <span className="text-[10px] text-slate-400 italic font-normal" title="Edited message">
                                  (edited)
                                </span>
                              )}
                            </div>

                            {editingMessageId === reply.id ? (
                              <div className="mt-1 rounded-xl border border-indigo-300 bg-white p-2 shadow-xs">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleUpdateMessage(reply.id, editingContent);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingMessageId(null);
                                      setEditingContent('');
                                    }
                                  }}
                                  rows={2}
                                  autoFocus
                                  className="w-full resize-none text-[13px] text-slate-900 bg-transparent focus:outline-none leading-relaxed"
                                />
                                <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-xs">
                                  <span className="text-[10px] text-slate-400">
                                    <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono border">Enter</kbd> save • <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono border">Esc</kbd> cancel
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditingContent('');
                                      }}
                                      disabled={isSavingEdit}
                                      className="px-2 py-0.5 text-slate-600 hover:text-slate-800 text-xs font-medium"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMessage(reply.id, editingContent)}
                                      disabled={isSavingEdit || !editingContent.trim()}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                    >
                                      {isSavingEdit ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[13px] text-slate-800">
                                {renderMessageContent(reply.content)}
                              </div>
                            )}

                            {renderAttachments(reply.attachments)}
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={threadEndRef} />
                </div>

                {/* Thread Composer */}
                <div className="p-3 border-t border-slate-200/80 bg-white">
                  <form
                    onSubmit={handleSendThreadReply}
                    className="rounded-2xl border border-slate-200/90 bg-slate-50/80 shadow-md focus-within:border-indigo-500 transition-all overflow-hidden"
                  >
                    <input
                      type="file"
                      ref={threadFileInputRef}
                      onChange={(e) => handleThreadFileUpload(e.target.files)}
                      className="hidden"
                      multiple
                    />

                    {/* Pending Attachments in Thread */}
                    {pendingThreadAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-3 pt-2.5 pb-2 border-b border-slate-200/60 bg-white">
                        {pendingThreadAttachments.map((att, idx) => {
                          const cat = getFileCategory(att.fileType, att.fileName);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] shadow-2xs group"
                            >
                              {cat === 'image' ? (
                                <ImageIcon className="h-3 w-3 text-indigo-600" />
                              ) : cat === 'video' ? (
                                <Film className="h-3 w-3 text-indigo-600" />
                              ) : cat === 'audio' ? (
                                <Music className="h-3 w-3 text-purple-600" />
                              ) : cat === 'archive' ? (
                                <Archive className="h-3 w-3 text-amber-600" />
                              ) : cat === 'code' ? (
                                <FileCode className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <FileText className="h-3 w-3 text-indigo-600" />
                              )}
                              <span className="font-semibold text-slate-800 max-w-[110px] truncate">{att.fileName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">({formatFileSize(att.fileSize)})</span>
                              <button
                                type="button"
                                onClick={() => setPendingThreadAttachments((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-0.5 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition-colors"
                                title="Remove file"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Live Upload Progress in Thread */}
                    {isUploadingThread && uploadProgress && (
                      <div className="px-3 py-2 bg-indigo-50/70 border-b border-indigo-100 text-[11px]">
                        <div className="flex items-center justify-between text-slate-700 mb-1">
                          <span className="font-bold truncate max-w-[140px] text-slate-900">{uploadProgress.fileName}</span>
                          <span className="font-mono text-indigo-600 font-bold">{uploadProgress.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-150"
                            style={{ width: `${uploadProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <textarea
                      value={threadInputText}
                      onChange={(e) => setThreadInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendThreadReply();
                        }
                      }}
                      placeholder="Reply in thread..."
                      rows={2}
                      className="w-full resize-none px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                    />

                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200/60 bg-white">
                      <div className="flex items-center gap-1 text-slate-500">
                        <button
                          type="button"
                          onClick={() => setThreadInputText((prev) => prev + ' 👍')}
                          className="p-1 hover:bg-slate-100 rounded-lg text-xs"
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          onClick={() => setThreadInputText((prev) => prev + ' ❤️')}
                          className="p-1 hover:bg-slate-100 rounded-lg text-xs"
                        >
                          ❤️
                        </button>
                        <button
                          type="button"
                          onClick={() => threadFileInputRef.current?.click()}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                          title="Attach any file (GBs supported)"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingThreadReply || (!threadInputText.trim() && pendingThreadAttachments.length === 0)}
                        className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                          threadInputText.trim() || pendingThreadAttachments.length > 0
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title="Send Reply"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              </aside>
            )}

            {/* Members Slideout Panel */}
            {showMembersDrawer && !activeThreadParent && (
              <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 md:relative md:inset-auto md:w-80 border-l border-slate-200/80 bg-white md:bg-slate-50/95 p-4 flex flex-col shrink-0 animate-in slide-in-from-right duration-150 shadow-2xl">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold text-sm text-slate-900">
                      {channelMembersTab === 'channel' && activeChannel && !activeRecipient
                        ? `#${activeChannel.name} Members`
                        : 'Workspace Members'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMembersDrawer(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tab Switcher if in a channel */}
                {!activeRecipient && activeChannel && (
                  <div className="flex rounded-xl bg-slate-200/60 p-1 mt-3 text-xs font-semibold text-slate-600">
                    <button
                      onClick={() => setChannelMembersTab('channel')}
                      className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                        channelMembersTab === 'channel'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      In Channel ({!activeChannel?.isPrivate ? members.length : (activeChannelMembers.length || members.length)})
                    </button>
                    <button
                      onClick={() => setChannelMembersTab('workspace')}
                      className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                        channelMembersTab === 'workspace'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Workspace ({members.length})
                    </button>
                  </div>
                )}

                {/* Channel Members Tab Content */}
                {channelMembersTab === 'channel' && !activeRecipient && activeChannel ? (
                  <>
                    {isWorkspaceOwner && (
                      <div className="pt-3">
                        <button
                          onClick={() => {
                            setSelectedAddUserIds([]);
                            setAddMemberSearchQuery('');
                            setShowAddChannelMemberModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium text-xs transition-all shadow-sm"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Add People to #{activeChannel.name}</span>
                        </button>
                      </div>
                    )}

                    <div className="mt-3 flex-1 overflow-y-auto space-y-2">
                      {(() => {
                        const listToRender = !activeChannel?.isPrivate
                          ? members
                          : activeChannelMembers.length > 0
                          ? activeChannelMembers
                          : members;

                        return listToRender.map((m: any) => {
                          const isMe = m.user.id === user?.id;
                          const isCreator = m.user.id === activeChannel.createdById;
                          const canRemoveFromChannel =
                            isWorkspaceOwner &&
                            activeChannel.isPrivate &&
                            !isMe &&
                            !isCreator;

                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors shadow-2xs group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative shrink-0">
                                  <img
                                    src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                    alt={m.user.name}
                                    className="h-8 w-8 rounded-lg border border-slate-200 object-cover"
                                  />
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white ${
                                      (isMe ? userPresence : m.user.presence) === 'BUSY'
                                        ? 'bg-rose-500'
                                        : (isMe ? userPresence : m.user.presence) === 'AWAY'
                                        ? 'bg-amber-400'
                                        : (isMe ? userPresence : m.user.presence) === 'ONLINE'
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-400'
                                    }`}
                                  />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {m.user.name}{' '}
                                    {isMe && <span className="text-[10px] text-slate-400 font-normal">(you)</span>}
                                  </span>
                                  <span className="text-[10px] text-slate-500 truncate">
                                    {isCreator ? (
                                      <span className="font-semibold text-indigo-600">Channel Creator</span>
                                    ) : (
                                      'Member'
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {!isMe && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartCall(m.user, false)}
                                      title={`Voice call ${m.user.name}`}
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartCall(m.user, true)}
                                      title={`Video call ${m.user.name}`}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                      <Video className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                                {canRemoveFromChannel && (
                                  <button
                                    onClick={() => handleRemoveChannelMember(m.user.id)}
                                    title={`Remove ${m.user.name} from #${activeChannel.name}`}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                ) : (
                  /* Workspace Members Tab Content */
                  <>
                    {/* Quick Invite Button */}
                    {canInviteMembers(currentUserRole) && (
                      <div className="pt-3">
                        <button
                          onClick={() => {
                            setShowMembersDrawer(false);
                            setInviteErrorMessage(null);
                            setInviteSuccessMessage(null);
                            setShowInviteModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium text-xs transition-all shadow-sm"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Invite Teammate</span>
                        </button>
                      </div>
                    )}

                    <div className="mt-3 flex-1 overflow-y-auto space-y-2">
                      {members.map((m) => {
                        const isMe = m.user.id === user?.id;
                        const isMemberOwner =
                          m.role === 'OWNER' ||
                          currentWs?.owner?.id === m.user.id ||
                          currentWs?.ownerId === m.user.id;
                        const canRemove = canRemoveMember(currentUserRole, m.role, isMe);

                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors shadow-2xs group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                  alt={m.user.name}
                                  className="h-8 w-8 rounded-lg border border-slate-200 object-cover"
                                />
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white ${
                                    (isMe ? userPresence : m.user.presence) === 'BUSY'
                                      ? 'bg-rose-500'
                                      : (isMe ? userPresence : m.user.presence) === 'AWAY'
                                      ? 'bg-amber-400'
                                      : (isMe ? userPresence : m.user.presence) === 'ONLINE'
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {m.user.name}{' '}
                                  {isMe && <span className="text-[10px] text-slate-400 font-normal">(you)</span>}
                                </span>
                                {canManageMemberRole(currentUserRole, m.role) && !isMe ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <select
                                      value={m.role}
                                      onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as WorkspaceRole)}
                                      className="text-[10px] font-bold rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer shadow-2xs"
                                    >
                                      {getAllowedInviteRoles(currentUserRole).map((r) => (
                                        <option key={r} value={r}>
                                          {ROLE_CONFIGS[r]?.label || r}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {isMemberOwner ? (
                                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        <Crown className="h-2.5 w-2.5" />
                                        Super Admin
                                      </span>
                                    ) : (
                                      <span className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded border ${ROLE_CONFIGS[m.role as WorkspaceRole]?.badgeBg || 'bg-slate-50'} ${ROLE_CONFIGS[m.role as WorkspaceRole]?.badgeText || 'text-slate-700'} ${ROLE_CONFIGS[m.role as WorkspaceRole]?.badgeBorder || 'border-slate-200'}`}>
                                        {ROLE_CONFIGS[m.role as WorkspaceRole]?.label || m.role}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isMe && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartCall(m.user, false)}
                                    title={`Voice call ${m.user.name}`}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartCall(m.user, true)}
                                    title={`Video call ${m.user.name}`}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  >
                                    <Video className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {canRemove && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRemoveMemberError(null);
                                    setMemberToRemove(m);
                                  }}
                                  title={`Remove ${m.user.name} from workspace`}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </aside>
            )}
          </div>
        </main>
      </div>
    )}

      {/* ─────────────────────────────────────────────────────────────
          6. COMMAND PALETTE MODAL (⌘K Quick Switcher Light)
      ───────────────────────────────────────────────────────────── */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-xs pt-20 px-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150">
            {/* Search Input Bar */}
            <div className="flex items-center px-4 border-b border-slate-100 bg-slate-50/80">
              <Search className="h-4 w-4 text-indigo-600 mr-3" />
              <input
                autoFocus
                type="text"
                value={commandPaletteQuery}
                onChange={(e) => setCommandPaletteQuery(e.target.value)}
                placeholder="Search channels, spaces, or team members..."
                className="w-full py-4 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setShowCommandPalette(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Results */}
            <div className="max-h-80 overflow-y-auto p-3 space-y-4">
              {/* Channels */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                  Spaces &amp; Channels
                </span>
                <div className="space-y-1">
                  {filteredChannels.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No channels found</div>
                  ) : (
                    filteredChannels.map((c) => {
                      const unreadCount = unreadChannels[c.id] || 0;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveChannel(c);
                            setActiveRecipient(null);
                            setActiveConversation(null);
                            setActiveThreadParent(null);
                            setUnreadChannels((prev) => ({ ...prev, [c.id]: 0 }));
                            setShowCommandPalette(false);
                            setCommandPaletteQuery('');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                            activeChannel?.id === c.id
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
                              : unreadCount > 0
                              ? 'bg-indigo-50/50 text-indigo-950 font-bold border border-indigo-100 hover:bg-indigo-50'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Hash className={`h-3.5 w-3.5 ${unreadCount > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`} />
                            <span className="truncate">{c.name}</span>
                            {c.isPrivate && <Lock className="h-3 w-3 text-amber-500 ml-1 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-[9px] font-black text-white shadow-2xs">
                                {unreadCount} new
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">Jump →</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Members */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
                  Workspace Members
                </span>
                <div className="space-y-1">
                  {filteredMembers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No members found</div>
                  ) : (
                    filteredMembers.map((m) => {
                      const unreadCount = unreadDirectMessages[m.user.id] || 0;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            handleSelectDirectMessage(m.user);
                            setUnreadDirectMessages((prev) => ({ ...prev, [m.user.id]: 0 }));
                            setShowCommandPalette(false);
                            setCommandPaletteQuery('');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                            unreadCount > 0
                              ? 'bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 font-bold'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <img
                              src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                              alt={m.user.name}
                              className="h-5 w-5 rounded-md border border-slate-200 shrink-0"
                            />
                            <span className="truncate">{m.user.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-[9px] font-black text-white shadow-2xs">
                                {unreadCount} new
                              </span>
                            )}
                            <span className="text-[10px] text-indigo-500 font-semibold">Message →</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer Tip */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Navigate with mouse or click</span>
              <kbd className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">ESC to close</kbd>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. MODERN "CREATE CHANNEL" MODAL (Clean Glass Light)
      ───────────────────────────────────────────────────────────── */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[90vh] my-auto flex flex-col rounded-3xl bg-white shadow-2xl text-slate-900 border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-3.5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Hash className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Create Space or Channel</h3>
                  <p className="text-xs text-slate-500">Organized spaces for team discussions and group inboxes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateChannelModal(false)}
                className="text-slate-400 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Form Body */}
              <div className="p-5 sm:p-6 py-4 overflow-y-auto space-y-4 flex-1">
                {channelError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                    {channelError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Channel Name
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <span className="absolute left-3.5 text-indigo-600 font-bold">#</span>
                    <input
                      type="text"
                      required
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="e.g. sprint-planning or design-system"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={newChannelTopic}
                    onChange={(e) => setNewChannelTopic(e.target.value)}
                    placeholder="What is this channel about?"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 bg-slate-50">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Make Private</span>
                    <span className="text-[11px] text-slate-500 block">
                      Only invited members can view this channel
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newChannelIsPrivate}
                    onChange={(e) => setNewChannelIsPrivate(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Teammates Selection */}
                {canInviteMembers(currentUserRole) && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Add Teammates (Optional)
                      </label>
                      <span className="text-[11px] text-indigo-600 font-semibold">
                        {newChannelSelectedMembers.length} selected
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      By default, you are the only member in this channel. Teammates are <span className="font-semibold text-slate-700">not added automatically</span>. Check anyone you want to include:
                    </p>

                    {members.filter((m) => m.user.id !== user?.id).length === 0 ? (
                      <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                        No other teammates in this workspace yet.
                      </div>
                    ) : (
                      <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-2 space-y-1">
                        {members
                          .filter((m) => m.user.id !== user?.id)
                          .map((m) => {
                            const isChecked = newChannelSelectedMembers.includes(m.user.id);
                            return (
                              <label
                                key={m.id}
                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-indigo-50 border border-indigo-200 shadow-2xs'
                                    : 'hover:bg-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                    alt={m.user.name}
                                    className="h-6 w-6 rounded-md border border-slate-200 object-cover shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold text-slate-900 block truncate">
                                      {m.user.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block truncate">
                                      {m.user.email}
                                    </span>
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewChannelSelectedMembers((prev) => [...prev, m.user.id]);
                                    } else {
                                      setNewChannelSelectedMembers((prev) =>
                                        prev.filter((id) => id !== m.user.id)
                                      );
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                />
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step to Sync Shared Mailbox for this Group / Channel */}
                {canManageGroupMail ? (
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Sync Group Mailbox
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            All group members share this mail ID to read & reply to clients
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={newChannelEnableMail}
                        onChange={(e) => {
                          setNewChannelEnableMail(e.target.checked);
                          if (e.target.checked && !newChannelGroupEmail && newChannelName) {
                            setNewChannelGroupEmail(`${newChannelName.toLowerCase().replace(/\s+/g, '-')}@company.com`);
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>

                    {newChannelEnableMail && (
                      <div className="pt-2 space-y-3 animate-in fade-in duration-200 border-t border-indigo-100/80">
                        {/* Provider Switcher: Google OAuth vs Manual Email */}
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-indigo-100">
                          <button
                            type="button"
                            onClick={() => setNewChannelMailProvider('GOOGLE')}
                            className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              newChannelMailProvider === 'GOOGLE'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                              <path
                                fill={newChannelMailProvider === 'GOOGLE' ? '#ffffff' : '#4285F4'}
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill={newChannelMailProvider === 'GOOGLE' ? '#ffffff' : '#34A853'}
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill={newChannelMailProvider === 'GOOGLE' ? '#ffffff' : '#FBBC05'}
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                              />
                              <path
                                fill={newChannelMailProvider === 'GOOGLE' ? '#ffffff' : '#EA4335'}
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                              />
                            </svg>
                            <span>Google OAuth</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChannelMailProvider('CUSTOM')}
                            className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              newChannelMailProvider === 'CUSTOM'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Manual Email</span>
                          </button>
                        </div>

                        {newChannelMailProvider === 'GOOGLE' ? (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => handleCreateChannel(undefined, true)}
                              disabled={channelCreating || !newChannelName.trim()}
                              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                              <span>Continue with Google (OAuth)</span>
                            </button>
                            <p className="text-[10px] text-slate-500 text-center">
                              Creates this channel and connects it directly to Google Workspace without needing to reconnect in Mailbox.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Shared Group Email Address
                            </label>
                            <div className="relative flex items-center">
                              <Mail className="absolute left-3 h-4 w-4 text-indigo-500" />
                              <input
                                type="email"
                                value={newChannelGroupEmail}
                                onChange={(e) => setNewChannelGroupEmail(e.target.value)}
                                placeholder="e.g. support@company.com or project@domain.com"
                                className="w-full rounded-xl border border-indigo-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 bg-indigo-50/80 rounded-lg p-2 border border-indigo-100">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                          <span>
                            Strict group privacy: Only members of this group can access and reply to client emails. Non-members cannot see or send from it.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Group Mailbox Sync is reserved for Workspace Admins & Owners.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-end gap-3 p-4 px-6 border-t border-slate-100 bg-slate-50/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={channelCreating || !newChannelName.trim()}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {channelCreating
                    ? 'Creating...'
                    : newChannelEnableMail && newChannelMailProvider === 'GOOGLE'
                    ? 'Create & Connect Google'
                    : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7B. ADD PEOPLE TO ACTIVE CHANNEL MODAL
      ───────────────────────────────────────────────────────────── */}
      {showAddChannelMemberModal && activeChannel && canInviteMembers(currentUserRole) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddChannelMemberModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add people to #{activeChannel.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Invite workspace members into this channel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddChannelMemberModal(false)}
                className="text-slate-400 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={addMemberSearchQuery}
                  onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                  placeholder="Search teammates by name or email..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {(() => {
                const existingMemberUserIds = new Set(activeChannelMembers.map((m) => m.user.id));
                const eligibleMembers = members.filter(
                  (m) =>
                    !existingMemberUserIds.has(m.user.id) &&
                    (m.user.name.toLowerCase().includes(addMemberSearchQuery.toLowerCase()) ||
                      m.user.email.toLowerCase().includes(addMemberSearchQuery.toLowerCase()))
                );

                if (eligibleMembers.length === 0) {
                  return (
                    <div className="py-8 text-center rounded-2xl bg-slate-50 border border-slate-200/80">
                      <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-slate-800">
                        {addMemberSearchQuery
                          ? 'No matching teammates found'
                          : 'All teammates are already in this channel'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {addMemberSearchQuery
                          ? 'Try searching with a different name or email'
                          : 'Everyone from this workspace has joined'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200 p-2 space-y-1">
                    {eligibleMembers.map((m) => {
                      const isChecked = selectedAddUserIds.includes(m.user.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-indigo-50 border border-indigo-200 shadow-2xs'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                              alt={m.user.name}
                              className="h-7 w-7 rounded-lg border border-slate-200 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 block truncate">
                                {m.user.name}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {m.user.email}
                              </span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAddUserIds((prev) => [...prev, m.user.id]);
                              } else {
                                setSelectedAddUserIds((prev) =>
                                  prev.filter((id) => id !== m.user.id)
                                );
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          />
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {selectedAddUserIds.length} {selectedAddUserIds.length === 1 ? 'person' : 'people'} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddChannelMemberModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMembersToChannel}
                  disabled={selectedAddUserIds.length === 0 || isAddingChannelMember}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:opacity-95 disabled:opacity-50 transition-all"
                >
                  {isAddingChannelMember ? 'Adding...' : 'Add to Channel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7C. MODERN "EDIT CHANNEL" MODAL (Clean Glass Light)
      ───────────────────────────────────────────────────────────── */}
      {showEditChannelModal && (channelToEdit || activeChannel) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => {
            setShowEditChannelModal(false);
            setChannelToEdit(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit #{channelToEdit?.name || activeChannel?.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">Update channel name, topic, or privacy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditChannelModal(false);
                  setChannelToEdit(null);
                }}
                className="text-slate-400 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editChannelError && (
              <div className="mt-3.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {editChannelError}
              </div>
            )}

            <form onSubmit={handleUpdateChannel} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Channel Name
                </label>
                <div className="relative mt-1.5 flex items-center">
                  <span className="absolute left-3.5 text-indigo-600 font-bold">#</span>
                  <input
                    type="text"
                    required
                    value={editChannelName}
                    onChange={(e) => setEditChannelName(e.target.value)}
                    placeholder="e.g. general-discussions"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Topic (Optional)
                </label>
                <input
                  type="text"
                  value={editChannelTopic}
                  onChange={(e) => setEditChannelTopic(e.target.value)}
                  placeholder="What is this channel about?"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 bg-slate-50">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Make Private</span>
                  <span className="text-[11px] text-slate-500 block">
                    Only invited members can view this channel
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editChannelIsPrivate}
                  onChange={(e) => setEditChannelIsPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Linked Group Mailbox (Shared with all channel members)
                </label>
                <div className="relative mt-1.5 flex items-center">
                  <Mail className={`absolute left-3.5 h-4 w-4 ${canManageGroupMail ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    disabled={!canManageGroupMail}
                    value={editChannelGroupEmail}
                    onChange={(e) => setEditChannelGroupEmail(e.target.value)}
                    placeholder={canManageGroupMail ? 'e.g. project-team@company.com' : 'No group mailbox linked'}
                    className={`w-full rounded-xl border pl-10 pr-3 py-2.5 text-sm ${
                      canManageGroupMail
                        ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600'
                        : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                    }`}
                  />
                </div>
                {canManageGroupMail ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    All members of this group can read, send replies, and get notifications for this mailbox. Non-members cannot access it.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Only Workspace Admins and Owners can link or modify group mailboxes.</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditChannelModal(false);
                    setChannelToEdit(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editChannelLoading || !editChannelName.trim()}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {editChannelLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editChannelLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7D. MODERN "DELETE CHANNEL" CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {channelToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setChannelToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete #{channelToDelete.name}?
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 leading-relaxed">
              Are you sure you want to permanently delete <strong>#{channelToDelete.name}</strong>? All conversation history, replies, reactions, and attachments in this channel will be permanently removed.
            </div>

            <div className="flex justify-end gap-2.5 pt-5 mt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setChannelToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteChannel(channelToDelete.id)}
                disabled={deleteChannelLoading}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteChannelLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{deleteChannelLoading ? 'Deleting...' : 'Delete Channel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. MODERN RICH EMOJI PICKER MODAL (Light Popover)
      ───────────────────────────────────────────────────────────── */}
      {activeEmojiPickerFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-2xs p-4 animate-in fade-in duration-150"
          onClick={() => setActiveEmojiPickerFor(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smile className="h-4 w-4 text-indigo-600" />
                <span className="font-bold text-sm text-slate-900">Add Emoji Reaction</span>
              </div>
              <button
                onClick={() => setActiveEmojiPickerFor(null)}
                className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 mt-3 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEmojiTab('popular')}
                className={`flex-1 py-1 rounded-lg text-center transition-colors ${
                  emojiTab === 'popular'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Popular
              </button>
              <button
                type="button"
                onClick={() => setEmojiTab('smileys')}
                className={`flex-1 py-1 rounded-lg text-center transition-colors ${
                  emojiTab === 'smileys'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Smileys
              </button>
              <button
                type="button"
                onClick={() => setEmojiTab('work')}
                className={`flex-1 py-1 rounded-lg text-center transition-colors ${
                  emojiTab === 'work'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Status
              </button>
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-5 gap-2 mt-4 max-h-48 overflow-y-auto p-1">
              {EMOJI_CATEGORIES[emojiTab].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    if (activeEmojiPickerFor.isDM) {
                      handleToggleDirectReaction(activeEmojiPickerFor.messageId, emoji);
                    } else {
                      handleToggleReaction(activeEmojiPickerFor.messageId, emoji);
                    }
                    setActiveEmojiPickerFor(null);
                  }}
                  className="flex items-center justify-center h-10 w-10 text-xl rounded-xl hover:bg-indigo-50 hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. MODERN IMAGE LIGHTBOX MODAL (Full Resolution View)
      ───────────────────────────────────────────────────────────── */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                <span className="font-bold text-sm text-slate-800">{activeLightboxImage.fileName}</span>
                {activeLightboxImage.fileSize && (
                  <span className="text-xs text-slate-400">
                    ({formatFileSize(activeLightboxImage.fileSize)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeLightboxImage.url}
                  download={activeLightboxImage.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Download image"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  onClick={() => setActiveLightboxImage(null)}
                  className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto bg-slate-950/5">
              <img
                src={activeLightboxImage.url}
                alt={activeLightboxImage.fileName}
                className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. PINNED MESSAGES DRAWER (Slack-Style Pinned Drawer)
      ───────────────────────────────────────────────────────────── */}
      {showPinnedDrawer && (
        <aside className="fixed inset-y-0 sm:top-12 sm:bottom-0 right-0 w-full sm:w-88 border-l border-slate-200/90 bg-white flex flex-col shrink-0 z-40 shadow-2xl animate-in slide-in-from-right-4 duration-200">
          <div className="h-14 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                <Pin className="h-4 w-4 fill-amber-500" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900">Pinned Messages</span>
                <p className="text-[11px] text-slate-500">
                  {activeRecipient ? `DM with ${activeRecipient.name}` : `#${activeChannel?.name}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPinnedDrawer(false)}
              className="p-1 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingPinned ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : pinnedMessages.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-3 border border-amber-200/60">
                  <Pin className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">No pinned items yet</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Pin important guidelines, announcements, or files so anyone in this space can easily find them later.
                </p>
              </div>
            ) : (
              pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-indigo-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={msg.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                        alt={msg.user.name}
                        className="h-6 w-6 rounded-lg border border-slate-200 object-cover"
                      />
                      <span className="text-xs font-bold text-slate-900">{msg.user.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {formatTimestamp(msg.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePinMessage(msg.id, !!activeRecipient)}
                      className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                      title="Unpin message"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {msg.content && (
                    <p className="text-xs text-slate-700 leading-relaxed mb-2 line-clamp-3">
                      {msg.content}
                    </p>
                  )}

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5">
                      <File className="h-3 w-3" />
                      <span>{msg.attachments.length} attachment(s)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>Pinned by {msg.pinnedBy?.name || 'team member'}</span>
                    <button
                      onClick={() => handleJumpToMessage(msg.id)}
                      className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Jump to message →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────
          11. ACTIVITY & NOTIFICATIONS DRAWER
      ───────────────────────────────────────────────────────────── */}
      {showNotificationDrawer && (
        <aside className="fixed inset-y-0 sm:top-12 sm:bottom-0 right-0 w-full sm:w-88 border-l border-slate-200/90 bg-white flex flex-col shrink-0 z-40 shadow-2xl animate-in slide-in-from-right-4 duration-200">
          <div className="h-14 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                <Bell className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm text-slate-900">Activity & Mentions</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotificationCount > 0 && (
                <button
                  onClick={handleMarkAllNotificationsAsRead}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="p-1 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 bg-white text-xs font-semibold">
            {(['all', 'unread', 'mentions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setNotificationTab(tab)}
                className={`flex-1 py-1 rounded-xl text-center capitalize transition-colors ${
                  notificationTab === tab
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 mb-3 border border-indigo-200/60">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">You're all caught up!</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  When someone mentions you, reacts to your post, or replies in a thread, it will appear here.
                </p>
              </div>
            ) : (
              notifications
                .filter((n) => {
                  if (notificationTab === 'unread') return !n.isRead;
                  if (notificationTab === 'mentions') return n.type === 'MENTION';
                  return true;
                })
                .map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      handleMarkNotificationAsRead(notif.id);
                      if (notif.messageId) {
                        handleJumpToMessage(notif.messageId, notif.channelId, notif.conversationId);
                      }
                    }}
                    className={`rounded-2xl border p-3 cursor-pointer transition-all ${
                      !notif.isRead
                        ? 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={notif.actor?.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                          alt={notif.actor?.name || 'User'}
                          className="h-6 w-6 rounded-lg border border-slate-200 object-cover shrink-0"
                        />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {notif.actor?.name}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            notif.type === 'MENTION'
                              ? 'bg-amber-100 text-amber-800'
                              : notif.type === 'REACTION'
                              ? 'bg-purple-100 text-purple-800'
                              : notif.type === 'DIRECT_MESSAGE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {notif.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                    )}
                  </div>
                ))
            )}
          </div>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────
          12. WORKSPACE FULL-TEXT SEARCH MODAL (Slack-Grade Multi-Tab)
      ───────────────────────────────────────────────────────────── */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-xs p-4 pt-16 animate-in fade-in duration-150"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Box */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="h-5 w-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all messages, files, channels, or people..."
                autoFocus
                className="w-full text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {isSearching && <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 bg-slate-50/70 text-xs font-semibold">
              {(['all', 'messages', 'files', 'channels', 'people'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSearchFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-colors flex items-center gap-1.5 ${
                    searchFilter === tab
                      ? 'bg-white text-indigo-700 font-bold border border-slate-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab}</span>
                  {searchResults && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      (
                      {tab === 'all'
                        ? searchResults.total
                        : tab === 'messages'
                        ? searchResults.messages.length
                        : tab === 'files'
                        ? searchResults.files.length
                        : tab === 'channels'
                        ? searchResults.channels.length
                        : searchResults.people.length}
                      )
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!searchQuery.trim() ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Type any keyword to search across the entire workspace.
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <span className="text-[10px] text-slate-400">Quick suggestions:</span>
                    <button
                      onClick={() => setSearchQuery('hello')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-[11px] text-indigo-600 font-medium"
                    >
                      hello
                    </button>
                    <button
                      onClick={() => setSearchQuery('general')}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-[11px] text-indigo-600 font-medium"
                    >
                      general
                    </button>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : !searchResults || searchResults.total === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No matching results found for "{searchQuery}". Try different keywords.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Matching Messages */}
                  {(searchFilter === 'all' || searchFilter === 'messages') &&
                    searchResults.messages.length > 0 && (
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 mb-2">
                          Messages ({searchResults.messages.length})
                        </div>
                        <div className="space-y-2">
                          {searchResults.messages.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                handleJumpToMessage(
                                  m.id,
                                  m.contextType === 'channel' ? m.channel?.id : null,
                                  m.contextType === 'direct' ? m.conversationId : null,
                                );
                              }}
                              className="rounded-2xl border border-slate-200/90 bg-white p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                    alt={m.user.name}
                                    className="h-5 w-5 rounded-md border border-slate-200 object-cover"
                                  />
                                  <span className="font-bold text-xs text-slate-900">{m.user.name}</span>
                                  <span className="text-[10px] text-slate-400">
                                    in {m.contextType === 'channel' ? `#${m.channel?.name}` : 'Direct Messages'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {formatTimestamp(m.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                                {m.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Matching Files */}
                  {(searchFilter === 'all' || searchFilter === 'files') &&
                    searchResults.files.length > 0 && (
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 mb-2">
                          Files & Media ({searchResults.files.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.files.map((f) => (
                            <div
                              key={f.id}
                              onClick={() => {
                                if (f.fileType.startsWith('image/')) {
                                  setActiveLightboxImage({
                                    url: f.fileUrl,
                                    fileName: f.fileName,
                                    fileSize: f.fileSize,
                                  });
                                } else {
                                  window.open(f.fileUrl, '_blank');
                                }
                                setShowSearchModal(false);
                              }}
                              className="rounded-2xl border border-slate-200 bg-white p-3 hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-3 shadow-2xs"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                {f.fileType.startsWith('image/') ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-slate-900 truncate">{f.fileName}</p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {formatFileSize(f.fileSize)} • shared by{' '}
                                  {f.message?.user?.name || f.directMessage?.user?.name || 'team'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Matching Channels */}
                  {(searchFilter === 'all' || searchFilter === 'channels') &&
                    searchResults.channels.length > 0 && (
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 mb-2">
                          Channels ({searchResults.channels.length})
                        </div>
                        <div className="space-y-1.5">
                          {searchResults.channels.map((ch) => (
                            <button
                              key={ch.id}
                              onClick={() => {
                                setActiveChannel(ch);
                                setActiveRecipient(null);
                                setActiveConversation(null);
                                setShowSearchModal(false);
                              }}
                              className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors shadow-2xs"
                            >
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-indigo-600" />
                                <span className="font-bold text-xs text-slate-900">#{ch.name}</span>
                                {ch.topic && (
                                  <span className="text-[11px] text-slate-500 font-normal truncate max-w-xs">
                                    — {ch.topic}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {ch._count?.messages || 0} messages
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Matching People */}
                  {(searchFilter === 'all' || searchFilter === 'people') &&
                    searchResults.people.length > 0 && (
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 mb-2">
                          People ({searchResults.people.length})
                        </div>
                        <div className="space-y-1.5">
                          {searchResults.people.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                handleSelectDirectMessage(p);
                                setShowSearchModal(false);
                              }}
                              className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="relative">
                                  <img
                                    src={p.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                                    alt={p.name}
                                    className="h-7 w-7 rounded-lg border border-slate-200 object-cover"
                                  />
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-white ${
                                      p.presence === 'BUSY'
                                        ? 'bg-rose-500'
                                        : p.presence === 'AWAY'
                                        ? 'bg-amber-400'
                                        : p.presence === 'ONLINE'
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-400'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-slate-900">{p.name}</span>
                                  <span className="text-[10px] text-slate-400 ml-2">{p.email}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200/60">
                                Message
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CALENDAR & SCHEDULE MODAL
      ───────────────────────────────────────────────────────────── */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Calendar & Meetings</h3>
                  <p className="text-xs text-slate-500">Google Calendar & Microsoft 365 Synced</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Today's Schedule</h4>
                  <p className="text-xs text-slate-400">All meetings are automatically synced across workspace channels</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  Today
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 shadow-2xs">
                      <span className="text-[10px] text-indigo-600 uppercase">10:00</span>
                      <span className="text-xs">AM</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Engineering Daily Standup
                      </h5>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>#general • Voice Huddle</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalendarModal(false);
                      handleSwitchAppTab('chat');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    Join
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 shadow-2xs">
                      <span className="text-[10px] text-indigo-600 uppercase">02:00</span>
                      <span className="text-xs">PM</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Sprint Review & Architecture Demo
                      </h5>
                      <p className="text-[11px] text-slate-400">Google Meet integration • 45 mins</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Upcoming
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 shadow-2xs">
                      <span className="text-[10px] text-indigo-600 uppercase">04:30</span>
                      <span className="text-xs">PM</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Client Mail & Chat Feedback Session
                      </h5>
                      <p className="text-[11px] text-slate-400">Synced from user Outlook account</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Upcoming
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60 text-xs">
              <span className="text-slate-500 text-[11px]">Calendar syncs automatically with OAuth accounts</span>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INVITE TEAMMATES MODAL (Slack-fidelity Add Member Dialog)
      ───────────────────────────────────────────────────────────── */}
      {showInviteModal && canInviteMembers(currentUserRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Add teammates to {currentWs?.name || 'Workspace'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Invite colleagues and assign them project and workspace roles
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Alert Feedback */}
              {inviteSuccessMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{inviteSuccessMessage}</div>
                </div>
              )}

              {inviteErrorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{inviteErrorMessage}</div>
                </div>
              )}

              {/* Method 1: Direct Email Invitation */}
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Invite by Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    If they already have an account, they are added to this workspace immediately.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assign Role & Authority
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs"
                  >
                    {getAllowedInviteRoles(currentUserRole).map((r) => {
                      const cfg = ROLE_CONFIGS[r];
                      return (
                        <option key={r} value={r}>
                          {cfg.label} ({r}) - {cfg.description}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {ROLE_CONFIGS[inviteRole]?.description}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Adding teammate...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Add to Workspace</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Or share an invite link
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Method 2: Shareable 1-Click Link & Code */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1-Click Join Link
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 truncate font-mono">
                      <LinkIcon className="h-3.5 w-3.5 text-slate-400 mr-2 shrink-0" />
                      <span className="truncate">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/workspaces?join=${currentWs?.joinCode}`
                          : `/workspaces?join=${currentWs?.joinCode}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyInviteLink}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors shadow-2xs"
                    >
                      {copiedInviteLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Join Code Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Workspace Invite Code
                    </span>
                    <span className="font-mono text-sm font-bold text-indigo-700">
                      {currentWs?.joinCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Invited members get instant access to all public channels
              </span>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          KICK / REMOVE MEMBER CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                  <UserMinus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Remove from workspace</h3>
                  <p className="text-xs text-slate-500">Confirm member removal</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-900">{memberToRemove.user.name}</strong> ({memberToRemove.user.email}) from <strong className="text-slate-900">{currentWs?.name}</strong>?
              </p>

              <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>They will immediately lose access to all channels, direct messages, and shared files in this workspace.</span>
              </div>

              {removeMemberError && (
                <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{removeMemberError}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={removeMemberLoading}
                  onClick={() => setMemberToRemove(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removeMemberLoading}
                  onClick={handleConfirmRemoveMember}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {removeMemberLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <UserMinus className="h-3.5 w-3.5" />
                      <span>Remove Member</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INCOMING WORKSPACE / DM MESSAGE NOTIFICATION TOAST
      ───────────────────────────────────────────────────────────── */}
      {messageToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-88 animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            onClick={() => {
              if (messageToast.type === 'channel' && messageToast.channel) {
                setShowMobileSidebar(false);
                setActiveChannel(messageToast.channel);
                setActiveRecipient(null);
                setActiveConversation(null);
                setActiveThreadParent(null);
                setUnreadChannels((prev) => ({ ...prev, [messageToast.channel!.id]: 0 }));
              } else if (messageToast.type === 'dm' && messageToast.senderUser) {
                handleSelectDirectMessage(messageToast.senderUser);
                setUnreadDirectMessages((prev) => ({ ...prev, [messageToast.senderUser!.id]: 0 }));
              }
              setMessageToast(null);
            }}
            className="cursor-pointer group flex items-start gap-3 p-3 rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-indigo-200/90 hover:border-indigo-400 transition-all hover:scale-[1.01]"
          >
            <div className="relative shrink-0">
              <img
                src={messageToast.senderAvatar || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                alt={messageToast.senderName}
                className="h-9 w-9 rounded-xl border border-slate-200 object-cover shadow-2xs"
              />
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                {messageToast.type === 'channel' ? '#' : '@'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {messageToast.chatTitle}
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold group-hover:underline">
                  View →
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                <span className="font-semibold text-slate-800">{messageToast.senderName}:</span>{' '}
                {messageToast.content}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMessageToast(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-lg transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CALL NOTIFICATION TOAST
      ───────────────────────────────────────────────────────────── */}
      {callNotificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span>{callNotificationMsg}</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INCOMING CALL MODAL
      ───────────────────────────────────────────────────────────── */}
      {callStatus === 'incoming' && incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center text-center mx-4">
            {/* Animated ringing avatar */}
            <div className="relative my-4">
              <div className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute -inset-6 rounded-full bg-indigo-500/10 animate-pulse" />
              <img
                src={incomingCall.from.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                alt={incomingCall.from.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-slate-700 relative z-10 shadow-xl"
              />
              <div className="absolute bottom-0 right-0 z-20 h-7 w-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-md">
                {incomingCall.isVideo ? (
                  <Video className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Phone className="h-3.5 w-3.5 text-white" />
                )}
              </div>
            </div>

            <h3 className="font-bold text-lg text-white mt-1">{incomingCall.from.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Incoming {incomingCall.isVideo ? 'Video' : 'Audio'} Call...
            </p>
            <p className="text-[10px] text-slate-500 mt-2 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
              {incomingCall.isVideo ? 'Microphone & Camera (or Mic only if no camera)' : 'Microphone permission required'}
            </p>

            {/* Answer / Decline buttons */}
            <div className="mt-8 flex items-center gap-4 w-full">
              <button
                type="button"
                onClick={handleDeclineCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-102 active:scale-98"
              >
                <PhoneOff className="h-4 w-4" />
                <span>Decline</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/40 transition-all hover:scale-102 active:scale-98 animate-pulse"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE / OUTGOING CALL OVERLAY (True Edge-to-Edge Full Screen)
      ───────────────────────────────────────────────────────────── */}
      {(callStatus === 'calling' || callStatus === 'connected') && callPeer && (
        <div
          ref={callOverlayContainerRef}
          className="fixed inset-0 z-50 flex flex-col w-screen h-[100dvh] bg-slate-950 text-white overflow-hidden animate-in fade-in duration-200"
        >
          {/* Call Notification Toast Banner */}
          {callNotificationMsg && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-[90%] px-4 py-2 rounded-xl bg-slate-800/95 border border-amber-500/50 text-amber-300 text-xs font-medium shadow-2xl flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
              <span>{callNotificationMsg}</span>
            </div>
          )}

          {/* Call Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <img
                src={callPeer.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                alt={callPeer.name}
                className="h-10 w-10 rounded-xl object-cover border border-slate-700 shadow-sm"
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">{callPeer.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {callStatus === 'connected' ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {formatCallDuration(callDuration)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      Calling...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active Screen Sharing Badge */}
              {(isScreenSharing || isPeerScreenSharing) && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-500/60 text-indigo-300 flex items-center gap-1.5 animate-pulse shadow-sm shadow-indigo-500/20">
                  <MonitorUp className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {isScreenSharing ? 'You are Sharing Screen' : `${callPeer?.name || 'Teammate'} is Sharing Screen`}
                  </span>
                </span>
              )}

              {/* Active Recording Indicator Badge */}
              {isRecording && (
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 border border-rose-500/60 text-rose-400 flex items-center gap-1.5 animate-pulse shadow-sm shadow-rose-500/30">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>REC {formatCallDuration(recordingDuration)}</span>
                </span>
              )}
              {isPeerRecording && !isRecording && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 border border-rose-500/60 text-rose-400 flex items-center gap-1.5 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="hidden sm:inline">Recording in progress</span>
                </span>
              )}

              {/* Fullscreen API Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    if (callOverlayContainerRef.current?.requestFullscreen) {
                      callOverlayContainerRef.current.requestFullscreen().catch(() => {});
                    }
                    setIsCallFullscreen(true);
                  } else {
                    if (document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                    }
                    setIsCallFullscreen(false);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                title={isCallFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isCallFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isCallFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
              </button>

              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                {callType === 'video' ? (
                  <>
                    <Video className="h-3 w-3 text-indigo-400" />
                    <span className="hidden sm:inline">Video Call</span>
                  </>
                ) : (
                  <>
                    <Phone className="h-3 w-3 text-emerald-400" />
                    <span className="hidden sm:inline">Audio Call</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Media / Video Center Stage (Takes 100% of available viewport) */}
          <div className="relative bg-slate-950 flex-1 w-full h-full flex items-center justify-center overflow-hidden">
            {callType === 'video' ? (
              <>
                {/* Remote video stream - always object-contain for screen sharing so 100% of screen is visible */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onPlaying={() => setHasRemoteVideo(true)}
                  onLoadedData={() => setHasRemoteVideo(true)}
                  className={`w-full h-full bg-slate-950 transition-all ${
                    isScreenSharing || isPeerScreenSharing || screenFitMode === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                />

                {/* Picture-in-Picture Recovery Overlay Banner */}
                {isPiPActive && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 text-center">
                    <div className="p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 mb-3 text-indigo-400">
                      <PictureInPicture className="h-10 w-10 animate-pulse" />
                    </div>
                    <h3 className="text-white font-bold text-base sm:text-lg">This video is playing in Picture-in-Picture mode</h3>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm">
                      The video stream is floating outside. Click the button below to bring it right back into this screen!
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (document.pictureInPictureElement) {
                            await document.exitPictureInPicture();
                          }
                        } catch (e) {}
                        setIsPiPActive(false);
                      }}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 transition-all flex items-center gap-2 active:scale-95"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span>Return Video to Screen</span>
                    </button>
                  </div>
                )}

                {/* Top Video Action Controls (Fit/Fill + PiP) */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  {/* PiP Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (remoteVideoRef.current) {
                          if (document.pictureInPictureElement) {
                            await document.exitPictureInPicture();
                            setIsPiPActive(false);
                          } else {
                            await remoteVideoRef.current.requestPictureInPicture();
                            setIsPiPActive(true);
                          }
                        }
                      } catch (e) {
                        console.warn('PiP error:', e);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium flex items-center gap-1.5 border border-slate-700/80 backdrop-blur-xs transition-colors shadow-md"
                    title="Toggle Picture in Picture"
                  >
                    <PictureInPicture className="h-3 w-3" />
                    <span>PiP</span>
                  </button>

                  {/* Fit / Fill toggle button */}
                  <button
                    type="button"
                    onClick={() => setScreenFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                    className={`px-2.5 py-1.5 rounded-xl text-white text-[11px] font-medium flex items-center gap-1.5 border backdrop-blur-xs transition-colors shadow-md ${
                      screenFitMode === 'contain'
                        ? 'bg-indigo-600/70 border-indigo-500/80 hover:bg-indigo-600/90 text-white'
                        : 'bg-black/60 hover:bg-black/80 border-slate-700/80 text-slate-300'
                    }`}
                    title={screenFitMode === 'contain' ? 'Currently: Fit (100% Entire Screen) - Click to zoom/fill' : 'Currently: Fill (Zoomed/Cropped) - Click to fit entire screen'}
                  >
                    {screenFitMode === 'contain' ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                    <span>{screenFitMode === 'contain' ? 'Fit (100% Screen)' : 'Fill (Zoomed)'}</span>
                  </button>
                </div>

                {/* Ringing placeholder while waiting for answer */}
                {callStatus === 'calling' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs">
                    <div className="relative">
                      <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-ping" />
                      <img
                        src={callPeer.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                        alt={callPeer.name}
                        className="h-28 w-28 rounded-full object-cover border-4 border-slate-700 shadow-xl"
                      />
                    </div>
                    <h4 className="mt-4 font-bold text-lg text-white">{callPeer.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">Ringing teammate...</p>
                  </div>
                )}

                {/* Remote Peer Without Video / Camera Off Fallback */}
                {callStatus === 'connected' && (!hasRemoteVideo || (!isPeerScreenSharing && !isPeerVideoEnabled)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xs z-10">
                    <div className="relative">
                      <div className="absolute -inset-4 rounded-full bg-indigo-500/10 animate-pulse" />
                      <img
                        src={callPeer.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                        alt={callPeer.name}
                        className="h-28 w-28 rounded-full object-cover border-4 border-slate-700 shadow-xl"
                      />
                    </div>
                    <h4 className="mt-4 font-bold text-lg text-white">{callPeer.name}</h4>
                    <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium">
                      <Mic className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Connected (Microphone only)</span>
                    </div>
                  </div>
                )}

                {/* Local video PiP (bottom right) with minimize toggle to unblock shared screen */}
                <div
                  className={`absolute bottom-6 right-6 z-20 rounded-2xl overflow-hidden border-2 border-indigo-500/80 shadow-2xl bg-slate-900 group transition-all duration-200 ${
                    isLocalPipMinimized
                      ? 'w-10 h-10 flex items-center justify-center p-0 bg-slate-900/90 border-slate-700 hover:border-indigo-400'
                      : 'w-32 h-24 sm:w-48 sm:h-36'
                  }`}
                >
                  {isLocalPipMinimized ? (
                    <button
                      type="button"
                      onClick={() => setIsLocalPipMinimized(false)}
                      className="w-full h-full flex flex-col items-center justify-center text-indigo-400 hover:text-white"
                      title="Restore local camera preview"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isVideoMuted ? 'opacity-0' : 'opacity-100'}`}
                      />
                      {isVideoMuted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs font-semibold text-center p-2">
                          <VideoOff className="h-5 w-5 mb-1 text-slate-500" />
                          <span>{!hasLocalCamera ? 'No Camera' : 'Camera Off'}</span>
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsLocalPipMinimized(true)}
                          className="p-1 rounded-lg bg-black/70 hover:bg-black text-white text-[10px]"
                          title="Minimize preview (unblock shared screen)"
                        >
                          <Minimize2 className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                        You
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Audio Call Central Stage */
              <div className="py-16 flex flex-col items-center justify-center">
                <div className="relative">
                  {callStatus === 'connected' && (
                    <>
                      <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping" />
                      <div className="absolute -inset-8 rounded-full bg-indigo-500/10 animate-pulse" />
                    </>
                  )}
                  {callStatus === 'calling' && (
                    <div className="absolute -inset-4 rounded-full bg-amber-500/20 animate-ping" />
                  )}
                  <img
                    src={callPeer.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                    alt={callPeer.name}
                    className="h-32 w-32 rounded-full object-cover border-4 border-slate-700 shadow-2xl relative z-10"
                  />
                </div>
                <h4 className="mt-5 font-bold text-xl text-white">{callPeer.name}</h4>
                <p className="text-sm text-slate-400 mt-1">
                  {callStatus === 'calling' ? 'Ringing teammate...' : `Audio Connected • ${formatCallDuration(callDuration)}`}
                </p>
              </div>
            )}
          </div>

          {/* Call Control Toolbar (Docked at Bottom Edge) */}
          <div className="p-3 sm:p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-center gap-2 sm:gap-3 shrink-0 flex-wrap backdrop-blur-md">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-md ${
                isMicMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
              }`}
              title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Camera Toggle */}
            <button
              type="button"
              onClick={toggleCamera}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-md ${
                isVideoMuted || !hasLocalCamera
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
              }`}
              title={!hasLocalCamera ? 'No camera detected (click to retry/enable camera)' : isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted || !hasLocalCamera ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>

            {/* Mobile Camera Flip Button (Front / Back camera) */}
            {callType === 'video' && hasLocalCamera && (
              <button
                type="button"
                onClick={flipCamera}
                className="p-3 sm:p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all shadow-md"
                title={`Flip Camera (Currently: ${facingMode === 'user' ? 'Front' : 'Back'})`}
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            )}

            {/* Screen Share */}
            <button
              type="button"
              onClick={toggleScreenShare}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-md ${
                isScreenSharing
                  ? 'bg-indigo-600 text-white animate-pulse shadow-indigo-600/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
              }`}
              title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
            >
              <MonitorUp className="h-5 w-5" />
            </button>

            {/* Speaker / Audio Output Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  loadAudioOutputDevices();
                  setShowSpeakerMenu((prev) => !prev);
                }}
                className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-md ${
                  showSpeakerMenu
                    ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
                }`}
                title="Change Speaker / Audio Output"
              >
                <Volume2 className="h-5 w-5" />
              </button>

              {/* Speaker selection menu popover */}
              {showSpeakerMenu && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2 shadow-2xl backdrop-blur-md z-50 text-white animate-in fade-in slide-in-from-bottom-2">
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                      Audio Output
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSpeakerMenu(false)}
                      className="text-slate-400 hover:text-white text-xs p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="py-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {audioOutputDevices.length > 0 ? (
                      audioOutputDevices.map((dev, idx) => (
                        <button
                          key={dev.deviceId || idx}
                          type="button"
                          onClick={() => switchAudioOutput(dev.deviceId, dev.label || `Speaker ${idx + 1}`)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                            selectedAudioOutput === dev.deviceId
                              ? 'bg-indigo-600/30 text-indigo-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate pr-2">
                            {dev.label || (idx === 0 ? 'Default Device' : `Speaker ${idx + 1}`)}
                          </span>
                          {selectedAudioOutput === dev.deviceId && (
                            <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          )}
                        </button>
                      ))
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => switchAudioOutput('default', 'Loudspeaker / Default')}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs bg-indigo-600/30 text-indigo-300 font-semibold"
                        >
                          <span>Loudspeaker / Default</span>
                          <Check className="h-3.5 w-3.5 text-indigo-400" />
                        </button>
                        <p className="px-3 py-1.5 text-[10px] text-slate-400 leading-tight">
                          On mobile devices, you can also switch audio via phone volume controls or Bluetooth / AirPlay quick menu.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Add People / Escalate to Group Meeting */}
            {callStatus === 'connected' && (
              <button
                type="button"
                onClick={() => {
                  // Escalate 1-on-1 to a group meeting room
                  const groupMeetingId = `dm-${user?.id}-${callPeer?.id}-${Date.now()}`;
                  // Invite the peer to join the group meeting
                  if (callPeer?.id) {
                    getSocket().emit('call_user', {
                      toUserId: callPeer.id,
                      caller: { id: user?.id, name: user?.name, avatarUrl: user?.avatarUrl },
                      isVideo: callType === 'video',
                      meetingId: groupMeetingId,
                    });
                  }
                  setActiveTeamMeeting({
                    id: groupMeetingId,
                    workspaceId: workspaceId || '',
                    title: `Call with ${callPeer?.name}`,
                    scheduledAt: new Date().toISOString(),
                    duration: 60,
                    hostId: user?.id || '',
                    status: 'LIVE' as const,
                    createdAt: new Date().toISOString(),
                    host: { id: user?.id || '', name: user?.name || '', email: user?.email || '' },
                    participants: [],
                  });
                  // End the 1-on-1 call — they will join the group meeting
                  cleanupCall(false);
                }}
                className="p-3 sm:p-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md shadow-violet-600/30 flex items-center gap-1.5"
                title="Add people — Upgrade to Group Meeting"
              >
                <UserPlus className="h-5 w-5" />
                <span className="hidden md:inline text-xs font-bold">Add People</span>
              </button>
            )}

            {/* Record Call Button (Audio & Video) */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 sm:p-3.5 rounded-2xl transition-all shadow-md ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-600/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
              }`}
              title={isRecording ? 'Stop Recording' : 'Record Call (Audio & Video)'}
            >
              {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Disc className="h-5 w-5 text-rose-400" />}
            </button>


            {/* End Call Button */}
            <button
              type="button"
              onClick={() => cleanupCall(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-102 active:scale-98 ml-1 sm:ml-2"
            >
              <PhoneOff className="h-5 w-5" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MULTI-PARTY TEAM GROUP MEETING OVERLAY (Zoom/Teams style for 3-16+ people)
      ───────────────────────────────────────────────────────────── */}
      {activeTeamMeeting && user && (
        <GroupMeetingOverlay
          meetingId={activeTeamMeeting.id}
          meetingTitle={activeTeamMeeting.title}
          channelName={activeTeamMeeting.channel?.name || activeChannel?.name}
          workspaceId={workspaceId}
          user={user}
          userRole={currentUserRole || 'MEMBER'}
          socket={getSocket()}
          members={members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
            role: m.role,
          }))}
          onLeaveMeeting={() => {
            setActiveTeamMeeting(null);
            if (typeof window !== 'undefined' && window.location.search.includes('meeting=')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          CALL INTERRUPTED RECOVERY BANNER
      ───────────────────────────────────────────────────────────── */}
      {interruptedCall && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto bg-slate-900 border border-indigo-500/60 shadow-2xl rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 text-white animate-in slide-in-from-top duration-300 backdrop-blur-md">
          <div className="relative shrink-0">
            <img
              src={interruptedCall.peerAvatar || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
              alt={interruptedCall.peerName}
              className="h-10 w-10 rounded-full border border-indigo-400 object-cover"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center">
              <AlertCircle className="h-2 w-2 text-white" />
            </span>
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs font-bold text-white truncate">
              Call Interrupted by Reload
            </p>
            <p className="text-[11px] text-slate-300 truncate">
              Call with <span className="font-semibold text-indigo-300">{interruptedCall.peerName}</span> ended unexpectedly.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResumeInterruptedCall}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Re-call</span>
            </button>
            <button
              type="button"
              onClick={() => setInterruptedCall(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CALL RECORDING READY MODAL
      ───────────────────────────────────────────────────────────── */}
      {completedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-white flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40">
                  <Disc className="h-6 w-6 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Call Recording Ready</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {completedRecording.isVideo ? 'Video & Audio Call Recording' : 'Voice Call Audio Recording'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRecordingModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Embedded Live Player Preview */}
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center max-h-64">
              {completedRecording.isVideo ? (
                <video
                  src={completedRecording.url}
                  controls
                  playsInline
                  className="w-full max-h-64 object-contain bg-black"
                />
              ) : (
                <div className="py-8 px-4 w-full flex flex-col items-center justify-center gap-3">
                  <div className="p-4 rounded-full bg-indigo-600/20 border border-indigo-500/30">
                    <Volume2 className="h-8 w-8 text-indigo-400" />
                  </div>
                  <audio src={completedRecording.url} controls className="w-full max-w-md mt-2" />
                </div>
              )}
            </div>

            {/* Recording Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">File Name</span>
                <span className="font-mono text-slate-200 truncate block mt-0.5" title={completedRecording.fileName}>
                  {completedRecording.fileName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Size & Length</span>
                <span className="text-slate-200 block mt-0.5">
                  {completedRecording.sizeFormatted} • {formatCallDuration(completedRecording.duration)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                File saved to your browser's default <b>Downloads</b> folder.
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={downloadRecordingManually}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Download className="h-4 w-4" />
                <span>Download Again</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await shareRecordingToChat();
                  closeRecordingModal();
                }}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Share2 className="h-4 w-4 text-indigo-400" />
                <span>Share in Chat</span>
              </button>

              <button
                  type="button"
                  onClick={closeRecordingModal}
                  className="py-2.5 px-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors text-center"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CONNECT EMAIL VIA OAUTH MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* CONNECT EMAIL VIA OAUTH OR CUSTOM IMAP/SMTP MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showConnectMailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connect Mailbox</h3>
                  <p className="text-xs text-slate-500">Google Workspace or Company IMAP/SMTP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConnectMailModal(false);
                  setCustomMailError(null);
                  setNewGroupChannelName('');
                  setGroupMemberSearch('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mailbox Scope Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              {canManageGroupMail ? (
                <button
                  type="button"
                  onClick={() => {
                    setConnectMailMode('group');
                    if (!connectMailChannelId || connectMailChannelId === '__new__') {
                      if (channels.length > 0) {
                        handleSelectChannelForGroupMail(channels[0].id);
                      } else {
                        handleSwitchToNewGroup();
                      }
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    connectMailMode === 'group'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Group / Channel Inbox</span>
                </button>
              ) : (
                <div
                  className="py-2 px-3 rounded-xl text-xs font-bold text-slate-400 opacity-60 flex items-center justify-center gap-1.5 cursor-not-allowed select-none bg-slate-50/60"
                  title="Only Workspace Admins and Owners can configure Group Inboxes"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Group Inbox (Admin Only)</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setConnectMailMode('personal')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  connectMailMode === 'personal' || !canManageGroupMail
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Personal Inbox</span>
              </button>
            </div>

            {connectMailMode === 'group' && canManageGroupMail ? (
              <div className="space-y-3.5 bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl">
                {/* Switch between Existing Channel or New Group */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                    {groupAssignMode === 'existing' ? 'Link Existing Group / Channel' : 'Create New Group / Channel'}
                  </span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-200">
                    <button
                      type="button"
                      onClick={handleSwitchToExistingGroup}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        groupAssignMode === 'existing'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Existing Group
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToNewGroup}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        groupAssignMode === 'new'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      + Create New Group
                    </button>
                  </div>
                </div>

                {groupAssignMode === 'existing' ? (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-indigo-950 uppercase tracking-wider">
                      Select Channel / Group
                    </label>
                    <select
                      value={connectMailChannelId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__new__') {
                          handleSwitchToNewGroup();
                        } else {
                          handleSelectChannelForGroupMail(val);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">-- Choose Channel / Group --</option>
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name} {ch.isPrivate ? '(Private)' : '(Public)'}
                        </option>
                      ))}
                      <option value="__new__">+ ✨ Create New Group / Channel...</option>
                    </select>

                    {isLoadingChannelMembers && (
                      <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading current group members...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-950 uppercase tracking-wider mb-1">
                        New Group / Channel Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">#</span>
                        <input
                          type="text"
                          value={newGroupChannelName}
                          onChange={(e) => setNewGroupChannelName(e.target.value)}
                          placeholder="e.g. support, billing, engineering"
                          className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newGroupIsPrivate}
                        onChange={(e) => setNewGroupIsPrivate(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        Private Group (Restricted to selected members)
                      </span>
                    </label>
                  </div>
                )}

                {/* Workspace Members Selection List */}
                <div className="pt-2 border-t border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                        Select Group Members
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {groupSelectedMemberIds.length} of {members.length} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = members.map((m) => m.user?.id).filter(Boolean) as string[];
                          setGroupSelectedMemberIds(allIds);
                        }}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setGroupSelectedMemberIds(user?.id ? [user.id] : []);
                        }}
                        className="font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search Workspace Members */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={groupMemberSearch}
                      onChange={(e) => setGroupMemberSearch(e.target.value)}
                      placeholder="Search workspace members by name or email..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-indigo-200/80 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Scrollable Members List */}
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-indigo-100 bg-white divide-y divide-slate-100">
                    {filteredGroupMembers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No workspace members found matching &quot;{groupMemberSearch}&quot;
                      </div>
                    ) : (
                      filteredGroupMembers.map((m) => {
                        const isChecked = groupSelectedMemberIds.includes(m.user?.id);
                        const isSelf = m.user?.id === user?.id;

                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (isSelf) return;
                              setGroupSelectedMemberIds((prev) =>
                                isChecked ? prev.filter((id) => id !== m.user?.id) : [...prev, m.user?.id]
                              );
                            }}
                            className={`flex items-center justify-between p-2 hover:bg-indigo-50/60 transition-colors cursor-pointer ${
                              isChecked ? 'bg-indigo-50/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSelf}
                                onChange={() => {
                                  if (isSelf) return;
                                  setGroupSelectedMemberIds((prev) =>
                                    isChecked ? prev.filter((id) => id !== m.user?.id) : [...prev, m.user?.id]
                                  );
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                              />
                              {m.user?.avatarUrl ? (
                                <img
                                  src={m.user.avatarUrl}
                                  alt={m.user.name}
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {(m.user?.name || 'U').slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-slate-800 truncate">
                                    {m.user?.name || 'Unknown User'}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {m.user?.email || ''}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                m.role === 'OWNER'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : m.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {m.role}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Explanatory Info Box */}
                <div className="text-[11px] text-indigo-800 space-y-1 pt-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <span>👑</span>
                    <span>Admin Master Access: Workspace Admins & Owners have full access to all group inboxes.</span>
                  </p>
                  <p className="text-[10px] text-indigo-600">
                    Selected members can read, reply on behalf, and mark group emails as Done. Non-members cannot access.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-600">
                Personal inboxes are private and only visible to and managed by you.
              </div>
            )}

            {/* Provider Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setConnectEmailProvider('GOOGLE');
                  setCustomMailError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  connectEmailProvider === 'GOOGLE'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Google / Workspace</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnectEmailProvider('CUSTOM');
                  setCustomMailError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  connectEmailProvider === 'CUSTOM'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Company IMAP / SMTP</span>
              </button>
            </div>

            {/* TAB 1: GOOGLE / GOOGLE WORKSPACE */}
            {connectEmailProvider === 'GOOGLE' && (
              <div className="space-y-4 pt-1">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                  <p className="font-bold mb-1">Google Workspace & Gmail OAuth 2.0</p>
                  <p className="text-slate-600 text-[11px]">
                    Connect your business or personal Google account. Live sync lets you read, reply, and compose messages securely through Google&apos;s API.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    let effectiveCid = connectMailChannelId;
                    if (connectMailMode === 'group') {
                      const cid = await prepareGroupChannel();
                      if (!cid) return;
                      effectiveCid = cid;
                    }
                    handleConnectEmail('GOOGLE', undefined, effectiveCid);
                  }}
                  className="w-full py-3 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-xs group cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
                  <span>Authorize with Google</span>
                </button>

                {/* Direct Mailbox Option for Testing / Rapid Deployment */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Or Connect Direct Team Address
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={connectEmailInput}
                      onChange={(e) => setConnectEmailInput(e.target.value)}
                      placeholder={connectMailMode === 'group' ? 'support@company.com' : 'you@company.com'}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!connectEmailInput.trim() || !connectEmailInput.includes('@')) {
                          alert('Please enter a valid email address.');
                          return;
                        }
                        let effectiveCid = connectMailChannelId;
                        if (connectMailMode === 'group') {
                          const cid = await prepareGroupChannel();
                          if (!cid) return;
                          effectiveCid = cid;
                        }
                        handleConnectEmail('CUSTOM', connectEmailInput.trim(), effectiveCid);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM COMPANY IMAP / SMTP */}
            {connectEmailProvider === 'CUSTOM' && (
              <form onSubmit={handleConnectCustomEmail} className="space-y-3 pt-1">
                {customMailError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{customMailError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={customMailConfig.emailAddress}
                      onChange={(e) =>
                        setCustomMailConfig((prev) => ({
                          ...prev,
                          emailAddress: e.target.value,
                          imapHost: prev.imapHost || (e.target.value.includes('@') ? `mail.${e.target.value.split('@')[1]}` : ''),
                          smtpHost: prev.smtpHost || (e.target.value.includes('@') ? `mail.${e.target.value.split('@')[1]}` : ''),
                        }))
                      }
                      placeholder="you@company.com"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={customMailConfig.displayName}
                      onChange={(e) => setCustomMailConfig((prev) => ({ ...prev, displayName: e.target.value }))}
                      placeholder="e.g. Alex Miller"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mailbox Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={customMailConfig.imapPassword}
                      onChange={(e) =>
                        setCustomMailConfig((prev) => ({
                          ...prev,
                          imapPassword: e.target.value,
                          smtpPassword: e.target.value,
                        }))
                      }
                      placeholder="Account or App Password"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Login Username <span className="text-slate-400 font-normal">(Optional — if different from email)</span>
                    </label>
                    <input
                      type="text"
                      value={customMailConfig.imapUser}
                      onChange={(e) =>
                        setCustomMailConfig((prev) => ({
                          ...prev,
                          imapUser: e.target.value,
                          smtpUser: e.target.value,
                        }))
                      }
                      placeholder="e.g. ayush.zala (leave empty to use full email address)"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      If your mail server requires a username like <span className="font-mono text-slate-600">ayush.zala</span> instead of full email, enter it here.
                    </p>
                  </div>
                </div>

                {/* Advanced Server Settings Toggle */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedServerSettings((prev) => !prev)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 text-slate-600 transition-all text-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      <span className="font-semibold text-slate-700 group-hover:text-indigo-600">
                        Advanced Server Settings (IMAP & SMTP)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{showAdvancedServerSettings ? 'Hide' : 'Configure Custom Ports'}</span>
                      {showAdvancedServerSettings ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                      )}
                    </div>
                  </button>

                  {!showAdvancedServerSettings && customMailConfig.emailAddress.includes('@') && (
                    <p className="text-[10px] text-slate-400 mt-1 px-1">
                      Auto-configured: <span className="font-mono text-slate-600">{customMailConfig.imapHost || `mail.${customMailConfig.emailAddress.split('@')[1]}`}</span> (SSL Ports 993 & 465)
                    </p>
                  )}
                </div>

                {showAdvancedServerSettings && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    {/* IMAP Server Settings */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                        Incoming Mail Server (IMAP)
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            IMAP Host
                          </label>
                          <input
                            type="text"
                            value={customMailConfig.imapHost}
                            onChange={(e) => setCustomMailConfig((prev) => ({ ...prev, imapHost: e.target.value }))}
                            placeholder="mail.company.com"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Port
                          </label>
                          <input
                            type="number"
                            value={customMailConfig.imapPort}
                            onChange={(e) => setCustomMailConfig((prev) => ({ ...prev, imapPort: Number(e.target.value) }))}
                            placeholder="993"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SMTP Server Settings */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                        Outgoing Mail Server (SMTP)
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            SMTP Host
                          </label>
                          <input
                            type="text"
                            value={customMailConfig.smtpHost}
                            onChange={(e) => setCustomMailConfig((prev) => ({ ...prev, smtpHost: e.target.value }))}
                            placeholder="smtp.company.com"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Port
                          </label>
                          <input
                            type="number"
                            value={customMailConfig.smtpPort}
                            onChange={(e) => setCustomMailConfig((prev) => ({ ...prev, smtpPort: Number(e.target.value) }))}
                            placeholder="587"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowConnectMailModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingCustomMail || !customMailConfig.emailAddress || !customMailConfig.imapPassword}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs transition-all shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isVerifyingCustomMail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Server...</span>
                      </>
                    ) : (
                      <span>Verify & Connect</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ATTACHMENT LIGHTBOX PREVIEW MODAL (Gmail-Caliber Full View) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center gap-2.5 truncate">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="font-bold text-sm truncate">{previewAttachment.fileName}</span>
                {previewAttachment.fileSize ? (
                  <span className="text-xs text-slate-400 font-mono">({formatFileSize(previewAttachment.fileSize)})</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.fileUrl}
                  download={previewAttachment.fileName}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 min-h-[300px]">
              {previewAttachment.contentType.startsWith('image/') ||
              /\.(png|jpe?g|webp|gif|svg)$/i.test(previewAttachment.fileName) ? (
                <img
                  src={previewAttachment.fileUrl}
                  alt={previewAttachment.fileName}
                  className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
                />
              ) : previewAttachment.contentType.includes('pdf') || /\.pdf$/i.test(previewAttachment.fileName) ? (
                <iframe
                  src={previewAttachment.fileUrl}
                  title={previewAttachment.fileName}
                  className="w-full h-[75vh] rounded-xl border-none bg-white"
                />
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-3">
                  <FileText className="w-16 h-16 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">File ready for download</p>
                  <a
                    href={previewAttachment.fileUrl}
                    download={previewAttachment.fileName}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {previewAttachment.fileName}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* COMPOSE EMAIL MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showComposeMailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Compose New Message</h3>
                  <p className="text-[11px] text-slate-400">
                    From: {selectedMailAccount?.emailAddress || 'Your email'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeMailModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
                <input
                  type="text"
                  value={composeMailData.to}
                  onChange={(e) => setComposeMailData((prev) => ({ ...prev, to: e.target.value }))}
                  placeholder="recipient@example.com (comma separated)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">CC (Optional)</label>
                <input
                  type="text"
                  value={composeMailData.cc}
                  onChange={(e) => setComposeMailData((prev) => ({ ...prev, cc: e.target.value }))}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                <input
                  type="text"
                  value={composeMailData.subject}
                  onChange={(e) => setComposeMailData((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Meeting follow-up, deliverables..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Body</label>
                <textarea
                  rows={6}
                  value={composeMailData.body}
                  onChange={(e) => setComposeMailData((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium resize-none"
                />
              </div>

              {/* Compose Attachments List */}
              {composeAttachments.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Attached Files ({composeAttachments.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {composeAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                      >
                        <Paperclip className="w-3 h-3 text-indigo-600" />
                        <span className="max-w-[150px] truncate">{att.fileName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({formatFileSize(att.fileSize)})</span>
                        <button
                          type="button"
                          onClick={() => setComposeAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-0.5 hover:text-rose-600 rounded-md transition-colors ml-0.5 cursor-pointer"
                          title="Remove attachment"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  ref={composeFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    handleUploadMailAttachment(e.target.files, 'compose');
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => composeFileInputRef.current?.click()}
                  disabled={isUploadingComposeAttachment}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isUploadingComposeAttachment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>Attach Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowComposeMailModal(false);
                    setComposeAttachments([]);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Discard
                </button>
              </div>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingMail || !composeMailData.to.trim()}
                className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isSendingMail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SHARE EMAIL TO CHANNEL MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showShareMailModal && selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Share Email to Channel</h3>
                  <p className="text-[11px] text-slate-400">Collaborate on this email with teammates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareMailModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-800 block truncate">{selectedEmail.subject}</span>
              <span className="text-[11px] text-slate-400">From: {selectedEmail.fromName || selectedEmail.fromAddress}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Destination Channel
                </label>
                <select
                  value={shareMailTargetChannelId}
                  onChange={(e) => setShareMailTargetChannelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Add a comment for the team (Optional)
                </label>
                <textarea
                  rows={3}
                  value={shareMailNote}
                  onChange={(e) => setShareMailNote(e.target.value)}
                  placeholder="Hey team, please review this client update..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowShareMailModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShareEmailToChannel}
                disabled={isSharingMail || !shareMailTargetChannelId}
                className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all"
              >
                {isSharingMail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>Share in Channel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Call Recordings Database Modal */}
      {showRecordingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl text-white flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <Disc className="h-5 w-5 text-rose-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Saved Call Recordings
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {workspaceRecordings.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Call audio and video recordings stored safely in database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRecordingsModal(false);
                  setActivePlaybackRecording(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* Active Player if playing a recording */}
              {activePlaybackRecording && (
                <div className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-4 flex flex-col gap-3 shadow-xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                      <Play className="h-4 w-4 fill-indigo-400 text-indigo-400" />
                      Now Playing: {activePlaybackRecording.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePlaybackRecording(null)}
                      className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
                    >
                      Close Player
                    </button>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    {activePlaybackRecording.isVideo ? (
                      <video
                        src={
                          activePlaybackRecording.fileUrl.startsWith('http')
                            ? activePlaybackRecording.fileUrl
                            : `${API_URL.replace(/\/api\/?$/, '')}${activePlaybackRecording.fileUrl}`
                        }
                        controls
                        autoPlay
                        playsInline
                        className="w-full max-h-72 object-contain"
                      />
                    ) : (
                      <div className="py-6 px-4 w-full flex flex-col items-center justify-center gap-2">
                        <div className="p-3 rounded-full bg-rose-500/20 border border-rose-500/30">
                          <Volume2 className="h-6 w-6 text-rose-400" />
                        </div>
                        <audio
                          src={
                            activePlaybackRecording.fileUrl.startsWith('http')
                              ? activePlaybackRecording.fileUrl
                              : `${API_URL.replace(/\/api\/?$/, '')}${activePlaybackRecording.fileUrl}`
                          }
                          controls
                          autoPlay
                          className="w-full max-w-md mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recordings List */}
              {workspaceRecordings.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="p-4 rounded-3xl bg-slate-800/60 border border-slate-700/60 mb-3 text-slate-400">
                    <Disc className="h-8 w-8 text-slate-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">No Call Recordings Found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                    Start a voice or video call and click <b>Record</b> to record the conversation. All recordings are automatically uploaded and saved directly to the database.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {workspaceRecordings.map((rec) => {
                    const downloadUrl = rec.fileUrl.startsWith('http')
                      ? rec.fileUrl
                      : `${API_URL.replace(/\/api\/?$/, '')}${rec.fileUrl}`;
                    const isCurrentPlaying = activePlaybackRecording?.id === rec.id;
                    const canDelete =
                      rec.recordedById === user?.id || isWorkspaceOwner;

                    return (
                      <div
                        key={rec.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrentPlaying
                            ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                            : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              rec.isVideo
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {rec.isVideo ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-100 truncate" title={rec.fileName}>
                              {rec.fileName}
                            </h5>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-semibold text-slate-300">
                                {formatCallDuration(rec.duration)}
                              </span>
                              <span>•</span>
                              <span>{(rec.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>•</span>
                              <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                              {rec.channel?.name && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-300">#{rec.channel.name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="truncate max-w-[120px]">By {rec.recordedBy?.name || 'User'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => setActivePlaybackRecording(isCurrentPlaying ? null : rec)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              isCurrentPlaying
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            }`}
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>{isCurrentPlaying ? 'Stop' : 'Play'}</span>
                          </button>

                          <a
                            href={downloadUrl}
                            download={rec.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 px-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Download recording"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Save</span>
                          </a>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRecording(rec.id)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Delete recording"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Recordings are permanently saved in PostgreSQL & uploads folder
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowRecordingsModal(false);
                  setActivePlaybackRecording(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE & PHOTO MODAL ────────────────────────────── */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Edit Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              {/* Avatar Upload Preview */}
              <div className="flex flex-col items-center justify-center text-center">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => avatarFileInputRef.current?.click()}
                  title="Click to upload profile photo"
                >
                  <div className="h-24 w-24 rounded-full ring-4 ring-indigo-100 group-hover:ring-indigo-300 transition-all overflow-hidden bg-slate-100 shadow-md">
                    <img
                      src={editAvatarUrl || user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                      alt="Profile Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold">
                    <Camera className="h-5 w-5 mb-0.5" />
                    <span>Upload</span>
                  </div>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 border-2 border-white transition-transform group-hover:scale-110"
                    title="Upload photo"
                  >
                    {isUploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileUpload}
                />

                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Click avatar to upload your profile photo (PNG, JPG, WebP)
                </p>

                {/* Quick Avatar Generator seeds */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium">Or pick style:</span>
                  {['Yash', 'Alex', 'Sarah', 'Dev', 'Jordan'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditAvatarUrl(`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(preset)}&backgroundColor=4f46e5,7c3aed,06b6d4`)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-indigo-600">*</span>
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile || !editName.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isSavingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspaceShellPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC] text-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 font-medium tracking-wide">Loading Patterns...</p>
          </div>
        </div>
      }
    >
      <WorkspaceShellContent />
    </Suspense>
  );
}

