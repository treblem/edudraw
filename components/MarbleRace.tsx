import React, { useEffect, useRef } from 'react';
import { WHEEL_COLORS } from '../types';
import { playDrawSound } from '../utils';

interface MarbleRaceProps {
  names: string[];
  winnerName: string | null;
  isRunning: boolean;
  onRaceEnd: () => void;
}

interface Marble {
  name: string;
  x: number;
  y: number;
  color: string;
  duration: number; // Time in ms to reach finish
  wobbleOffset: number;
  isWinner: boolean;
}

const MarbleRace: React.FC<MarbleRaceProps> = ({ names, winnerName, isRunning, onRaceEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning || !winnerName || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = containerRef.current.clientWidth;
    const height = Math.min(width * 1.5, 600); // Taller aspect ratio
    canvas.width = width;
    canvas.height = height;

    const trackPadding = 40;
    const finishY = height - 50;
    const marbleRadius = Math.min(15, (width - trackPadding * 2) / (names.length * 2));
    
    // Calculate lanes
    const totalLaneWidth = width - trackPadding * 2;
    const laneWidth = totalLaneWidth / names.length;

    // Setup marbles with time-based logic (Deterministic finish)
    const BASE_DURATION = 3000; // Winner takes 3s
    
    const marbles: Marble[] = names.map((name, i) => {
      const isWinner = name === winnerName;
      // Winner is exactly BASE_DURATION. Others are slower (BASE + random 0.5s to 2s).
      const duration = isWinner ? BASE_DURATION : BASE_DURATION + 500 + Math.random() * 1500;
      
      return {
        name,
        x: trackPadding + (i * laneWidth) + (laneWidth / 2),
        y: marbleRadius,
        color: WHEEL_COLORS[i % WHEEL_COLORS.length],
        duration,
        wobbleOffset: Math.random() * 1000,
        isWinner
      };
    });

    let winnerDeclared = false;
    startTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;

      ctx.clearRect(0, 0, width, height);

      // Draw Background / Track
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#312e81');
      gradient.addColorStop(1, '#4338ca');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw Lanes
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= names.length; i++) {
        const x = trackPadding + i * laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Finish Line
      ctx.fillStyle = '#ef4444'; // Checkerboard base color red
      const checkSize = 10;
      const numChecks = width / checkSize;
      for (let i = 0; i < numChecks; i++) {
         ctx.fillStyle = (i % 2 === 0) ? '#ffffff' : '#000000';
         ctx.fillRect(i * checkSize, finishY, checkSize, 10);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("FINISH", width / 2, finishY + 35);


      // Update and Draw Marbles
      if (winnerDeclared) {
        // Simple celebration static view
         marbles.forEach(m => {
             // Keep them at bottom
             m.y = finishY + marbleRadius; 
             drawMarble(ctx, m, marbleRadius);
         });
         
         // Winner Banner
         ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
         ctx.fillRect(width / 2 - 150, height / 2 - 60, 300, 120);
         ctx.strokeStyle = '#f59e0b';
         ctx.lineWidth = 4;
         ctx.strokeRect(width / 2 - 150, height / 2 - 60, 300, 120);
         
         ctx.fillStyle = '#f59e0b';
         ctx.font = 'bold 30px Inter, sans-serif';
         ctx.fillText('WINNER', width / 2, height / 2 - 10);
         ctx.fillStyle = '#1f2937';
         ctx.font = '24px Inter, sans-serif';
         ctx.fillText(winnerName.toUpperCase(), width / 2, height / 2 + 30);

      } else {
          // Racing logic
          let finishedCount = 0;

          marbles.forEach(m => {
            // Calculate Y based on progress (0 to 1) over duration
            const progress = Math.min(1, elapsed / m.duration);
            // Ease in-out
            const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const startY = marbleRadius;
            const endY = finishY - marbleRadius; // Center of marble at finish line
            m.y = startY + (endY - startY) * ease;

            // Add slight X wobble
            const wobble = Math.sin((elapsed + m.wobbleOffset) / 200) * (laneWidth * 0.15);
            
            drawMarble(ctx, { ...m, x: m.x + wobble }, marbleRadius);

            if (progress >= 1) finishedCount++;
          });

          if (elapsed >= BASE_DURATION + 500) { // Wait a bit after winner crosses
              winnerDeclared = true;
              playDrawSound();
              setTimeout(onRaceEnd, 2000);
          }
      }

      if (!winnerDeclared || elapsed < BASE_DURATION + 3000) {
           requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [names, winnerName, isRunning, onRaceEnd]);

  const drawMarble = (ctx: CanvasRenderingContext2D, m: Marble, radius: number) => {
      // Shadow
      ctx.beginPath();
      ctx.arc(m.x + 2, m.y + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Shine
      ctx.beginPath();
      ctx.arc(m.x - radius * 0.3, m.y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();

      // Name label (above marble if racing, below if finished? Just above is cleaner)
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(m.name, m.x, m.y - radius - 5);
      ctx.shadowBlur = 0;
  };

  // Static Render (when not running)
  useEffect(() => {
    if (isRunning || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = containerRef.current.clientWidth;
    const height = Math.min(width * 1.5, 600);
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#312e81');
    gradient.addColorStop(1, '#4338ca');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.textAlign = 'center';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText("Press Start to Race", width/2, height/2);

  }, [isRunning, names]);


  return (
    <div ref={containerRef} className="w-full h-full flex justify-center items-center p-2">
      <canvas ref={canvasRef} className="border-4 border-indigo-500 bg-indigo-900 rounded-xl w-full h-full shadow-2xl" />
    </div>
  );
};

export default MarbleRace;
