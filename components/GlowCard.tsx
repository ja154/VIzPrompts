import React, { useRef, useEffect } from 'react';

const GlowCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);
    return () => card.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    // The main container has the ref for the mousemove listener and all the user-provided classes.
    <div ref={cardRef} className={`relative ${className}`}>
      {/* Content is wrapped to give it a higher stacking context than the background. */}
      <div className="relative z-10">
        {children}
      </div>
      {/* Background/glow element is a sibling to the content wrapper, but positioned behind it. */}
      <div className="card-interactive-glow-bg"></div>
    </div>
  );
};

export default GlowCard;
