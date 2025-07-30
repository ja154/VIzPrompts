
import React from 'react';

const AnimatedAppName = () => {
  return (
    <>
      <style>{`
        .app-name-container {
          height: 90px;
        }

        .vizprompts-title-reveal {
          font-family: 'Inter', sans-serif;
          font-size: 90px;
          font-weight: 900;
          letter-spacing: -2px;
          text-transform: uppercase;
          fill: url(#animated-title-gradient);
          clip-path: url(#vizprompts-reveal-mask);
        }

        @media (max-width: 768px) {
          .app-name-container {
            height: 80px;
          }
          .vizprompts-title-reveal {
            font-size: 80px;
          }
        }

        @media (max-width: 480px) {
          .app-name-container {
            height: 70px;
          }
          .vizprompts-title-reveal {
            font-size: 70px;
          }
        }

        @keyframes reveal-title-vizprompts {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        
        #vizprompts-reveal-rect {
          animation: reveal-title-vizprompts 3s ease-in-out forwards;
        }
      `}</style>
      <div className="app-name-container flex items-center justify-center">
        <svg className="w-auto h-full" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              y2="0" x2="0" y1="80" x1="0"
              id="animated-title-gradient"
            >
              <stop stopColor="#C0C0C0"></stop>
              <stop stopColor="#f97316" offset="1"></stop>
              <animateTransform
                repeatCount="indefinite"
                keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1"
                keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1"
                dur="8s"
                values="0 40 40;-270 40 40;-270 40 40;-540 40 40;-540 40 40;-810 40 40;-810 40 40;-1080 40 40;-1080 40 40"
                type="rotate"
                attributeName="gradientTransform"
              ></animateTransform>
            </linearGradient>
            <clipPath id="vizprompts-reveal-mask">
              <rect id="vizprompts-reveal-rect" x="0" y="0" height="100%" width="0%" />
            </clipPath>
          </defs>
          
          <text
            className="vizprompts-title-reveal"
            x="50%"
            y="50%"
            dy=".35em"
            textAnchor="middle"
          >
            VizPrompts
          </text>
        </svg>
      </div>
    </>
  );
};

export default AnimatedAppName;
