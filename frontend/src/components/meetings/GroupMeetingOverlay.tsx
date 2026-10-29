'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Volume2,
  VolumeX,
  PhoneOff,
  Disc,
  Square,
  Users,
  Maximize2,
  Minimize2,
  RotateCcw,
  Pin,
  PinOff,
  X,
  Shield,
  Crown,
  Sparkles,
  MessageSquare,
  Send,
  UserPlus,
  Check,
  Search,
  Hand,
  MoreVertical,
  Copy,
  PhoneCall,
  Phone,
} from 'lucide-react';
import { User, WorkspaceRole } from '@/types/auth';
import { ROLE_CONFIGS } from '@/lib/roles';

interface ParticipantItem {
  socketId: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: WorkspaceRole;
  };
  stream?: MediaStream;
  isMicMuted?: boolean;
  isVideoMuted?: boolean;
  isScreenSharing?: boolean;
  isSpeaking?: boolean;
  hasHandRaised?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: WorkspaceRole;
}

interface GroupMeetingOverlayProps {
  meetingId: string;
  meetingTitle: string;
  channelName?: string;
  channelId?: string;
  workspaceId: string;
  user: User;
  userRole?: WorkspaceRole;
  socket: any;
  members?: WorkspaceMember[];
  onLeaveMeeting: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
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

// Format seconds as MM:SS
function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Format timestamp as HH:MM AM/PM
function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function GroupMeetingOverlay({
  meetingId,
  meetingTitle,
  channelName,
  channelId,
  workspaceId,
  user,
  userRole,
  socket,
  members = [],
  onLeaveMeeting,
}: GroupMeetingOverlayProps) {
  // ── Local Media State ──────────────────────────────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasCamera, setHasCamera] = useState(true);
  const [hasHandRaised, setHasHandRaised] = useState(false);

  // ── UI State ───────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenFitMode, setScreenFitMode] = useState<'cover' | 'contain'>('contain');
  const [callDuration, setCallDuration] = useState(0);
  const [activePanel, setActivePanel] = useState<'none' | 'participants' | 'chat' | 'invite'>('none');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copyLinkStatus, setCopyLinkStatus] = useState(false);

