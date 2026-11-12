'use client';

import { useEffect, useState } from 'react';

const messages = [
  'Your design is taking shape…',
  'Mixing colors…',
  'Finding your style…',
  'Adding the finishing touches…',
];

export default function DesignLoadingAnimation({ label }: { label?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 2600);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="design-loading-animation" role="status" aria-live="polite">
      <div className="design-loading-art" aria-hidden="true">
        <span className="design-loading-dot design-loading-dot-one" />
        <span className="design-loading-dot design-loading-dot-two" />
        <span className="design-loading-dot design-loading-dot-three" />
        <svg viewBox="0 0 220 150" className="design-loading-svg">
          <ellipse cx="112" cy="133" rx="62" ry="8" className="design-loading-shadow" />
          <path d="M78 122c-8-18-2-39 11-52 9-9 19-13 26-8 6 4 4 13-2 22l-10 17c-4 7 2 12 8 8l19-17c7-6 15-6 19-1 4 5 2 11-5 18l-15 15c-5 5-1 12 6 10l16-5c9-3 15 1 16 7 1 7-6 12-16 15l-34 10c-15 4-32-5-39-19Z" className="design-loading-hand" />
          <path d="M105 80c-4-11-1-25 5-35 5-8 11-10 16-7 5 3 4 10 1 17l-7 16" className="design-loading-finger" />
          <path d="M125 92c8-11 17-20 25-22 6-1 10 2 10 7 0 6-7 11-15 17l-9 8" className="design-loading-finger design-loading-finger-two" />
          <path d="M71 72c-7-5-13-13-12-19 1-5 6-7 11-4 7 4 12 12 14 20" className="design-loading-finger design-loading-finger-three" />
          <path d="M67 56 128 18" className="design-loading-brush" />
          <path d="m122 19 10-7 5 8-9 7Z" className="design-loading-brush-tip" />
          <ellipse cx="166" cy="115" rx="28" ry="12" className="design-loading-palette" />
          <circle cx="153" cy="113" r="4" fill="#f5a4c7" />
          <circle cx="166" cy="108" r="4" fill="#79d5f2" />
          <circle cx="178" cy="114" r="4" fill="#ffd36e" />
        </svg>
      </div>
      <p className="design-loading-message">{label || messages[messageIndex]}</p>
      <style jsx>{`
        .design-loading-animation { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 210px; color: #4c2b9b; }
        .design-loading-art { position: relative; width: 220px; height: 150px; }
        .design-loading-svg { width: 100%; height: 100%; overflow: visible; }
        .design-loading-shadow { fill: #6d55b51c; }
        .design-loading-hand { fill: #ffd7c2; stroke: #7b5bc8; stroke-width: 2.5; transform-origin: 105px 105px; animation: design-hand-idle 2.8s ease-in-out infinite; }
        .design-loading-finger { fill: none; stroke: #d89482; stroke-width: 2.5; stroke-linecap: round; transform-origin: 110px 80px; animation: design-finger-tap 2.4s ease-in-out infinite; }
        .design-loading-finger-two { animation-delay: .25s; }
        .design-loading-finger-three { animation-delay: .45s; }
        .design-loading-brush { fill: none; stroke: #6b4db4; stroke-width: 5; stroke-linecap: round; }
        .design-loading-brush-tip { fill: #f28db8; stroke: #6b4db4; stroke-width: 2; transform-origin: 128px 18px; animation: design-brush-wiggle 2.2s ease-in-out infinite; }
        .design-loading-palette { fill: #c7b5ff; stroke: #6b4db4; stroke-width: 2; transform: rotate(-8deg); transform-origin: 166px 115px; }
        .design-loading-dot { position: absolute; width: 9px; height: 9px; border-radius: 50%; animation: design-float 2.8s ease-in-out infinite; }
        .design-loading-dot-one { left: 20px; top: 39px; background: #f5a4c7; }
        .design-loading-dot-two { right: 24px; top: 35px; background: #79d5f2; animation-delay: .7s; }
        .design-loading-dot-three { right: 2px; top: 78px; background: #ffd36e; animation-delay: 1.2s; }
        .design-loading-message { margin: 5px 0 0; font-size: .9rem; font-weight: 700; letter-spacing: .01em; }
        @keyframes design-hand-idle { 0%, 100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-2deg) translateY(-3px); } }
        @keyframes design-finger-tap { 0%, 65%, 100% { transform: translateY(0); } 74% { transform: translateY(4px); } 82% { transform: translateY(0); } }
        @keyframes design-brush-wiggle { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(4deg); } }
        @keyframes design-float { 0%, 100% { opacity: .55; transform: translateY(5px) scale(.85); } 50% { opacity: 1; transform: translateY(-8px) scale(1); } }
        @media (prefers-reduced-motion: reduce) { .design-loading-hand, .design-loading-finger, .design-loading-brush-tip, .design-loading-dot { animation: none; } }
      `}</style>
    </div>
  );
}
