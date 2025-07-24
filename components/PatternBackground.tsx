import React from 'react';

const PatternBackground = () => {
  // Generates a large grid of isometric cube elements for the SVG background.
  const renderCubes = () => {
    const cubes = [];
    const viewWidth = 2400; // Large width to cover a 200% scaled view
    const viewHeight = 2000; // Large height
    const cubeWidth = 100;
    const rhombusHeight = 86.6; // This is a single rhombus's height

    // Tile the cubes in a honeycomb-like pattern
    for (let y = -rhombusHeight; y < viewHeight; y += rhombusHeight) {
      // Offset every other row for the staggered pattern
      const isEvenRow = Math.round(y / rhombusHeight) % 2 === 0;
      const xOffset = isEvenRow ? cubeWidth / 2 : 0;
      
      for (let x = -cubeWidth / 2; x < viewWidth; x += cubeWidth) {
        const currentX = x + xOffset;
        
        // A group for a single cube, translated to its grid position
        cubes.push(
          <g transform={`translate(${currentX}, ${y})`} key={`${currentX}-${y}`}>
            <polygon points="50,0 100,28.8 50,57.6 0,28.8" fill="url(#cube-light-theme)"/>
            <polygon points="0,28.8 50,57.6 50,115.2 0,86.4" fill="url(#cube-dark-theme)"/>
            <polygon points="50,57.6 100,28.8 100,86.4 50,115.2" fill="url(#cube-mid-theme)"/>
          </g>
        );
      }
    }
    return cubes;
  };

  return (
    <div className="pattern-bg" aria-hidden="true">
      <svg
        preserveAspectRatio="xMidYMid slice"
        className="cube-svg"
        viewBox="0 0 2400 2000"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients are defined here but styled via CSS variables for theming */}
          <linearGradient id="cube-dark-theme" gradientTransform="rotate(45)">
            <stop offset="0%"/>
            <stop offset="100%"/>
          </linearGradient>
          <linearGradient id="cube-mid-theme" gradientTransform="rotate(45)">
            <stop offset="0%"/>
            <stop offset="100%"/>
          </linearGradient>
          <linearGradient id="cube-light-theme" gradientTransform="rotate(45)">
            <stop offset="0%"/>
            <stop offset="100%"/>
          </linearGradient>
        </defs>
        {renderCubes()}
      </svg>
    </div>
  );
};

export default PatternBackground;