  // ── Participants ───────────────────────────────────────────────
  const [remotePeers, setRemotePeers] = useState<Map<string, ParticipantItem>>(new Map());
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);

  // ── Chat State ─────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // ── Recording State ────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // ── Invite & Ringing State ──────────────────────────────────────
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [ringingMemberMap, setRingingMemberMap] = useState<
    Map<string, { status: 'ringing' | 'declined' | 'disconnected' | 'invited'; timestamp: number }>
  >(new Map());

  // ── Audio Output ───────────────────────────────────────────────
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('default');

  // ── Refs ───────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenAudioCtxRef = useRef<AudioContext | null>(null);
  const screenAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const screenAudioMixedTrackRef = useRef<MediaStreamTrack | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, any[]>>(new Map());
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // ── Meeting Timer ──────────────────────────────────────────────
  useEffect(() => {
    callTimerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, []);

  // ── Fullscreen Listener ────────────────────────────────────────
  useEffect(() => {
    const handle = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handle);
    return () => document.removeEventListener('fullscreenchange', handle);
  }, []);

  // ── Auto-scroll chat ───────────────────────────────────────────
  useEffect(() => {
    if (activePanel === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadChatCount(0);
    }
  }, [chatMessages, activePanel]);

  // ── Init Local Media & Join ────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        let stream: MediaStream;
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
        };
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: { facingMode: 'user', width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } },
          });
          setHasCamera(true);
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: true,
            });
            setHasCamera(true);
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: false,
            });
            setHasCamera(false);
            setIsVideoMuted(true);
          }
        }

        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }

        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        socket.emit('join_team_meeting', {
          meetingId,
          workspaceId,
          user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: userRole },
        });
      } catch (err) {
        console.error('Failed to get media devices:', err);
      }
    }

    initMedia();
    loadAudioOutputs();

    return () => {
      active = false;
      cleanupAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  async function loadAudioOutputs() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === 'audiooutput'));
      } catch { /* silent */ }
    }
  }

  // ── WebRTC Mesh Socket Listeners ───────────────────────────────
  useEffect(() => {
    if (!socket || !localStream) return;

    function handleExistingParticipants(data: { participants: ParticipantItem[] }) {
      data.participants.forEach((peer) => {
        if (peer.socketId === socket.id) return;
        createPeerConnection(peer.socketId, peer.user, true);
      });
    }

    function handleUserJoined(data: { socketId: string; user: any }) {
      if (data.socketId === socket.id) return;
      createPeerConnection(data.socketId, data.user, false);
      addSystemChat(`${data.user.name} joined the meeting`);

      // Clear ringing state since user is now connected
      if (data.user?.id) {
        setRingingMemberMap((prev) => {
          const next = new Map(prev);
          next.delete(data.user.id);
          return next;
        });
      }

      // If we are currently sharing our screen or have media states toggled, notify newcomer
      if (screenStreamRef.current) {
        socket.emit('meeting_media_toggle', {
          meetingId,
          isScreenSharing: true,
          isMicMuted,
          isVideoMuted,
          hasHandRaised,
        });
      }
    }

    async function handlePeerSignal(data: { fromSocketId: string; signal: any; fromUser?: any }) {
      let pc = peerConnectionsRef.current.get(data.fromSocketId);
      if (!pc && data.fromUser) pc = createPeerConnection(data.fromSocketId, data.fromUser, false);
      if (!pc) return;

      const { signal } = data;
      try {
        if (signal.type === 'offer') {
          if (pc.signalingState !== 'stable') {
            await pc.setLocalDescription({ type: 'rollback' } as any).catch(() => {});
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const queued = pendingCandidatesRef.current.get(data.fromSocketId) || [];
          for (const c of queued) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          pendingCandidatesRef.current.delete(data.fromSocketId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('meeting_peer_signal', {
            meetingId, toSocketId: data.fromSocketId, signal: answer,
            fromUser: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
          });
        } else if (signal.type === 'answer') {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          }
          const queued = pendingCandidatesRef.current.get(data.fromSocketId) || [];
          for (const c of queued) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          pendingCandidatesRef.current.delete(data.fromSocketId);
        } else if (signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            const list = pendingCandidatesRef.current.get(data.fromSocketId) || [];
            list.push(signal.candidate);
            pendingCandidatesRef.current.set(data.fromSocketId, list);
          }
        }
      } catch (err) {
        console.warn('Error handling peer signal:', err);
      }
    }

    function handleUserLeft(data: { socketId: string; userId?: string }) {
      const pc = peerConnectionsRef.current.get(data.socketId);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(data.socketId); }
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const leaving = next.get(data.socketId);
        if (leaving) {
          addSystemChat(`${leaving.user.name} left the meeting`);
          if (leaving.user?.id) {
            setRingingMemberMap((rmap) => {
              const nextMap = new Map(rmap);
              nextMap.set(leaving.user.id, { status: 'disconnected', timestamp: Date.now() });
              return nextMap;
            });
          }
        }
        next.delete(data.socketId);
        return next;
      });
      if (pinnedSocketId === data.socketId) setPinnedSocketId(null);
    }

    function handlePeerMeetingDeclined(data: { userId?: string; meetingId?: string }) {
      if (data?.userId) {
        setRingingMemberMap((prev) => {
          const next = new Map(prev);
          next.set(data.userId!, { status: 'declined', timestamp: Date.now() });
          return next;
        });
        const m = members.find((x) => x.id === data.userId);
        if (m) addSystemChat(`${m.name} declined the call`);
      }
    }

    function handlePeerMediaToggle(data: {
      socketId: string; isMicMuted?: boolean; isVideoMuted?: boolean; isScreenSharing?: boolean; hasHandRaised?: boolean;
    }) {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const item = next.get(data.socketId);
        if (item) {
          const isEndingScreenShare = data.isScreenSharing === false;
          const willBeVideoMuted = data.isVideoMuted !== undefined ? data.isVideoMuted : item.isVideoMuted;

          // If peer stopped sharing screen and camera is muted/off, purge any stale video tracks from their stream
          let updatedStream = item.stream;
          if (isEndingScreenShare && willBeVideoMuted && item.stream) {
            const audioOnlyTracks = item.stream.getAudioTracks();
            updatedStream = new MediaStream(audioOnlyTracks);
          }

          next.set(data.socketId, {
            ...item,
            ...(data.isMicMuted !== undefined && { isMicMuted: data.isMicMuted }),
            ...(data.isVideoMuted !== undefined && { isVideoMuted: data.isVideoMuted }),
            ...(data.isScreenSharing !== undefined && { isScreenSharing: data.isScreenSharing }),
            ...(data.hasHandRaised !== undefined && { hasHandRaised: data.hasHandRaised }),
            stream: updatedStream,
          });
        }
        return next;
      });

      // Auto-spotlight when someone starts sharing screen (Zoom/Teams style)
      if (data.isScreenSharing) {
        setPinnedSocketId(data.socketId);
        setScreenFitMode('contain');
      } else if (data.isScreenSharing === false) {
        setPinnedSocketId((current) => (current === data.socketId ? null : current));
      }
    }

    function handleMeetingChat(data: ChatMessage) {
      setChatMessages((prev) => [...prev, data]);
      setUnreadChatCount((prev) => activePanel === 'chat' ? 0 : prev + 1);
    }

    socket.on('meeting_existing_participants', handleExistingParticipants);
    socket.on('user_joined_team_meeting', handleUserJoined);
    socket.on('meeting_peer_signal', handlePeerSignal);
    socket.on('user_left_team_meeting', handleUserLeft);
    socket.on('peer_meeting_declined', handlePeerMeetingDeclined);
    socket.on('peer_media_toggle', handlePeerMediaToggle);
    socket.on('meeting_chat_message', handleMeetingChat);

    return () => {
      socket.off('meeting_existing_participants', handleExistingParticipants);
      socket.off('user_joined_team_meeting', handleUserJoined);
      socket.off('meeting_peer_signal', handlePeerSignal);
      socket.off('user_left_team_meeting', handleUserLeft);
      socket.off('peer_meeting_declined', handlePeerMeetingDeclined);
      socket.off('peer_media_toggle', handlePeerMediaToggle);
      socket.off('meeting_chat_message', handleMeetingChat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, localStream, activePanel]);

  function addSystemChat(text: string) {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        content: text,
        timestamp: Date.now(),
      },
    ]);
  }

  // ── Create Peer Connection ─────────────────────────────────────
  function createPeerConnection(targetSocketId: string, peerUser: any, isInitiator: boolean) {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetSocketId, pc);

    // Add local tracks to connection
    const stream = localStreamRef.current;
    const isSharingScreen = !!(screenStreamRef.current && screenStreamRef.current.getVideoTracks().some((t) => t.readyState === 'live'));
    const activeVideoTrack = isSharingScreen
      ? screenStreamRef.current!.getVideoTracks()[0]
      : stream?.getVideoTracks().find((t) => t.readyState === 'live');

    // Audio track: if screen audio is being mixed, use that, else standard mic
    const activeAudioTrack = screenAudioMixedTrackRef.current && screenAudioMixedTrackRef.current.readyState === 'live'
      ? screenAudioMixedTrackRef.current
      : stream?.getAudioTracks().find((t) => t.readyState === 'live');

    if (activeAudioTrack && stream) {
      pc.addTrack(activeAudioTrack, stream);
    }
    if (activeVideoTrack && stream) {
      pc.addTrack(activeVideoTrack, stream);
    } else {
      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
      } catch (e) {}
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('meeting_peer_signal', {
          meetingId, toSocketId: targetSocketId,
          signal: { candidate: event.candidate },
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    // Handle remote tracks (direct track + streams, fresh MediaStream instance on changes)
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      if (event.track) {
        if (!remoteStream.getTracks().find((t) => t.id === event.track.id)) {
          remoteStream.addTrack(event.track);
        }
        event.track.onmute = () => {
          setRemotePeers((prev) => {
            const next = new Map(prev);
            const existing = next.get(targetSocketId);
            if (existing) next.set(targetSocketId, { ...existing });
            return next;
          });
        };
        event.track.onunmute = () => {
          setRemotePeers((prev) => {
            const next = new Map(prev);
            const existing = next.get(targetSocketId);
            if (existing) next.set(targetSocketId, { ...existing });
            return next;
          });
        };
      }
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!remoteStream.getTracks().find((t) => t.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });
      }

      setRemotePeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId);
        const freshStream = new MediaStream(remoteStream.getTracks());
        next.set(targetSocketId, {
          ...(existing || { socketId: targetSocketId, user: peerUser }),
          stream: freshStream,
        });
        return next;
      });
    };

    // Create offer if initiator
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('meeting_peer_signal', {
            meetingId, toSocketId: targetSocketId,
            signal: pc.localDescription,
            fromUser: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
          });
        })
        .catch(console.error);
    }

    // Register peer
    setRemotePeers((prev) => {
      const next = new Map(prev);
      if (!next.has(targetSocketId)) {
        next.set(targetSocketId, { socketId: targetSocketId, user: peerUser, stream: remoteStream });
      }
      return next;
    });

    return pc;
  }

  // ── Cleanup ────────────────────────────────────────────────────
  function cleanupAll() {
    socket.emit('leave_team_meeting', { meetingId, workspaceId });
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    if (screenAudioCtxRef.current) {
      try { screenAudioCtxRef.current.close(); } catch (e) {}
      screenAudioCtxRef.current = null;
    }
    screenAudioSourceRef.current = null;
    micAudioSourceRef.current = null;
    screenAudioMixedTrackRef.current = null;

    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => t.stop());
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    speakingTimersRef.current.forEach((t) => clearTimeout(t));
  }

  // ── Controls ───────────────────────────────────────────────────
  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const muted = !audioTrack.enabled;
      setIsMicMuted(muted);
      socket.emit('meeting_media_toggle', { meetingId, isMicMuted: muted });
    }
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const muted = !videoTrack.enabled;
      setIsVideoMuted(muted);
      socket.emit('meeting_media_toggle', { meetingId, isVideoMuted: muted });
    }
  }

  async function flipCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextMode } });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = stream.getVideoTracks()[0];
      if (oldVideoTrack) { stream.removeTrack(oldVideoTrack); oldVideoTrack.stop(); }
      stream.addTrack(newVideoTrack);
      setFacingMode(nextMode);
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.warn('Failed to flip camera:', err);
    }
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      await stopScreenSharing();
    } else {
      await startScreenSharing();
    }
  }

  async function startScreenSharing() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Screen sharing is not supported in this browser.');
      return;
    }
    try {
      // Request display media with audio enabled so tab/system audio (e.g. YouTube, video players, music) can be shared
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
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
            audio: true,
          });
        } else {
          throw err;
        }
      }

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = screenStream;

      // Handle screen tab/system audio mixing if captured
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

            // Connect screen audio to destination
            const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTracks[0]]));
            screenAudioSourceRef.current = screenSource;
            screenSource.connect(destination);

            // Connect local microphone to destination (if microphone exists)
            const micTrack = localStreamRef.current?.getAudioTracks().find((t) => t.readyState === 'live');
            if (micTrack) {
              const micSource = audioCtx.createMediaStreamSource(new MediaStream([micTrack]));
              micAudioSourceRef.current = micSource;
              micSource.connect(destination);
            }

            broadcastAudioTrack = destination.stream.getAudioTracks()[0] || null;
            screenAudioMixedTrackRef.current = broadcastAudioTrack;
          }
        } catch (mixErr) {
          console.warn('Audio mix error, falling back to raw screen audio track:', mixErr);
          broadcastAudioTrack = screenAudioTracks[0];
          screenAudioMixedTrackRef.current = broadcastAudioTrack;
        }
      }

      // Handle when user stops sharing via browser bar
      screenTrack.onended = () => {
        stopScreenSharing();
      };

      // Replace or add track on all active peer connections
      for (const pc of peerConnectionsRef.current.values()) {
        if (pc.signalingState === 'closed') continue;
        const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video' || s.track === null);

        if (videoTransceiver && videoTransceiver.sender) {
          videoTransceiver.direction = 'sendrecv';
          await videoTransceiver.sender.replaceTrack(screenTrack).catch(() => {});
        } else if (videoSender) {
          await videoSender.replaceTrack(screenTrack).catch(() => {});
        } else {
          if (localStreamRef.current) pc.addTrack(screenTrack, localStreamRef.current);
        }

        // Replace audio track with mixed track if screen audio is present
        if (broadcastAudioTrack) {
          const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(broadcastAudioTrack).catch(() => {});
          }
        }
      }

      // Show screen stream in local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
        localVideoRef.current.play().catch(() => {});
      }

      setIsScreenSharing(true);
      setPinnedSocketId('self');
      setScreenFitMode('contain');
      socket.emit('meeting_media_toggle', { meetingId, isScreenSharing: true });

      // Always perform SDP renegotiation so all remote peers receive the new screen track
      await renegotiateAll();
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.error('Screen sharing error:', err);
      }
      setIsScreenSharing(false);
    }
  }

  async function stopScreenSharing() {
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
    screenAudioSourceRef.current = null;
    micAudioSourceRef.current = null;
    screenAudioMixedTrackRef.current = null;

    const stream = localStreamRef.current;
    const originalVideoTrack = stream?.getVideoTracks().find((t) => t.readyState === 'live');
    const originalMicTrack = stream?.getAudioTracks().find((t) => t.readyState === 'live');
    const hasLiveCamera = !!(originalVideoTrack && !isVideoMuted);

    for (const pc of peerConnectionsRef.current.values()) {
      if (pc.signalingState === 'closed') continue;
      const videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');

      if (videoTransceiver && videoTransceiver.sender) {
        if (hasLiveCamera && originalVideoTrack) {
          videoTransceiver.direction = 'sendrecv';
          await videoTransceiver.sender.replaceTrack(originalVideoTrack).catch(() => {});
        } else {
          videoTransceiver.direction = 'recvonly';
          await videoTransceiver.sender.replaceTrack(null).catch(() => {});
        }
      } else if (videoSender) {
        await videoSender.replaceTrack(hasLiveCamera && originalVideoTrack ? originalVideoTrack : null).catch(() => {});
      }

      // Restore original mic track (remove mixed screen audio)
      if (originalMicTrack) {
        const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(originalMicTrack).catch(() => {});
        }
      }
    }

    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => {});
    }

    setIsScreenSharing(false);
    setPinnedSocketId((cur) => cur === 'self' ? null : cur);
    socket.emit('meeting_media_toggle', {
      meetingId,
      isScreenSharing: false,
      isVideoMuted: !hasLiveCamera,
    });

    await renegotiateAll();
  }

  async function renegotiateAll() {
    for (const [targetSocketId, pc] of peerConnectionsRef.current.entries()) {
      try {
        if (pc.signalingState === 'closed') continue;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('meeting_peer_signal', {
          meetingId,
          toSocketId: targetSocketId,
          signal: pc.localDescription,
          fromUser: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        });
      } catch (e) {
        console.warn('Renegotiation error for', targetSocketId, e);
      }
    }
  }

  function toggleHandRaise() {
    const raised = !hasHandRaised;
    setHasHandRaised(raised);
    socket.emit('meeting_media_toggle', { meetingId, hasHandRaised: raised });
    if (raised) addSystemChat(`${user.name} raised their hand ✋`);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ── In-Meeting Recording (Mixes Local + Remote Audio + Active Screen/Camera) ──
  function startRecording() {
    if (isRecording) return;
    try {
      recordedChunksRef.current = [];
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        alert('AudioContext not supported in this browser.');
        return;
      }
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();

      // 1. Connect local audio
      if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
        try {
          const src = audioCtx.createMediaStreamSource(localStreamRef.current);
          src.connect(dest);
        } catch (e) {}
      }

      // 2. Connect all remote peer audio tracks
      peersArray.forEach((peer) => {
        if (peer.stream && peer.stream.getAudioTracks().length > 0) {
          try {
            const peerSrc = audioCtx.createMediaStreamSource(peer.stream);
            peerSrc.connect(dest);
          } catch (e) {}
        }
      });

      // 3. Assemble record stream
      const recordStream = new MediaStream();
      const mixedAudioTrack = dest.stream.getAudioTracks()[0];
      if (mixedAudioTrack) recordStream.addTrack(mixedAudioTrack);

      // Video track: If sharing screen or someone else is sharing screen or camera
      const screenTrack = screenStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');
      const remoteScreenTrack = peersArray.find((p) => p.isScreenSharing)?.stream?.getVideoTracks().find((t) => t.readyState === 'live');
      const localCameraTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');
      const remoteCameraTrack = peersArray.find((p) => p.stream?.getVideoTracks().length)?.stream?.getVideoTracks().find((t) => t.readyState === 'live');

      const videoTrackToRecord = screenTrack || remoteScreenTrack || localCameraTrack || remoteCameraTrack;
      if (videoTrackToRecord) recordStream.addTrack(videoTrackToRecord);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const mr = new MediaRecorder(recordStream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const hasVideo = recordStream.getVideoTracks().length > 0;
        const blob = new Blob(recordedChunksRef.current, { type: hasVideo ? mimeType : 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${meetingTitle.replace(/\s+/g, '_')}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        audioCtx.close().catch(() => {});
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
      socket.emit('meeting_media_toggle', { meetingId, isRecording: true });
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    socket.emit('meeting_media_toggle', { meetingId, isRecording: false });
  }

  // ── In-Meeting Chat ────────────────────────────────────────────
  function sendChatMessage() {
    if (!chatInput.trim()) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatarUrl,
      content: chatInput.trim(),
      timestamp: Date.now(),
    };
    socket.emit('meeting_chat_message', { meetingId, ...msg });
    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');
  }

  // ── Invite & Ring Members ───────────────────────────────────────
  function inviteMember(memberId: string, memberName: string) {
    socket.emit('call_user', {
      toUserId: memberId,
      caller: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      isVideo: true,
      meetingId,
      meetingTitle,
      channelId,
      channelName,
      isGroupCall: true,
    });
    setRingingMemberMap((prev) => {
      const next = new Map(prev);
      next.set(memberId, { status: 'ringing', timestamp: Date.now() });
      return next;
    });
    setInvitedIds((prev) => new Set([...prev, memberId]));
    addSystemChat(`📞 Ringing ${memberName}...`);
  }

  function ringAllUnconnected() {
    const unconnected = members.filter((m) => !peerUserIds.has(m.id) && m.id !== user.id);
    if (unconnected.length === 0) return;

    const targetUserIds = unconnected.map((m) => m.id);
    socket.emit('ring_channel_meeting', {
      channelId,
      channelName: channelName || 'dev',
      meetingId,
      meetingTitle,
      caller: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      targetUserIds,
    });

    setRingingMemberMap((prev) => {
      const next = new Map(prev);
      unconnected.forEach((m) => {
        next.set(m.id, { status: 'ringing', timestamp: Date.now() });
      });
      return next;
    });
    addSystemChat(`📞 Ringing ${unconnected.length} members...`);
  }

  function copyMeetingLink() {
    const url = `${window.location.origin}${window.location.pathname}?meeting=${meetingId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyLinkStatus(true);
      setTimeout(() => setCopyLinkStatus(false), 2000);
    });
  }

  // ── Grid Layout ────────────────────────────────────────────────
  const peersArray = Array.from(remotePeers.values());
  const totalCount = peersArray.length + 1;

  const gridLayoutClass = useMemo(() => {
    if (pinnedSocketId) return 'flex flex-col';
    if (totalCount === 1) return 'grid-cols-1';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalCount <= 4) return 'grid-cols-2';
    if (totalCount <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (totalCount <= 9) return 'grid-cols-3';
    if (totalCount <= 16) return 'grid-cols-3 md:grid-cols-4';
    return 'grid-cols-4 md:grid-cols-5';
  }, [totalCount, pinnedSocketId]);

  // ── Filtered members for invite (exclude already in meeting) ───
  const peerUserIds = new Set([user.id, ...peersArray.map((p) => p.user.id)]);
  const filteredMembers = members
    .filter((m) => !peerUserIds.has(m.id) && m.name.toLowerCase().includes(inviteSearch.toLowerCase()));

  const sidebarOpen = activePanel !== 'none';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] w-screen h-[100dvh] bg-[#0A0D14] flex flex-col overflow-hidden text-white select-none"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Dedicated Remote Audio Elements (one per peer, never unmounted across layout changes) */}
      {peersArray.map((peer) => (
        <RemotePeerAudioElement
          key={peer.socketId}
          stream={peer.stream}
          selectedAudioOutput={selectedAudioOutput}
        />
      ))}
      {/* ── TOP HEADER ──────────────────────────────────────────── */}
      <div className="h-14 px-4 sm:px-5 bg-[#111827]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/patterns-logo.png"
            alt="Patterns"
            className="h-8 w-auto object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                {meetingTitle}
              </h2>
              {channelName && (
                <span className="text-[11px] font-semibold text-violet-400 hidden sm:inline">#{channelName}</span>
              )}
              {isRecording && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  REC {formatDuration(recordingDuration)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-mono font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {formatDuration(callDuration)}
              </span>
              <span>•</span>
              <span className="text-slate-300">{totalCount} participant{totalCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Header right */}
        <div className="flex items-center gap-2 shrink-0">
          {isScreenSharing && (
            <span className="hidden sm:flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 items-center gap-1.5">
              <MonitorUp className="h-3 w-3" /> Sharing Screen
            </span>
          )}
          {hasHandRaised && (
            <span className="hidden sm:flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 items-center gap-1.5">
              ✋ Hand Raised
            </span>
          )}
          <button
            type="button"
            onClick={() => setScreenFitMode((p) => p === 'cover' ? 'contain' : 'cover')}
            className="hidden sm:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold items-center gap-1.5 transition-colors"
            title="Toggle Fit/Fill"
          >
            {screenFitMode === 'cover' ? 'Fit' : 'Fill'}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Video Stage */}
        <div className="flex-1 overflow-hidden relative p-2 sm:p-3 flex flex-col min-w-0">
          {pinnedSocketId ? (
            /* Spotlight / Pinned Mode */
            <div className="flex-1 flex flex-col md:flex-row gap-2.5 h-full overflow-hidden">
              {/* Pinned Hero */}
              <div className="flex-1 rounded-2xl overflow-hidden bg-[#111827] border border-white/5 relative shadow-2xl min-h-0">
                {pinnedSocketId === 'self' ? (
                  <LocalVideoTile
                    localVideoRef={localVideoRef}
                    user={user}
                    isVideoMuted={isVideoMuted}
                    isMicMuted={isMicMuted}
                    screenFitMode={screenFitMode}
                    isScreenSharing={isScreenSharing}
                    onUnpin={() => setPinnedSocketId(null)}
                    isPinned
                    hasHandRaised={hasHandRaised}
                  />
                ) : (() => {
                  const peer = remotePeers.get(pinnedSocketId);
                  if (!peer) return null;
                  return (
                    <div className="w-full h-full relative">
                      <PeerVideoTile peer={peer} screenFitMode={screenFitMode} />
                      <button
                        type="button"
                        onClick={() => setPinnedSocketId(null)}
                        className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 z-10"
                      >
                        <PinOff className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Thumbnail Strip */}
              <div className="h-28 md:h-full md:w-52 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 pb-1 md:pb-0">
                {pinnedSocketId !== 'self' && (
                  <ThumbnailTile
                    label={`${user.name} (You)`}
                    onClick={() => setPinnedSocketId('self')}
                    isVideoMuted={isVideoMuted}
                    avatarUrl={user.avatarUrl}
                    render={() => (
                      <video
                        ref={(el) => { if (el && localStreamRef.current) el.srcObject = localStreamRef.current; }}
                        autoPlay playsInline muted
                        className="w-full h-full object-cover"
                      />
                    )}
                  />
                )}
                {peersArray.filter((p) => p.socketId !== pinnedSocketId).map((peer) => (
                  <ThumbnailTile
                    key={peer.socketId}
                    label={peer.user.name}
                    onClick={() => setPinnedSocketId(peer.socketId)}
                    isVideoMuted={!!peer.isVideoMuted}
                    avatarUrl={peer.user.avatarUrl}
                    render={() => <PeerVideoTile peer={peer} screenFitMode="cover" />}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Grid Mode */
            <div className={`grid ${gridLayoutClass} gap-2.5 h-full w-full overflow-y-auto`}>
              {/* Local tile */}
              <div className="relative rounded-2xl overflow-hidden bg-[#111827] border border-white/5 shadow-md group flex items-center justify-center min-h-[120px]">
                <LocalVideoTile
                  localVideoRef={localVideoRef}
                  user={user}
                  isVideoMuted={isVideoMuted}
                  isMicMuted={isMicMuted}
                  screenFitMode={screenFitMode}
                  isScreenSharing={isScreenSharing}
                  onPin={() => setPinnedSocketId('self')}
                  hasHandRaised={hasHandRaised}
                />
              </div>

              {/* Remote tiles */}
              {peersArray.map((peer) => (
                <div
                  key={peer.socketId}
                  className="relative rounded-2xl overflow-hidden bg-[#111827] border border-white/5 shadow-md group flex items-center justify-center min-h-[120px]"
                >
                  <PeerVideoTile peer={peer} screenFitMode={screenFitMode} />

                  {/* Name/status overlay */}
                  <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/60 backdrop-blur-sm text-[11px] font-semibold text-white">
                    {peer.hasHandRaised && <span className="text-amber-400">✋</span>}
                    <span className="truncate max-w-[100px]">{peer.user.name}</span>
                    {peer.isMicMuted ? <MicOff className="h-3 w-3 text-rose-400 shrink-0" /> : <Mic className="h-3 w-3 text-emerald-400 shrink-0" />}
                    {peer.isScreenSharing && <MonitorUp className="h-3 w-3 text-indigo-400 shrink-0" />}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPinnedSocketId(peer.socketId)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Pin to spotlight"
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SIDE PANEL ─────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="w-72 sm:w-80 bg-[#111827] border-l border-white/5 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right duration-200 z-20">
            {/* Panel tabs */}
            <div className="h-12 flex border-b border-white/5 shrink-0">
              {(['participants', 'chat', 'invite'] as const).map((panel) => (
                <button
                  key={panel}
                  type="button"
                  onClick={() => setActivePanel(panel)}
                  className={`flex-1 text-xs font-semibold capitalize transition-colors relative ${
                    activePanel === panel
                      ? 'text-white bg-white/5'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/3'
                  }`}
                >
                  {panel === 'chat' && unreadChatCount > 0 && activePanel !== 'chat' && (
                    <span className="absolute top-2 right-4 h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                  {panel}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActivePanel('none')}
                className="px-3 text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Participants panel */}
            {activePanel === 'participants' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    In Meeting — {totalCount}
                  </div>
                  {/* Self */}
                  <ParticipantRow
                    name={`${user.name} (You)`}
                    avatarUrl={user.avatarUrl}
                    role={userRole}
                    isMicMuted={isMicMuted}
                    isVideoMuted={isVideoMuted}
                    isScreenSharing={isScreenSharing}
                    hasHandRaised={hasHandRaised}
                  />
                  {peersArray.map((peer) => (
                    <ParticipantRow
                      key={peer.socketId}
                      name={peer.user.name}
                      avatarUrl={peer.user.avatarUrl}
                      role={peer.user.role}
                      isMicMuted={peer.isMicMuted}
                      isVideoMuted={peer.isVideoMuted}
                      isScreenSharing={peer.isScreenSharing}
                      hasHandRaised={peer.hasHandRaised}
                      onPin={() => { setPinnedSocketId(peer.socketId); setActivePanel('none'); }}
                    />
                  ))}
                </div>

                {filteredMembers.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Not in Call — {filteredMembers.length}
                      </span>
                      <button
                        type="button"
                        onClick={ringAllUnconnected}
                        className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                      >
                        Ring All
                      </button>
                    </div>
                    {filteredMembers.map((m) => {
                      const ringingInfo = ringingMemberMap.get(m.id);
                      const isRinging = ringingInfo?.status === 'ringing';
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/2 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`}
                              alt={m.name}
                              className="h-7 w-7 rounded-lg object-cover border border-white/10 shrink-0 opacity-60"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-300 truncate">{m.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {isRinging ? 'Ringing...' : ringingInfo?.status === 'declined' ? 'Declined' : ringingInfo?.status === 'disconnected' ? 'Left call' : 'Not joined'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => inviteMember(m.id, m.name)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-violet-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title={isRinging ? 'Ring again' : 'Ring member'}
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Chat panel */}
            {activePanel === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No messages yet. Say hello! 👋
                    </div>
                  )}
                  {chatMessages.map((msg) =>
                    msg.senderId === 'system' ? (
                      <div key={msg.id} className="text-center text-[10px] text-slate-600 py-1">
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.senderId === user.id ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <img
                          src={msg.senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}`}
                          alt={msg.senderName}
                          className="h-7 w-7 rounded-full border border-white/10 object-cover shrink-0 mt-0.5"
                        />
                        <div className={`max-w-[75%] ${msg.senderId === user.id ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                          <div className={`flex items-center gap-1.5 ${msg.senderId === user.id ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] font-bold text-slate-400">{msg.senderId === user.id ? 'You' : msg.senderName}</span>
                            <span className="text-[9px] text-slate-600">{formatTime(msg.timestamp)}</span>
                          </div>
                          <div
                            className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed break-words ${
                              msg.senderId === user.id
                                ? 'bg-violet-600 text-white rounded-tr-sm'
                                : 'bg-white/8 text-slate-200 rounded-tl-sm'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="p-3 border-t border-white/5 shrink-0">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
                      }}
                      placeholder="Message everyone..."
                      className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim()}
                      className="p-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-500 transition-colors shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Invite panel */}
            {activePanel === 'invite' && (
              <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
                {/* Copy link */}
                <button
                  type="button"
                  onClick={copyMeetingLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copyLinkStatus ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copyLinkStatus ? 'Link Copied!' : 'Copy Meeting Link'}</span>
                </button>

                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Ring Members ({filteredMembers.length})
                  </div>
                  {filteredMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={ringAllUnconnected}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Ring All ({filteredMembers.length})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    placeholder="Search members to call..."
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5">
                  {filteredMembers.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-6">
                      {members.length === 0 ? 'All members are in the call' : 'No members found'}
                    </div>
                  )}
                  {filteredMembers.map((m) => {
                    const ringingInfo = ringingMemberMap.get(m.id);
                    const isRinging = ringingInfo?.status === 'ringing';
                    const isDeclined = ringingInfo?.status === 'declined';
                    const isDisconnected = ringingInfo?.status === 'disconnected';

                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/3 hover:bg-white/6 transition-colors"
                      >
                        <img
                          src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`}
                          alt={m.name}
                          className="h-8 w-8 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-200 truncate">{m.name}</span>
                            {isRinging && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                Ringing...
                              </span>
                            )}
                            {isDeclined && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Declined
                              </span>
                            )}
                            {isDisconnected && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                                Left Call
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{m.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => inviteMember(m.id, m.name)}
                          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs ${
                            isRinging
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : isDeclined || isDisconnected
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              : 'bg-violet-600 hover:bg-violet-500 text-white'
                          }`}
                          title={isRinging ? 'Call again (already ringing)' : 'Ring user to join call'}
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          <span>{isRinging || isDeclined || isDisconnected ? 'Ring Again' : 'Call'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── CONTROLS TOOLBAR ─────────────────────────────────────── */}
      <div className="px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-[#111827]/95 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-2 flex-wrap shrink-0 z-30">
        {/* Mic */}
        <CtrlBtn
          active={!isMicMuted}
          danger={isMicMuted}
          onClick={toggleMic}
          title={isMicMuted ? 'Unmute' : 'Mute'}
        >
          {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CtrlBtn>

        {/* Camera */}
        <CtrlBtn
          active={!isVideoMuted && hasCamera}
          danger={isVideoMuted || !hasCamera}
          onClick={toggleCamera}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoMuted || !hasCamera ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </CtrlBtn>

        {/* Flip Camera (mobile) */}
        {hasCamera && (
          <CtrlBtn active onClick={flipCamera} title="Flip Camera" className="hidden sm:flex">
            <RotateCcw className="h-5 w-5" />
          </CtrlBtn>
        )}

        {/* Screen Share */}
        <CtrlBtn
          active={!isScreenSharing}
          accent={isScreenSharing}
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          <MonitorUp className="h-5 w-5" />
        </CtrlBtn>

        {/* Hand Raise */}
        <CtrlBtn
          active={!hasHandRaised}
          accent={hasHandRaised}
          onClick={toggleHandRaise}
          title={hasHandRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          <span className="text-base leading-none">{hasHandRaised ? '✋' : '🤚'}</span>
        </CtrlBtn>

        {/* Recording */}
        <CtrlBtn
          active={!isRecording}
          danger={isRecording}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isRecording ? <Square className="h-5 w-5" /> : <Disc className="h-5 w-5" />}
        </CtrlBtn>

        {/* Separator */}
        <div className="h-8 w-px bg-white/10 mx-1" />

        {/* Chat toggle */}
        <CtrlBtn
          active={activePanel !== 'chat'}
          accent={activePanel === 'chat'}
          onClick={() => setActivePanel((p) => p === 'chat' ? 'none' : 'chat')}
          title="Meeting Chat"
          badge={activePanel !== 'chat' && unreadChatCount > 0 ? String(unreadChatCount > 9 ? '9+' : unreadChatCount) : undefined}
        >
          <MessageSquare className="h-5 w-5" />
        </CtrlBtn>

        {/* Participants */}
        <CtrlBtn
          active={activePanel !== 'participants'}
          accent={activePanel === 'participants'}
          onClick={() => setActivePanel((p) => p === 'participants' ? 'none' : 'participants')}
          title="Participants"
        >
          <Users className="h-5 w-5" />
          <span className="text-xs font-bold">{totalCount}</span>
        </CtrlBtn>

        {/* Invite */}
        <CtrlBtn
          active={activePanel !== 'invite'}
          accent={activePanel === 'invite'}
          onClick={() => setActivePanel((p) => p === 'invite' ? 'none' : 'invite')}
          title="Invite People"
        >
          <UserPlus className="h-5 w-5" />
        </CtrlBtn>

        {/* Separator */}
        <div className="h-8 w-px bg-white/10 mx-1" />

        {/* Leave */}
        <button
          type="button"
          onClick={() => { cleanupAll(); onLeaveMeeting(); }}
          className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2 active:scale-95"
          title="Leave meeting"
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}

// ── Control Button ─────────────────────────────────────────────────
function CtrlBtn({
  children,
  onClick,
  title,
  active = true,
  danger = false,
  accent = false,
  badge,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
  accent?: boolean;
  badge?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative p-3 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 ${
        danger
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
          : accent
          ? 'bg-violet-600 text-white shadow-violet-600/20 hover:bg-violet-500'
          : 'bg-white/8 hover:bg-white/12 text-slate-300 hover:text-white border border-white/5'
      } ${className}`}
    >
      {children}
      {badge && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Local Video Tile ───────────────────────────────────────────────
function LocalVideoTile({
  localVideoRef,
  user,
  isVideoMuted,
  isMicMuted,
  screenFitMode,
  isScreenSharing,
  onPin,
  onUnpin,
  isPinned = false,
  hasHandRaised,
}: {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  user: any;
  isVideoMuted: boolean;
  isMicMuted: boolean;
  screenFitMode: 'cover' | 'contain';
  isScreenSharing?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  isPinned?: boolean;
  hasHandRaised?: boolean;
}) {
  const hideLocalCamera = isVideoMuted && !isScreenSharing;

  return (
    <div className="w-full h-full relative group">
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full ${
          isScreenSharing || screenFitMode === 'contain' ? 'object-contain' : 'object-cover'
        } ${hideLocalCamera ? 'opacity-0' : 'opacity-100'}`}
      />
      {hideLocalCamera && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1623]">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
            alt={user.name}
            className="h-20 w-20 rounded-full border-2 border-white/10 object-cover"
          />
          <span className="mt-2.5 text-sm font-bold text-slate-300">{user.name}</span>
        </div>
      )}
      {/* Bottom overlay */}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/60 backdrop-blur-sm text-[11px] font-semibold text-white">
        {hasHandRaised && <span className="text-amber-400">✋</span>}
        <span>{user.name} (You)</span>
        {isMicMuted ? <MicOff className="h-3 w-3 text-rose-400" /> : <Mic className="h-3 w-3 text-emerald-400" />}
        {isScreenSharing && <MonitorUp className="h-3 w-3 text-indigo-400" />}
      </div>
      {/* Pin/unpin button */}
      {isPinned ? (
        <button
          type="button"
          onClick={onUnpin}
          className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 z-10"
        >
          <PinOff className="h-4 w-4" />
        </button>
      ) : onPin ? (
        <button
          type="button"
          onClick={onPin}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Pin to spotlight"
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

// ── Thumbnail Tile (strip view) ────────────────────────────────────
function ThumbnailTile({
  label,
  onClick,
  isVideoMuted,
  avatarUrl,
  render,
}: {
  label: string;
  onClick: () => void;
  isVideoMuted: boolean;
  avatarUrl?: string;
  render: () => React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="w-36 md:w-full h-24 md:h-32 rounded-xl bg-[#0F1623] border border-white/5 overflow-hidden shrink-0 relative cursor-pointer hover:border-violet-500/50 transition-all"
    >
      {isVideoMuted ? (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=User`}
            alt={label}
            className="h-10 w-10 rounded-full border border-white/10"
          />
        </div>
      ) : (
        render()
      )}
      <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-white bg-black/60 px-1.5 rounded-md truncate max-w-[90%]">
        {label}
      </span>
    </div>
  );
}

