import React, { useEffect, useRef } from 'react';
import { WHEEL_COLORS } from '../types';
import { playDrawSound } from '../utils';

interface DuckRaceProps {
  names: string[];
  winnerName: string | null;
  isRunning: boolean;
  onRaceEnd: () => void;
}

interface Duck {
  name: string;
  x: number;
  y: number;
  baseSpeed: number;
  color: string;
  isWinner: boolean;
}

const FINISH_BUFFER = 40;

const DuckRace: React.FC<DuckRaceProps> = ({ names, winnerName, isRunning, onRaceEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  // Initialize and run the race
  useEffect(() => {
    if (!isRunning || !winnerName || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    const width = containerRef.current.clientWidth;
    const height = Math.min(width * 0.8, 600);
    canvas.width = width;
    canvas.height = height;

    const finishLineX = width * 0.95 - FINISH_BUFFER;
    const numDucks = names.length;
    const laneHeight = height / (numDucks + 1);
    const START_X = 50;

    const MIN_SPEED = 120;
    const MAX_SPEED = 200;
    const WINNER_BOOST = 1.15;

    // Setup ducks
    let maxNonWinnerSpeed = MIN_SPEED;
    const ducks: Duck[] = names.map((name, i) => {
      const isWinner = name === winnerName;
      const baseSpeed = Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED;
      if (!isWinner) maxNonWinnerSpeed = Math.max(maxNonWinnerSpeed, baseSpeed);
      
      return {
        name,
        x: START_X,
        y: laneHeight * (i + 1),
        baseSpeed,
        color: WHEEL_COLORS[i % WHEEL_COLORS.length],
        isWinner
      };
    });

    // Ensure winner is fastest
    const winnerSpeed = maxNonWinnerSpeed * WINNER_BOOST;
    ducks.forEach(d => {
      if (d.isWinner) d.baseSpeed = winnerSpeed;
    });

    let winnerDeclared = false;
    startTimeRef.current = 0;
    let lastTime = 0;

    const drawDuck = (ctx: CanvasRenderingContext2D, duck: Duck, time: number) => {
        const size = 20;
        const x = duck.x;
        const floatOffset = Math.sin(time / 200 + duck.y / 2) * 2;
        const y = duck.y + floatOffset;

        // Water ripple
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x - size * 0.8, y + size * 0.8, size * 0.6, size * 0.2, 0, 0, Math.PI);
        ctx.fill();

        // Body
        ctx.fillStyle = duck.color;
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, size * 1.5, size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(x + size * 0.8, y - size * 0.4, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.arc(x + size * 1.1, y - size * 0.5, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#ffb300';
        ctx.beginPath();
        ctx.moveTo(x + size * 1.4, y - size * 0.4);
        ctx.lineTo(x + size * 2.0, y - size * 0.3);
        ctx.lineTo(x + size * 1.4, y - size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Name
        ctx.fillStyle = '#1f2937';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(duck.name, x, y - size * 1.8);
    };

    const drawTrack = (ctx: CanvasRenderingContext2D, time: number) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#81c7ff');
        gradient.addColorStop(1, '#42a5f5');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Waves
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        const waveOffset = Math.sin(time / 500) * 5;
        for (let y = 10; y < height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y + waveOffset);
            for (let x = 0; x < width; x += 20) {
                const wave = Math.sin((x * 0.1) + time / 150) * 3;
                ctx.lineTo(x, y + wave + waveOffset);
            }
            ctx.stroke();
        }

        // Finish Line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(finishLineX + FINISH_BUFFER, 0);
        ctx.lineTo(finishLineX + FINISH_BUFFER, height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(finishLineX + FINISH_BUFFER - 40, 10, 80, 25);
        ctx.fillStyle = '#ef4444';
        ctx.font = '18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FINISH', finishLineX + FINISH_BUFFER, 30);
    };

    const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
            lastTime = timestamp;
        }
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (winnerDeclared) {
            drawTrack(ctx, timestamp);
            ducks.forEach(d => drawDuck(ctx, d, timestamp));
            
            // Winner Banner
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(width / 2 - 150, height / 2 - 50, 300, 100);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 5;
            ctx.strokeRect(width / 2 - 150, height / 2 - 50, 300, 100);
            ctx.fillStyle = '#10b981';
            ctx.font = '28px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('WINNER:', width / 2, height / 2 - 10);
            ctx.fillText(winnerName.toUpperCase(), width / 2, height / 2 + 30);
            return; 
        }

        ctx.clearRect(0, 0, width, height);
        drawTrack(ctx, timestamp);

        ducks.forEach(duck => {
            if (duck.x < finishLineX) {
                const wobble = Math.sin(timestamp / 1000 + duck.y / 5) * 0.15;
                const currentSpeed = duck.baseSpeed * (1 + wobble);
                duck.x += currentSpeed * deltaTime;
                if (duck.x >= finishLineX) duck.x = finishLineX;
            }
            drawDuck(ctx, duck, timestamp);
        });

        const winnerCrossed = ducks.some(d => d.isWinner && d.x >= finishLineX);
        const elapsed = (timestamp - startTimeRef.current) / 1000;

        if (winnerCrossed && elapsed >= 3.0) {
            winnerDeclared = true;
            playDrawSound();
            setTimeout(onRaceEnd, 2000);
        }
        
        requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [names, winnerName, isRunning, onRaceEnd]);

  // Initial render when idle
  useEffect(() => {
    if (isRunning || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const width = containerRef.current.clientWidth;
        const height = Math.min(width * 0.8, 600);
        canvas.width = width;
        canvas.height = height;
        // Simple background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#81c7ff');
        gradient.addColorStop(1, '#42a5f5');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
  }, [isRunning, names]); // Re-draw bg if names change while idle

  return (
    <div ref={containerRef} className="w-full h-full flex justify-center items-center p-2">
      <canvas ref={canvasRef} className="border-4 border-blue-400 bg-blue-50 rounded-xl w-full h-full shadow-inner" />
    </div>
  );
};

export default DuckRace;
