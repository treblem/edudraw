import React, { useEffect, useState, useRef } from 'react';
import { WHEEL_COLORS } from '../types';
import { playDrawSound } from '../utils';

interface SpinWheelProps {
  names: string[];
  winnerName: string | null;
  winnerIndex: number | null;
  isSpinning: boolean;
  onSpinEnd: () => void;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ names, winnerIndex, isSpinning, onSpinEnd }) => {
  const [rotation, setRotation] = useState(0);
  const [lastRotation, setLastRotation] = useState(0);
  const transitionRef = useRef<string>('none');

  const numSegments = names.length;
  const radius = 250;
  const center = 255; // radius + padding
  const svgSize = center * 2;
  const segmentAngle = 360 / numSegments;

  useEffect(() => {
    if (isSpinning && winnerIndex !== null) {
      // 1. Target angle to land on (top/pointer is at 0 degrees visually, but logic considers 0 at 3 o'clock usually, corrected by -90 deg rotation in draw)
      // The math here matches the original code's logic.
      
      const Ac = winnerIndex * segmentAngle + (segmentAngle / 2); // Center of winning segment
      const L = Ac; // Target
      const V = lastRotation % 360; // Current visual angle
      
      let minRotationDelta = (L - V + 360) % 360;
      if (minRotationDelta < 1) minRotationDelta += 360;

      const fullSpins = 5;
      const rotationDelta = minRotationDelta + (360 * fullSpins);
      const newTotalRotation = lastRotation + rotationDelta;

      transitionRef.current = 'transform 6s cubic-bezier(0.1, 0.5, 0.2, 1)';
      setRotation(newTotalRotation);

      const timer = setTimeout(() => {
        playDrawSound();
        setLastRotation(newTotalRotation);
        onSpinEnd();
      }, 6000);

      return () => clearTimeout(timer);
    } else {
        transitionRef.current = 'none';
    }
  }, [isSpinning, winnerIndex, segmentAngle, lastRotation, onSpinEnd]);

  const degToRad = (deg: number) => deg * (Math.PI / 180);

  if (names.length === 0) return null;

  return (
    <div className="w-full h-full max-w-[550px] max-h-[550px] mx-auto relative flex justify-center items-center">
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full h-full transform-origin-center">
        {/* Spinning Group */}
        <g 
            style={{ 
                transform: `translate(${center}px, ${center}px) rotate(-${rotation}deg)`,
                transition: transitionRef.current
            }}
        >
          {names.map((name, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
            
            // Draw slice
            const largeArc = segmentAngle > 180 ? 1 : 0;
            // -90 to start from top
            const startX = radius * Math.cos(degToRad(startAngle - 90));
            const startY = radius * Math.sin(degToRad(startAngle - 90));
            const endX = radius * Math.cos(degToRad(endAngle - 90));
            const endY = radius * Math.sin(degToRad(endAngle - 90));
            
            const pathData = `M 0,0 L ${startX},${startY} A ${radius},${radius} 0 ${largeArc},1 ${endX},${endY} Z`;

            // Text
            const textAngle = startAngle + segmentAngle / 2;
            const textRadius = radius * 0.75;
            const textX = textRadius * Math.cos(degToRad(textAngle - 90));
            const textY = textRadius * Math.sin(degToRad(textAngle - 90));
            
            // Text Bg
            const showTextBg = segmentAngle < 60;
            const textLength = name.length * (segmentAngle > 30 ? 10 : 7);
            const textHeight = segmentAngle > 30 ? 20 : 15;

            return (
              <g key={i}>
                <path d={pathData} fill={color} stroke="white" strokeWidth="2" />
                
                {showTextBg && (
                    <rect 
                        x={textX - textLength / 2} 
                        y={textY - textHeight / 2}
                        width={textLength + 6}
                        height={textHeight + 6}
                        fill="rgba(255,255,255,0.7)"
                        rx="4" ry="4"
                        transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                    />
                )}
                
                <text
                  x={textX}
                  y={textY}
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                  fontSize={segmentAngle > 30 ? '16' : '12'}
                  fill="#374151"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="sans-serif"
                >
                  {name}
                </text>
              </g>
            );
          })}
        </g>
        
        {/* Center Hub */}
        <circle cx={center} cy={center} r="25" fill="#1f2937" stroke="#e5e7eb" strokeWidth="5" />
        
        {/* Pointer (Static) */}
        <polygon 
            points={`${center},0 ${center + 15},30 ${center - 15},30`} 
            fill="#ef4444" 
            filter="drop-shadow(0 0 5px rgba(0,0,0,0.5))" 
        />
      </svg>
    </div>
  );
};

export default SpinWheel;