// ── Participant Row ────────────────────────────────────────────────
function ParticipantRow({
  name,
  avatarUrl,
  role,
  isMicMuted,
  isVideoMuted,
  isScreenSharing,
  hasHandRaised,
  onPin,
}: {
  name: string;
  avatarUrl?: string;
  role?: WorkspaceRole;
  isMicMuted?: boolean;
  isVideoMuted?: boolean;
  isScreenSharing?: boolean;
  hasHandRaised?: boolean;
  onPin?: () => void;
}) {
  const roleConf = ROLE_CONFIGS[role || 'MEMBER'];
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/3 hover:bg-white/6 transition-colors group">
      <img
        src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
        alt={name}
        className="h-8 w-8 rounded-lg object-cover border border-white/10 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
          {hasHandRaised && <span className="text-amber-400 shrink-0">✋</span>}
          {name}
        </div>
        <div className="text-[10px] text-slate-500">{roleConf?.label || 'Participant'}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isScreenSharing && <span title="Sharing Screen"><MonitorUp className="h-3.5 w-3.5 text-indigo-400" /></span>}
        {isMicMuted
          ? <MicOff className="h-3.5 w-3.5 text-rose-400" />
          : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
        {onPin && (
          <button
            type="button"
            onClick={onPin}
            className="p-1 rounded-lg text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
            title="Spotlight"
          >
            <Pin className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Dedicated Remote Peer Audio Element ───────────────────────────
function RemotePeerAudioElement({
  stream,
  selectedAudioOutput,
}: {
  stream?: MediaStream;
  selectedAudioOutput: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.volume = 1.0;
    el.play().catch(() => {});

    if (selectedAudioOutput && 'setSinkId' in HTMLMediaElement.prototype) {
      (el as any).setSinkId(selectedAudioOutput).catch(() => {});
    }
  }, [stream, selectedAudioOutput]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
    />
  );
}

// ── Remote Peer Video Tile ─────────────────────────────────────────
function PeerVideoTile({
  peer,
  screenFitMode,
}: {
  peer: ParticipantItem;
  screenFitMode: 'cover' | 'contain';
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [, setTrackStateTick] = useState(0);

  // Monitor mute/unmute events on remote video tracks so UI reacts immediately when remote sender replaces track with null
  useEffect(() => {
    if (!peer.stream) return;
    const tracks = peer.stream.getVideoTracks();
    const handleTrackChange = () => {
      setTrackStateTick((v) => v + 1);
    };
    tracks.forEach((track) => {
      track.addEventListener('mute', handleTrackChange);
      track.addEventListener('unmute', handleTrackChange);
      track.addEventListener('ended', handleTrackChange);
    });
    return () => {
      tracks.forEach((track) => {
        track.removeEventListener('mute', handleTrackChange);
        track.removeEventListener('unmute', handleTrackChange);
        track.removeEventListener('ended', handleTrackChange);
      });
    };
  }, [peer.stream]);

  // A video track is only valid if it is live AND not muted by the sender
  const hasLiveVideoTrack =
    !!peer.stream &&
    peer.stream.getVideoTracks().some((t) => t.readyState === 'live' && !t.muted);

  // Show video if actively screen sharing OR if there is an unmuted camera track
  const showVideo = !!peer.isScreenSharing || (hasLiveVideoTrack && !peer.isVideoMuted);

  useEffect(() => {
    if (showVideo && videoRef.current && peer.stream) {
      if (videoRef.current.srcObject !== peer.stream) {
        videoRef.current.srcObject = peer.stream;
      }
      videoRef.current.play().catch(() => {});
    } else if (!showVideo && videoRef.current) {
      // Clear video source immediately so no frozen frame lingers
      videoRef.current.srcObject = null;
    }
  }, [showVideo, peer.stream, peer.isScreenSharing, peer.isVideoMuted]);

  if (!showVideo) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0F1623]">
        <img
          src={peer.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(peer.user.name)}`}
          alt={peer.user.name}
          className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-white/10 object-cover"
        />
        <span className="mt-2.5 text-xs font-bold text-slate-300">{peer.user.name}</span>
        {peer.isMicMuted && (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-400 font-medium">
            <MicOff className="h-3 w-3" /> Muted
          </span>
        )}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted /* Audio is handled by RemotePeerAudioElement to eliminate feedback and echo */
      className={`w-full h-full ${
        peer.isScreenSharing || screenFitMode === 'contain' ? 'object-contain' : 'object-cover'
      } bg-[#0F1623]`}
    />
  );
}
