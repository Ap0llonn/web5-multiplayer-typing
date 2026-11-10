"use client";
import { useEffect, useRef } from "react";

export function usePodiumAudio(
  enabled: boolean,
  search: number,
  winner: number,
  muted: boolean,
) {
  const gainRef = useRef<GainNode | null>(null);
  useEffect(() => {
    if (!enabled || !window.AudioContext) return;
    const context = new AudioContext();
    const volume = context.createGain();
    gainRef.current = volume;
    volume.gain.value = 0.65;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 6;
    volume.connect(compressor);
    compressor.connect(context.destination);
    const controller = new AbortController();
    const started = performance.now();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let buffers: AudioBuffer[] | null = null;
    let scheduled = false;
    let disposed = false;
    const play = async () => {
      try {
        await context.resume();
        if (disposed || scheduled || !buffers || context.state !== "running")
          return;
        scheduled = true;
        const elapsed = (performance.now() - started) / 1000;
        const clip = (
          buffer: AudioBuffer,
          begin: number,
          end: number,
          offset: number,
          level: number,
        ) => {
          if (elapsed >= end) return;
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = buffer;
          gain.gain.value = level;
          source.connect(gain);
          gain.connect(volume);
          const seek = offset + Math.max(0, elapsed - begin);
          const duration = Math.min(
            end - Math.max(begin, elapsed),
            buffer.duration - seek,
          );
          if (duration <= 0) return;
          source.start(
            context.currentTime + Math.max(0.01, begin - elapsed),
            seek,
            duration,
          );
          source.onended = () => {
            source.disconnect();
            gain.disconnect();
          };
        };
        if (!reduced) clip(buffers[0], search, winner, 1, 2);
        const reveal = reduced ? 0 : winner;
        clip(buffers[1], reveal, reveal + buffers[1].duration, 0, 0.85);
      } catch {
        /* Resume is retried on interaction when autoplay is blocked. */
      }
    };
    void Promise.all(
      ["/audio/drum-roll.wav", "/audio/crowd-cheer.ogg"].map(async (path) => {
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) throw new Error("Audio asset unavailable");
        return context.decodeAudioData(await response.arrayBuffer());
      }),
    )
      .then((decoded) => {
        buffers = decoded;
        if (!disposed) void play();
      })
      .catch(() => {});
    window.addEventListener("pointerdown", play);
    window.addEventListener("keydown", play);
    return () => {
      disposed = true;
      controller.abort();
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
      void context.close().catch(() => {});
    };
  }, [enabled, search, winner]);
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 0.65;
  }, [muted]);
}
