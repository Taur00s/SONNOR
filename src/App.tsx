/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Music, 
  List, 
  Maximize2, 
  Minimize2, 
  Upload,
  Volume2,
  Heart,
  Repeat,
  Shuffle,
  Disc,
  ListMusic,
  Settings,
  Clock,
  History,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Disc3,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FixedSizeList as ListWindow } from 'react-window';
import * as jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import { AutoSizer } from 'react-virtualized-auto-sizer';

// --- Types ---
interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover?: string;
  duration?: number;
}

type Tab = 'musica' | 'album' | 'playlist' | 'dj' | 'definicao';
type PlaylistSubTab = 'playlist' | 'recentes' | 'tocadas' | 'mais_tocadas';

// --- Components ---

const GlassBox = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass rounded-2xl p-4 ${className}`}>
    {children}
  </div>
);

const NeonButton = ({ 
  children, 
  onClick, 
  className = "", 
  variant = "cyan" 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string;
  variant?: "cyan" | "violet" 
}) => {
  const glowClass = variant === "cyan" ? "neon-glow-cyan border-cyan-400/50" : "neon-glow-violet border-violet-500/50";
  const textClass = variant === "cyan" ? "text-cyan-400" : "text-violet-400";
  
  return (
    <button 
      onClick={onClick}
      className={`glass border rounded-full p-3 transition-all active:scale-95 flex items-center justify-center ${glowClass} ${textClass} ${className}`}
    >
      {children}
    </button>
  );
};

const VirtualDJ = ({ playlist }: { playlist: Track[] }) => {
  const [deckA, setDeckA] = useState<Track | null>(null);
  const [deckB, setDeckB] = useState<Track | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [rateA, setRateA] = useState(1);
  const [rateB, setRateB] = useState(1);
  const [crossfader, setCrossfader] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<'A' | 'B' | null>(null);

  const [reverbA, setReverbA] = useState(0);
  const [echoA, setEchoA] = useState(0);
  const [reverbB, setReverbB] = useState(0);
  const [echoB, setEchoB] = useState(0);

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const reverbGainARef = useRef<GainNode | null>(null);
  const echoGainARef = useRef<GainNode | null>(null);
  const reverbGainBRef = useRef<GainNode | null>(null);
  const echoGainBRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const createReverb = () => {
        const length = ctx.sampleRate * 2.0;
        const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = buffer.getChannelData(c);
          for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
          }
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = buffer;
        return convolver;
      };

      const setupDeck = (audioEl: HTMLAudioElement, reverbGainRef: any, echoGainRef: any) => {
        const source = ctx.createMediaElementSource(audioEl);

        // Dry route
        source.connect(ctx.destination);

        // Reverb route
        const convolver = createReverb();
        const reverbGain = ctx.createGain();
        reverbGain.gain.value = 0;
        source.connect(convolver);
        convolver.connect(reverbGain);
        reverbGain.connect(ctx.destination);
        reverbGainRef.current = reverbGain;

        // Echo route
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.33; // 330ms
        const feedback = ctx.createGain();
        feedback.gain.value = 0.4;
        const echoGain = ctx.createGain();
        echoGain.gain.value = 0;

        source.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(echoGain);
        echoGain.connect(ctx.destination);
        echoGainRef.current = echoGain;
      };

      if (audioARef.current) setupDeck(audioARef.current, reverbGainARef, echoGainARef);
      if (audioBRef.current) setupDeck(audioBRef.current, reverbGainBRef, echoGainBRef);
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (audioARef.current) {
      if (isPlayingA) {
        initAudio();
        audioARef.current.play().catch(() => {});
      }
      else audioARef.current.pause();
    }
  }, [isPlayingA, deckA]);

  useEffect(() => {
    if (audioBRef.current) {
      if (isPlayingB) {
        initAudio();
        audioBRef.current.play().catch(() => {});
      }
      else audioBRef.current.pause();
    }
  }, [isPlayingB, deckB]);

  useEffect(() => {
    if (audioARef.current) audioARef.current.playbackRate = rateA;
  }, [rateA]);

  useEffect(() => {
    if (audioBRef.current) audioBRef.current.playbackRate = rateB;
  }, [rateB]);

  useEffect(() => {
    const val = crossfader;
    if (audioARef.current) {
      audioARef.current.volume = Math.min(1, 1 - val);
    }
    if (audioBRef.current) {
      audioBRef.current.volume = Math.min(1, 1 + val);
    }
  }, [crossfader]);

  useEffect(() => {
    if (reverbGainARef.current) reverbGainARef.current.gain.value = reverbA;
  }, [reverbA]);
  useEffect(() => {
    if (echoGainARef.current) echoGainARef.current.gain.value = echoA;
  }, [echoA]);
  useEffect(() => {
    if (reverbGainBRef.current) reverbGainBRef.current.gain.value = reverbB;
  }, [reverbB]);
  useEffect(() => {
    if (echoGainBRef.current) echoGainBRef.current.gain.value = echoB;
  }, [echoB]);

  const renderDeck = (
    deckId: 'A' | 'B',
    label: string, 
    track: Track | null, 
    setTrack: (t: Track) => void, 
    isPlaying: boolean, 
    setIsPlaying: (p: boolean) => void,
    rate: number,
    setRate: (r: number) => void,
    reverb: number,
    setReverb: (r: number) => void,
    echo: number,
    setEcho: (e: number) => void,
    audioRef: React.RefObject<HTMLAudioElement>
  ) => {
    const isOpen = openDropdown === deckId;
    
    return (
    <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-4 relative">
      <div className="flex justify-between items-center">
        <h3 className="font-bold tracking-tight text-cyan-400">{label}</h3>
        <div className="relative">
          <button 
            className="bg-black/50 text-white text-xs p-2 rounded border border-white/20 w-[150px] md:w-[200px] text-left truncate flex justify-between items-center"
            onClick={() => setOpenDropdown(isOpen ? null : deckId)}
          >
            <span className="truncate">{track?.title || "Selecionar Música"}</span>
            <span className="ml-2 text-white/50">▼</span>
          </button>
          
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-1 right-0 w-[200px] md:w-[250px] bg-[#111] border border-white/20 rounded-lg shadow-2xl z-50 overflow-hidden"
              >
                {playlist.length === 0 ? (
                  <div className="p-3 text-xs text-white/50 text-center">Nenhuma música na playlist</div>
                ) : (
                  <div style={{ height: Math.min(playlist.length * 36, 200) }}>
                    <AutoSizer renderProp={({ height, width }) => (
                        <ListWindow
                          height={height || 200}
                          itemCount={playlist.length}
                          itemSize={36}
                          width={width || 200}
                        >
                          {({ index, style }) => {
                            const t = playlist[index];
                            return (
                              <div 
                                style={style} 
                                className={`px-3 py-2 text-xs cursor-pointer truncate hover:bg-white/10 transition-colors ${track?.id === t.id ? 'text-cyan-400 bg-white/5' : 'text-white'}`}
                                onClick={() => {
                                  setTrack(t);
                                  setIsPlaying(true);
                                  setOpenDropdown(null);
                                }}
                              >
                                {t.title}
                              </div>
                            );
                          }}
                        </ListWindow>
                      )} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
        <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-4 ${isPlaying ? 'border-cyan-400 animate-[spin_4s_linear_infinite]' : 'border-white/20'} overflow-hidden relative`}>
          <img src={track?.cover || "https://picsum.photos/seed/dj/400/400"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-black rounded-full border-2 border-white/20" />
          </div>
        </div>
        
        <div className="text-center">
          <p className="font-bold text-sm md:text-base truncate w-48 md:w-64">{track?.title || "Nenhuma Música"}</p>
          <p className="text-xs md:text-sm text-white/50 truncate w-48 md:w-64">{track?.artist || "-"}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5 ml-1" />}
            </button>
            <button 
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  setIsPlaying(true);
                }
              }}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all font-bold text-[10px] md:text-xs"
            >
              CUE
            </button>
          </div>
          
          <div className="flex flex-col items-center w-24 md:w-32">
            <span className="text-[10px] text-white/50 mb-1">PITCH {(rate * 100).toFixed(0)}%</span>
            <input 
              type="range" 
              min="0.5" max="1.5" step="0.01" 
              value={rate} 
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        {/* Effects Controls */}
        <div className="flex gap-4 p-3 bg-black/30 rounded-xl border border-white/5">
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[10px] text-white/50 mb-1">REVERB</span>
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={reverb} 
              onChange={(e) => setReverb(parseFloat(e.target.value))}
              className="w-full accent-purple-400"
            />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[10px] text-white/50 mb-1">ECHO</span>
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={echo} 
              onChange={(e) => setEcho(parseFloat(e.target.value))}
              className="w-full accent-blue-400"
            />
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={track?.url} onEnded={() => setIsPlaying(false)} />
    </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-4 md:gap-6">
      <div className="flex flex-col md:flex-row gap-4 flex-1">
        {renderDeck('A', "DECK A", deckA, setDeckA, isPlayingA, setIsPlayingA, rateA, setRateA, reverbA, setReverbA, echoA, setEchoA, audioARef)}
        {renderDeck('B', "DECK B", deckB, setDeckB, isPlayingB, setIsPlayingB, rateB, setRateB, reverbB, setReverbB, echoB, setEchoB, audioBRef)}
      </div>
      
      <div className="bg-white/5 rounded-2xl p-4 md:p-6 border border-white/10 flex flex-col items-center gap-4">
        <h3 className="font-medium tracking-tight text-xs tracking-widest text-white/50 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> CROSSFADER
        </h3>
        <div className="w-full max-w-md flex items-center gap-4">
          <span className="text-cyan-400 font-bold text-sm">A</span>
          <input 
            type="range" 
            min="-1" max="1" step="0.01" 
            value={crossfader} 
            onChange={(e) => setCrossfader(parseFloat(e.target.value))}
            className="flex-1 accent-cyan-400 h-2 bg-white/10 rounded-full appearance-none"
          />
          <span className="text-cyan-400 font-bold text-sm">B</span>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [view, setView] = useState<'library' | 'player'>('library');
  const [activeTab, setActiveTab] = useState<Tab>('musica');
  const [activeSubTab, setActiveSubTab] = useState<PlaylistSubTab>('playlist');
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [background, setBackground] = useState('https://picsum.photos/seed/abstract/1920/1080');
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [language, setLanguage] = useState('pt');
  const [equalizer, setEqualizer] = useState({
    bass: 50,
    mid: 50,
    treble: 50
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);

  const currentTrack = currentTrackIndex >= 0 ? playlist[currentTrackIndex] : null;

  const filteredPlaylist = playlist.filter(track => 
    track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const metadataQueue = useRef<{file: File, id: string}[]>([]);
  const isProcessingMetadata = useRef(false);

  const processMetadataQueue = () => {
    if (metadataQueue.current.length === 0) {
      isProcessingMetadata.current = false;
      return;
    }
    isProcessingMetadata.current = true;
    
    const batch = metadataQueue.current.splice(0, 10);
    let completed = 0;
    const updates: Record<string, Partial<Track>> = {};

    const checkBatchComplete = () => {
      completed++;
      if (completed === batch.length) {
        if (Object.keys(updates).length > 0) {
          setPlaylist(prev => prev.map(t => {
            if (updates[t.id]) {
              return { ...t, ...updates[t.id] };
            }
            return t;
          }));
        }
        setTimeout(processMetadataQueue, 50);
      }
    };

    batch.forEach(({file, id}) => {
      jsmediatags.read(file, {
        onSuccess: function(tag) {
          let coverUrl: string | undefined;
          if (tag.tags.picture) {
            const data = tag.tags.picture.data;
            const format = tag.tags.picture.format;
            const byteArray = new Uint8Array(data);
            const blob = new Blob([byteArray], { type: format });
            coverUrl = URL.createObjectURL(blob);
          }
          
          updates[id] = {
            title: tag.tags.title || undefined,
            artist: tag.tags.artist || undefined,
            cover: coverUrl
          };
          checkBatchComplete();
        },
        onError: function(error) {
          checkBatchComplete();
        }
      });
    });
  };

  const queueMetadataLoad = (file: File, id: string) => {
    metadataQueue.current.push({file, id});
    if (!isProcessingMetadata.current) {
      processMetadataQueue();
    }
  };

  const initAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 200;
      bassFilterRef.current = bass;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      midFilterRef.current = mid;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 3000;
      trebleFilterRef.current = treble;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(ctx.destination);
      
      // Apply initial equalizer settings
      bass.gain.value = ((equalizer.bass - 50) / 50) * 12;
      mid.gain.value = ((equalizer.mid - 50) / 50) * 12;
      treble.gain.value = ((equalizer.treble - 50) / 50) * 12;
    }
  };

  useEffect(() => {
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = ((equalizer.bass - 50) / 50) * 12;
    }
    if (midFilterRef.current) {
      midFilterRef.current.gain.value = ((equalizer.mid - 50) / 50) * 12;
    }
    if (trebleFilterRef.current) {
      trebleFilterRef.current.gain.value = ((equalizer.treble - 50) / 50) * 12;
    }
  }, [equalizer]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (sleepTimer !== null && isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsPlaying(false);
        setSleepTimer(null);
      }, sleepTimer * 60 * 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sleepTimer, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        initAudioContext();
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const scanDirectory = async () => {
    const triggerFallback = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = "audio/*";
      (input as any).webkitdirectory = true;
      input.multiple = true;
      input.onchange = (e: any) => {
        if (e.target.files) addTracks(e.target.files);
      };
      input.click();
    };

    try {
      // Try to request persistent storage permission
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }

      // Check if we are in an iframe. showDirectoryPicker is often blocked in cross-origin iframes.
      const isInIframe = window.self !== window.top;

      // Use showDirectoryPicker if available AND not in an iframe (to avoid known security error)
      if ('showDirectoryPicker' in window && !isInIframe) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          const tracks: Track[] = [];
          const filesToProcess: {file: File, id: string}[] = [];
          
          async function processEntries(handle: any) {
            for await (const entry of handle.values()) {
              if (entry.kind === 'file') {
                const file = await entry.getFile();
                if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) {
                  const id = Math.random().toString(36).substr(2, 9);
                  tracks.push({
                    id,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Local Artist",
                    url: URL.createObjectURL(file),
                    cover: `https://picsum.photos/seed/${file.name}/400/400`
                  });
                  filesToProcess.push({ file, id });
                }
              } else if (entry.kind === 'directory') {
                await processEntries(entry);
              }
            }
          }
          
          await processEntries(dirHandle);
          if (tracks.length > 0) {
            setPlaylist(prev => {
              const newPlaylist = [...prev, ...tracks];
              if (currentTrackIndex === -1) {
                setCurrentTrackIndex(0);
                setIsPlaying(false);
              }
              return newPlaylist;
            });
            filesToProcess.forEach(({file, id}) => queueMetadataLoad(file, id));
          }
        } catch (pickerErr: any) {
          // If showDirectoryPicker fails due to security or other reasons, use fallback
          console.warn("showDirectoryPicker failed, falling back to input method", pickerErr);
          triggerFallback();
        }
      } else {
        // Fallback for browsers without showDirectoryPicker or when in an iframe
        triggerFallback();
      }
    } catch (err) {
      console.error("Directory access failed", err);
      // Final fallback attempt
      triggerFallback();
    }
  };

  const addTracks = (files: FileList) => {
    const validFiles = Array.from(files)
      .filter(file => file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a'));
      
    const newTracks: Track[] = validFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Local Artist",
        url: URL.createObjectURL(file),
        cover: `https://picsum.photos/seed/${file.name}/400/400`
      }));
    
    setPlaylist(prev => [...prev, ...newTracks]);
    if (currentTrackIndex === -1 && newTracks.length > 0) {
      setCurrentTrackIndex(0);
    }

    validFiles.forEach((file, index) => {
      queueMetadataLoad(file, newTracks[index].id);
    });
  };

  const playTrack = (track: Track) => {
    const index = playlist.findIndex(t => t.id === track.id);
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    if (playlist.length === 0) return;
    setCurrentTrackIndex((currentTrackIndex + 1) % playlist.length);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    setCurrentTrackIndex((currentTrackIndex - 1 + playlist.length) % playlist.length);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const NavItem = ({ 
    icon: Icon, 
    label, 
    active, 
    onClick,
    hasSubItems = false,
    mobileOnly = false,
    desktopOnly = false
  }: { 
    icon: any, 
    label: string, 
    active: boolean, 
    onClick: () => void,
    hasSubItems?: boolean,
    mobileOnly?: boolean,
    desktopOnly?: boolean
  }) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all group whitespace-nowrap 
        ${active ? 'bg-cyan-400/10 text-cyan-400' : 'text-white/60 hover:text-white hover:bg-white/5'}
        ${mobileOnly ? 'flex md:hidden' : ''}
        ${desktopOnly ? 'hidden md:flex' : ''}
      `}
    >
      <Icon className={`w-4 h-4 ${active ? 'neon-text-cyan' : ''}`} />
      <span className="font-sans font-semibold tracking-wide text-sm">{label}</span>
      {hasSubItems && (
        <ChevronDown className={`w-3 h-3 transition-transform ${active ? 'rotate-180' : ''}`} />
      )}
    </button>
  );

  const MobileNavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${active ? 'text-cyan-400' : 'text-white/40'}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'neon-text-cyan' : ''}`} />
      <span className="text-[10px] font-medium tracking-tight uppercase tracking-tighter">{label}</span>
    </button>
  );

  const SidebarItem = ({ icon: Icon, active, onClick, label }: { icon: any; active: boolean; onClick: () => void; label: string }) => (
    <button 
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${active ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
      title={label}
    >
      <Icon className="w-6 h-6" />
      <span className="absolute left-full ml-4 px-2 py-1 bg-cyan-400 text-black text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute -left-4 w-1 h-8 bg-cyan-400 rounded-r-full neon-glow-cyan"
        />
      )}
    </button>
  );

  const MobilePlaybackButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    active = false, 
    isMain = false 
  }: { 
    icon: any, 
    label: string, 
    onClick: () => void, 
    active?: boolean, 
    isMain?: boolean 
  }) => (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-2 transition-all ${isMain ? 'text-cyan-400 scale-110' : active ? 'text-cyan-400' : 'text-white/40'}`}
    >
      <div className={`${isMain ? 'bg-cyan-400/10 p-2 rounded-full border border-cyan-400/30' : ''}`}>
        <Icon className={`w-5 h-5 ${isMain || active ? 'neon-text-cyan' : ''}`} />
      </div>
      <span className="text-[8px] font-medium tracking-tight uppercase tracking-tighter opacity-60">{label}</span>
    </button>
  );

  const NavSubItem = ({ label, active, onClick, icon: Icon }: { label: string, active: boolean, onClick: () => void, icon?: any }) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${active ? 'text-violet-400 bg-violet-400/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span className="font-sans">{label}</span>
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "1.2em" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-4"
            >
              <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white tracking-[1.2em] neon-text-cyan ml-[1.2em]">
                SONNOR
              </h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-1 bg-cyan-400 neon-glow-cyan rounded-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`h-screen w-full bg-[#050505] text-white flex flex-col overflow-hidden relative ${activeTab === 'dj' ? 'force-landscape' : ''}`}>
      {/* Dynamic Background */}
      <div 
        className="fixed inset-0 z-0 transition-all duration-1000"
        style={{ 
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-3xl" />
      </div>

      <audio 
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={nextTrack}
      />

      {/* Header & Navigation */}
      <header className="z-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0">
        <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 md:gap-8">
            <h1 className="font-medium tracking-tight text-lg md:text-xl font-bold tracking-widest neon-text-cyan shrink-0">
              SONNOR
            </h1>
          </div>

          <div className="flex gap-2 md:gap-4 items-center flex-1 justify-end">
            <div className="relative hidden sm:block max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-10 text-sm focus:outline-none focus:border-cyan-400/50 transition-all font-sans"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button 
              onClick={scanDirectory}
              className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-cyan-400 text-black rounded-lg md:rounded-xl font-sans font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              <Upload className="w-3.5 h-3.5 md:w-4 h-4" />
              <span className="text-xs md:text-base hidden sm:inline">Sincronizar</span>
              <span className="text-xs md:text-base sm:hidden">Sync</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation (Moved to Top) */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto no-scrollbar px-4 pb-2 border-t border-white/5 pt-2">
          <NavItem 
            icon={Music} 
            label="Música" 
            active={activeTab === 'musica'} 
            onClick={() => { setActiveTab('musica'); setView('library'); }} 
          />
          <NavItem 
            icon={Disc} 
            label="Álbum" 
            active={activeTab === 'album'} 
            onClick={() => setActiveTab('album')} 
          />
          <NavItem 
            icon={ListMusic} 
            label="Playlist" 
            active={activeTab === 'playlist'} 
            onClick={() => setActiveTab('playlist')}
          />
          <NavItem 
            icon={Disc3} 
            label="DJ" 
            active={activeTab === 'dj'} 
            onClick={() => { setActiveTab('dj'); setView('library'); }} 
          />
          <NavItem 
            icon={Settings} 
            label="Definição" 
            active={activeTab === 'definicao'} 
            onClick={() => setActiveTab('definicao')} 
          />
        </nav>

        {/* Sub-navigation (Available only when Playlist is active) */}
        <AnimatePresence>
          {activeTab === 'playlist' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 md:px-6 py-2 border-t border-white/5 bg-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar"
            >
              <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium tracking-tight mr-2 shrink-0">Playlist:</span>
              <NavSubItem 
                label="Playlist" 
                active={activeTab === 'playlist' && activeSubTab === 'playlist'} 
                onClick={() => { setActiveTab('playlist'); setActiveSubTab('playlist'); }} 
                icon={List}
              />
              <NavSubItem 
                label="Recentes" 
                active={activeTab === 'playlist' && activeSubTab === 'recentes'} 
                onClick={() => { setActiveTab('playlist'); setActiveSubTab('recentes'); }} 
                icon={Clock}
              />
              <NavSubItem 
                label="Tocadas" 
                active={activeTab === 'playlist' && activeSubTab === 'tocadas'} 
                onClick={() => { setActiveTab('playlist'); setActiveSubTab('tocadas'); }} 
                icon={History}
              />
              <NavSubItem 
                label="Mais Tocadas" 
                active={activeTab === 'playlist' && activeSubTab === 'mais_tocadas'} 
                onClick={() => { setActiveTab('playlist'); setActiveSubTab('mais_tocadas'); }} 
                icon={TrendingUp}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="flex flex-1 overflow-hidden z-10">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:flex flex-col w-20 border-r border-white/5 bg-[#050505]/40 backdrop-blur-md py-6 items-center gap-8 shrink-0">
          <SidebarItem 
            icon={Music} 
            active={activeTab === 'musica'} 
            onClick={() => { setActiveTab('musica'); setView('library'); }} 
            label="Música"
          />
          <SidebarItem 
            icon={Disc} 
            active={activeTab === 'album'} 
            onClick={() => setActiveTab('album')} 
            label="Álbum"
          />
          <SidebarItem 
            icon={ListMusic} 
            active={activeTab === 'playlist'} 
            onClick={() => setActiveTab('playlist')}
            label="Playlist"
          />
          <SidebarItem 
            icon={Disc3} 
            active={activeTab === 'dj'} 
            onClick={() => { setActiveTab('dj'); setView('library'); }} 
            label="DJ"
          />
          <SidebarItem 
            icon={Settings} 
            active={activeTab === 'definicao'} 
            onClick={() => setActiveTab('definicao')} 
            label="Definição"
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-6 pb-32 md:pb-24 overflow-y-auto relative no-scrollbar">
          <AnimatePresence mode="wait">
            {view === 'library' ? (
              <motion.div 
                key={`${activeTab}-${activeSubTab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 pt-4 md:pt-6"
              >
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-semibold text-white/80 capitalize">
                    {activeTab === 'definicao' ? 'Definições' : activeTab === 'playlist' ? `${activeSubTab.replace('_', ' ')}` : activeTab}
                  </h2>
                  <button 
                    onClick={() => setView('player')}
                    className="text-cyan-400 text-xs md:text-sm flex items-center gap-2 hover:underline"
                  >
                    Player <Maximize2 className="w-3.5 h-3.5 md:w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Search Bar */}
                <div className="sm:hidden relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input 
                    type="text"
                    placeholder="Pesquisar músicas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-cyan-400/50 transition-all font-sans"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {activeTab === 'dj' ? (
                  <VirtualDJ playlist={playlist} />
                ) : activeTab === 'definicao' ? (
                  <div className="space-y-6 pb-10">
                    {/* Background Selection */}
                    <section className="space-y-3">
                      <h3 className="text-sm font-medium tracking-tight text-cyan-400/80 tracking-widest flex items-center gap-2">
                        <Disc className="w-4 h-4" /> PAPEL DE PAREDE
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          'https://picsum.photos/seed/abstract/1920/1080',
                          'https://picsum.photos/seed/space/1920/1080',
                          'https://picsum.photos/seed/nature/1920/1080',
                          'https://picsum.photos/seed/city/1920/1080'
                        ].map((bg, idx) => (
                          <motion.div 
                            key={idx}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setBackground(bg)}
                            className={`h-20 rounded-xl cursor-pointer border-2 transition-all overflow-hidden ${background === bg ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-transparent'}`}
                          >
                            <img src={bg} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          </motion.div>
                        ))}
                      </div>
                    </section>

                    {/* Sleep Timer */}
                    <section className="space-y-3">
                      <h3 className="text-sm font-medium tracking-tight text-cyan-400/80 tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4" /> TEMPORIZADOR (SLEEP)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {[15, 30, 45, 60, null].map((time) => (
                          <button
                            key={time === null ? 'off' : time}
                            onClick={() => setSleepTimer(time)}
                            className={`px-4 py-2 rounded-lg font-sans text-sm transition-all ${sleepTimer === time ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                          >
                            {time === null ? 'Desligado' : `${time} min`}
                          </button>
                        ))}
                      </div>
                      {sleepTimer && (
                        <p className="text-[10px] text-cyan-400/60 font-mono">A música irá parar em {sleepTimer} minutos.</p>
                      )}
                    </section>

                    {/* Language Selection */}
                    <section className="space-y-3">
                      <h3 className="text-sm font-medium tracking-tight text-cyan-400/80 tracking-widest flex items-center gap-2">
                        <List className="w-4 h-4" /> IDIOMA
                      </h3>
                      <div className="flex gap-2">
                        {[
                          { code: 'pt', name: 'Português' },
                          { code: 'en', name: 'English' },
                          { code: 'fr', name: 'Français' }
                        ].map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={`px-4 py-2 rounded-lg font-sans text-sm transition-all ${language === lang.code ? 'bg-violet-500 text-white font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                          >
                            {lang.name}
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Equalizer */}
                    <section className="space-y-4">
                      <h3 className="text-sm font-medium tracking-tight text-cyan-400/80 tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> EQUALIZADOR
                      </h3>
                      <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                        {(['bass', 'mid', 'treble'] as const).map((band) => (
                          <div key={band} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-medium tracking-tight text-white/40 uppercase tracking-tighter">
                              <span>{band}</span>
                              <span className="text-cyan-400">{equalizer[band]}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={equalizer[band]}
                              onChange={(e) => setEqualizer({ ...equalizer, [band]: parseInt(e.target.value) })}
                              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
                            />
                          </div>
                        ))}
                        <div className="flex justify-center gap-4 pt-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <motion.div 
                              key={i}
                              animate={{ height: [10, 30, 10] }}
                              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                              className="w-1 bg-cyan-400/40 rounded-full"
                              style={{ height: `${20 + Math.random() * 20}px` }}
                            />
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                ) : playlist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 px-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full animate-pulse" />
                      <Music className="w-16 h-16 md:w-24 h-24 text-white/20 relative z-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl md:text-2xl font-medium tracking-tight font-bold text-white/80">Biblioteca Vazia</h3>
                      <p className="text-xs md:text-sm text-white/40 font-sans max-w-xs mx-auto">
                        Para começar a ouvir, conceda permissão para o SONNOR ler as músicas do seu dispositivo.
                      </p>
                    </div>
                    <button 
                      onClick={scanDirectory}
                      className="px-6 md:px-8 py-3 md:py-4 bg-cyan-400 text-black rounded-full font-medium tracking-tight text-xs md:text-sm font-bold tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                    >
                      PERMITIR ACESSO
                    </button>
                  </div>
                ) : filteredPlaylist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[40vh] text-center space-y-4">
                    <Search className="w-12 h-12 text-white/10" />
                    <p className="text-white/40 font-sans">Nenhum resultado encontrado para "{searchTerm}"</p>
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="text-cyan-400 text-xs hover:underline"
                    >
                      Limpar pesquisa
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 w-full h-full min-h-[400px]">
                    <AutoSizer renderProp={({ height, width }) => (
                        <ListWindow
                          height={height || 400}
                          itemCount={filteredPlaylist.length}
                          itemSize={80}
                          width={width || 400}
                          className="custom-scrollbar"
                        >
                          {({ index, style }) => {
                            const track = filteredPlaylist[index];
                            return (
                              <div style={style} className="pr-2 pb-2">
                                <motion.div 
                                  key={track.id}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => playTrack(track)}
                                >
                                  <GlassBox className={`flex items-center gap-3 md:gap-4 cursor-pointer border-l-4 transition-all ${currentTrack?.id === track.id ? 'border-l-cyan-400 bg-white/10' : 'border-l-transparent'}`}>
                                    <div className="w-6 text-center font-mono text-[10px] text-white/30 flex-shrink-0">
                                      {(index + 1).toString().padStart(2, '0')}
                                    </div>
                                    <div className="w-10 h-10 md:w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                      <img src={track.cover} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold truncate text-sm md:text-base text-white/90">{track.title}</h3>
                                      <p className="text-xs md:text-sm text-white/50 truncate font-sans">{track.artist}</p>
                                    </div>
                                    {currentTrack?.id === track.id && isPlaying && (
                                      <div className="flex gap-0.5 md:gap-1 items-end h-3 md:h-4">
                                        {[1, 2, 3, 4].map(i => (
                                          <motion.div 
                                            key={i}
                                            animate={{ height: [4, 12, 4] }}
                                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                            className="w-0.5 md:w-1 bg-cyan-400 rounded-full"
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </GlassBox>
                                </motion.div>
                              </div>
                            );
                          }}
                        </ListWindow>
                      )} />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="player"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-between p-6 md:p-12"
              >
                {/* Background Glows for Player */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="w-full flex justify-between items-center z-10">
                  <button 
                    onClick={() => setView('library')}
                    className="text-white/60 p-2 hover:bg-white/5 rounded-full transition-all"
                  >
                    <ChevronDown className="w-8 h-8" />
                  </button>
                  <span className="font-medium tracking-tight text-xs tracking-[0.3em] text-cyan-400/60">NOW PLAYING</span>
                  <button className="text-white/60 p-2 hover:bg-white/5 rounded-full transition-all">
                    <ListMusic className="w-6 h-6" />
                  </button>
                </div>

                {/* Rotating Vinyl/Cover */}
                <div className="relative group z-10 my-8">
                  <div className="absolute inset-0 bg-cyan-500/20 blur-[80px] rounded-full group-hover:bg-cyan-500/30 transition-all" />
                  <motion.div 
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full border-8 border-white/5 overflow-hidden shadow-2xl"
                  >
                    <img 
                      src={currentTrack?.cover || "https://picsum.photos/seed/music/800/800"} 
                      alt="Album Art" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-[#050505] rounded-full border-4 border-white/10" />
                    </div>
                  </motion.div>
                </div>

                {/* Track Info */}
                <div className="text-center space-y-2 z-10">
                  <h2 className="text-2xl md:text-4xl font-medium tracking-tight font-bold text-white neon-text-cyan px-4">
                    {currentTrack?.title || "No Track Selected"}
                  </h2>
                </div>

                {/* Controls & Slider */}
                <div className="w-full max-w-md space-y-8 z-10 pb-8">
                  <div className="space-y-3">
                    <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="absolute h-full bg-cyan-400 neon-glow-cyan"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                      />
                      <input 
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={(e) => seek(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] md:text-xs font-mono text-white/30 tracking-widest">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button className="text-white/30 hover:text-white transition-colors p-2"><Shuffle className="w-5 h-5" /></button>
                    <div className="flex items-center gap-4 md:gap-8">
                      <button onClick={prevTrack} className="text-white/60 hover:text-cyan-400 transition-colors p-2"><SkipBack className="w-8 h-8 md:w-10 md:h-10" /></button>
                      <NeonButton onClick={togglePlay} className="p-6 md:p-8">
                        {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-current" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />}
                      </NeonButton>
                      <button onClick={nextTrack} className="text-white/60 hover:text-cyan-400 transition-colors p-2"><SkipForward className="w-8 h-8 md:w-10 md:h-10" /></button>
                    </div>
                    <button className="text-white/30 hover:text-white transition-colors p-2"><Repeat className="w-5 h-5" /></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mini Player (only in library view) */}
      {view === 'library' && currentTrack && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-16 md:bottom-0 left-0 right-0 p-3 md:p-4 z-20"
        >
          <GlassBox className="flex items-center gap-3 md:gap-4 border-t border-white/10 !rounded-2xl md:!rounded-b-none neon-glow-violet mx-auto max-w-5xl">
            <div 
              className="flex-1 flex items-center gap-3 md:gap-4 cursor-pointer min-w-0"
              onClick={() => setView('player')}
            >
              <div className="w-10 h-10 md:w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={currentTrack.cover} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold truncate text-xs md:text-sm">{currentTrack.title}</h4>
                <p className="text-[10px] md:text-xs text-white/50 truncate">{currentTrack.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 md:flex hidden">
              <button onClick={prevTrack} className="text-white/60 hover:text-cyan-400"><SkipBack className="w-5 h-5" /></button>
              <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button onClick={nextTrack} className="text-white/60 hover:text-cyan-400"><SkipForward className="w-5 h-5" /></button>
            </div>
          </GlassBox>
        </motion.div>
      )}

      {/* Bottom Playback Controls (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#050505]/95 backdrop-blur-2xl border-t border-white/5 flex items-center justify-center gap-6 px-2 py-1">
        <MobilePlaybackButton 
          icon={Shuffle} 
          label="Ordem" 
          onClick={() => setIsShuffle(!isShuffle)} 
          active={isShuffle}
        />
        <MobilePlaybackButton 
          icon={SkipBack} 
          label="Recuar" 
          onClick={prevTrack} 
        />
        <MobilePlaybackButton 
          icon={isPlaying ? Pause : Play} 
          label={isPlaying ? "Pausar" : "Tocar"} 
          onClick={togglePlay}
          isMain
        />
        <MobilePlaybackButton 
          icon={SkipForward} 
          label="Avançar" 
          onClick={nextTrack} 
        />
        <MobilePlaybackButton 
          icon={Repeat} 
          label="Repetir" 
          onClick={() => setIsRepeat(!isRepeat)} 
          active={isRepeat}
        />
      </nav>
    </div>
    </>
  );
}
