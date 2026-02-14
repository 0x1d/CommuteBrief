
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { decodeAudioBuffer } from '../services/geminiService';

interface AudioPlayerProps {
  audioData: Uint8Array;
  text: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop(0);
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    setIsPlaying(false);
  }, []);

  const playAudio = async (startFrom: number = 0) => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }

    if (!bufferRef.current) {
      bufferRef.current = await decodeAudioBuffer(audioData, audioContextRef.current);
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = bufferRef.current;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      if (isPlaying) stopAudio();
    };

    const now = audioContextRef.current.currentTime;
    source.start(0, startFrom);
    
    sourceNodeRef.current = source;
    startTimeRef.current = now - startFrom;
    setIsPlaying(true);

    const updateProgress = () => {
      if (audioContextRef.current && bufferRef.current) {
        const current = audioContextRef.current.currentTime - startTimeRef.current;
        const dur = bufferRef.current.duration;
        setProgress((current / dur) * 100);
        if (current < dur) {
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
          stopAudio();
          setProgress(0);
        }
      }
    };
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handleToggle = () => {
    if (isPlaying) {
      pauseTimeRef.current = (audioContextRef.current?.currentTime || 0) - startTimeRef.current;
      stopAudio();
    } else {
      playAudio(pauseTimeRef.current);
    }
  };

  const handleReset = () => {
    stopAudio();
    pauseTimeRef.current = 0;
    setProgress(0);
    playAudio(0);
  };

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-2xl w-full max-w-2xl mx-auto border border-slate-800">
      <div className="flex items-center space-x-4 mb-6">
        <div className="bg-indigo-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <i className="fa-solid fa-broadcast-tower text-2xl"></i>
        </div>
        <div>
          <h3 className="font-black text-xl tracking-tight">Your Commute Brief</h3>
          <p className="text-slate-300 text-sm font-bold uppercase tracking-widest">Personalized AI Radio</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-5 mb-6 border border-slate-700 shadow-inner">
        <p className="text-white text-base font-medium italic leading-relaxed line-clamp-4">
          "{text}"
        </p>
      </div>

      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden mb-6 shadow-inner">
        <div 
          className="absolute h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4">
        <button 
          onClick={handleReset}
          className="p-3 text-slate-300 hover:text-white transition-colors hover:scale-110 active:scale-90"
          title="Restart"
        >
          <i className="fa-solid fa-backward-step text-2xl"></i>
        </button>

        <button 
          onClick={handleToggle}
          className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          {isPlaying ? (
            <i className="fa-solid fa-pause text-3xl"></i>
          ) : (
            <i className="fa-solid fa-play text-3xl ml-1.5"></i>
          )}
        </button>

        <button className="p-3 text-slate-400 cursor-not-allowed">
          <i className="fa-solid fa-forward-step text-2xl"></i>
        </button>
      </div>
    </div>
  );
};
