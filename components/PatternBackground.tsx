import React from 'react';

const PatternBackground = () => {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <style>{`
        .aurora-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: -10;
          transition: background 0.5s ease-in-out;
          /* animation: aurora-drift 25s infinite alternate ease-in-out; */ /* Animation removed for performance */
        }

        /* Light Mode Styles */
        .aurora-bg {
          background: radial-gradient(
              ellipse at 20% 30%,
              rgba(138, 43, 226, 0.8) 0%, /* Increased opacity */
              rgba(138, 43, 226, 0) 70%
            ),
            radial-gradient(
              ellipse at 80% 50%,
              rgba(0, 191, 255, 0.9) 0%, /* Increased opacity */
              rgba(0, 191, 255, 0) 70%
            ),
            radial-gradient(
              ellipse at 50% 80%,
              rgba(50, 205, 50, 0.75) 0%, /* Increased opacity */
              rgba(50, 205, 50, 0) 70%
            ),
            linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); /* Kept base light */
          background-blend-mode: multiply; /* Changed blend mode for visibility */
        }

        .aurora-bg::before {
          content: "";
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background: repeating-linear-gradient(
              45deg,
              rgba(0, 0, 0, 0.015) 0px,
              rgba(0, 0, 0, 0.015) 1px,
              transparent 1px,
              transparent 40px
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(0, 0, 0, 0.02) 0px,
              rgba(0, 0, 0, 0.02) 1px,
              transparent 1px,
              transparent 60px
            );
          /* animation: grid-shift 20s linear infinite; */ /* Animation removed for performance */
        }

        .aurora-bg::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(
            circle at center,
            transparent 70%,
            rgba(233, 236, 239, 0.95) 100% /* Matched to new lighter base color */
          );
          opacity: 0.8; /* Static opacity */
          /* animation: aurora-pulse 8s infinite alternate; */ /* Animation removed for performance */
        }

        /* Dark Mode Styles */
        .dark .aurora-bg {
          background: radial-gradient(
              ellipse at 20% 30%,
              rgba(138, 43, 226, 0.8) 0%,
              rgba(138, 43, 226, 0) 60%
            ),
            radial-gradient(
              ellipse at 80% 50%,
              rgba(0, 191, 255, 0.7) 0%,
              rgba(0, 191, 255, 0) 70%
            ),
            radial-gradient(
              ellipse at 50% 80%,
              rgba(50, 205, 50, 0.6) 0%,
              rgba(50, 205, 50, 0) 65%
            ),
            linear-gradient(135deg, #000000 0%, #0a0520 100%);
          background-blend-mode: overlay, screen, hard-light;
        }
        
        .dark .aurora-bg::before {
          background: repeating-linear-gradient(
              45deg,
              rgba(255, 255, 255, 0.02) 0px,
              rgba(255, 255, 255, 0.02) 1px,
              transparent 1px,
              transparent 40px
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(255, 255, 255, 0.03) 0px,
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px,
              transparent 60px
            );
        }

        .dark .aurora-bg::after {
          background: radial-gradient(
            circle at center,
            transparent 70%,
            rgba(10, 5, 32, 0.9) 100%
          );
        }

        /* All @keyframes animations have been removed. */
      `}</style>
    </div>
  );
};

export default PatternBackground;
