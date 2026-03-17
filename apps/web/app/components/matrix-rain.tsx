'use client';

import { useEffect, useRef } from 'react';

const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789PRECLAIM';
const FONT_SIZE = 14;
const FRAME_INTERVAL = 45;

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    let animationId: number;
    let columns: number;
    let drops: number[];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      columns = Math.floor(canvas.width / FONT_SIZE);
      drops = Array.from({ length: columns }, () => Math.random() * -100);
    };

    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;

    const draw = (time: number) => {
      animationId = requestAnimationFrame(draw);

      if (time - lastTime < FRAME_INTERVAL) return;
      lastTime = time;

      // Slow fade creates natural trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < columns; i++) {
        if (drops[i] < 0) {
          drops[i]++;
          continue;
        }

        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        // Occasional bright "head" character, mostly dim trail
        const brightness = Math.random() > 0.95 ? 0.7 : 0.12;
        ctx.fillStyle = `rgba(0, 255, 65, ${brightness})`;
        ctx.fillText(char, x, y);

        // Reset column when it goes off screen
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = Math.random() * -30;
        }
        drops[i]++;
      }
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
