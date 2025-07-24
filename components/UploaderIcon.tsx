import React from 'react';

const UploaderIcon = () => {
    // The provided animation keyframes
    const keyframes = `
        @keyframes ring1_ { from { stroke-dashoffset: -376.237129776; transform: rotate(-0.25turn); animation-timing-function: ease-in; } 23% { stroke-dashoffset: -94.247778; transform: rotate(1turn); animation-timing-function: ease-out; } 46%, 50% { stroke-dashoffset: -376.237129776; transform: rotate(2.25turn); animation-timing-function: ease-in; } 73% { stroke-dashoffset: -94.247778; transform: rotate(3.5turn); animation-timing-function: ease-out; } 96%, to { stroke-dashoffset: -376.237129776; transform: rotate(4.75turn); } }
        @keyframes ring2_ { from { stroke-dashoffset: -329.207488554; transform: rotate(-0.25turn); animation-timing-function: ease-in; } 23% { stroke-dashoffset: -82.46680575; transform: rotate(1turn); animation-timing-function: ease-out; } 46%, 50% { stroke-dashoffset: -329.207488554; transform: rotate(2.25turn); animation-timing-function: ease-in; } 73% { stroke-dashoffset: -82.46680575; transform: rotate(3.5turn); animation-timing-function: ease-out; } 96%, to { stroke-dashoffset: -329.207488554; transform: rotate(4.75turn); } }
        @keyframes ring3_ { from { stroke-dashoffset: -288.4484661616; transform: rotate(-0.25turn); animation-timing-function: ease-in; } 23% { stroke-dashoffset: -72.2566298; transform: rotate(1turn); animation-timing-function: ease-out; } 46%, 50% { stroke-dashoffset: -288.4484661616; transform: rotate(2.25turn); animation-timing-function: ease-in; } 73% { stroke-dashoffset: -72.2566298; transform: rotate(3.5turn); animation-timing-function: ease-out; } 96%, to { stroke-dashoffset: -288.4484661616; transform: rotate(4.75turn); } }
        @keyframes ring4_ { from { stroke-dashoffset: -253.9600625988; transform: rotate(-0.25turn); animation-timing-function: ease-in; } 23% { stroke-dashoffset: -63.61725015; transform: rotate(1turn); animation-timing-function: ease-out; } 46%, 50% { stroke-dashoffset: -253.9600625988; transform: rotate(2.25turn); animation-timing-function: ease-in; } 73% { stroke-dashoffset: -63.61725015; transform: rotate(3.5turn); animation-timing-function: ease-out; } 96%, to { stroke-dashoffset: -253.9600625988; transform: rotate(4.75turn); } }
        @keyframes ring5_ { from { stroke-dashoffset: -225.7422778656; transform: rotate(-0.25turn); animation-timing-function: ease-in; } 23% { stroke-dashoffset: -56.5486668; transform: rotate(1turn); animation-timing-function: ease-out; } 46%, 50% { stroke-dashoffset: -225.7422778656; transform: rotate(2.25turn); animation-timing-function: ease-in; } 73% { stroke-dashoffset: -56.5486668; transform: rotate(3.5turn); animation-timing-function: ease-out; } 96%, to { stroke-dashoffset: -225.7422778656; transform: rotate(4.75turn); } }
        @keyframes ring6_ { from { stroke-dashoffset: -203.795111962; transform: rotate(-0.25turn); animation-timing-function: ease-in; } 23% { stroke-dashoffset: -51.05087975; transform: rotate(1turn); animation-timing-function: ease-out; } 46%, 50% { stroke-dashoffset: -203.795111962; transform: rotate(2.25turn); animation-timing-function: ease-in; } 73% { stroke-dashoffset: -51.05087975; transform: rotate(3.5turn); animation-timing-function: ease-out; } 96%, to { stroke-dashoffset: -203.795111962; transform: rotate(4.75turn); } }
    `;

    return (
        <>
            <style>
                {`
                .pl { width: 5em; height: 5em; }
                .pl circle { transform-box: fill-box; transform-origin: 50% 50%; }
                .pl__ring { stroke: #4B5563; }
                .dark .pl__ring { stroke: #FFFAF0; }
                .pl__ring--alt { stroke: #c026d3; }
                .dark .pl__ring--alt { stroke: #FBCFE8; }
                .pl__ring1 { animation: ring1_ 4s 0s ease-in-out infinite; }
                .pl__ring2 { animation: ring2_ 4s 0.04s ease-in-out infinite; }
                .pl__ring3 { animation: ring3_ 4s 0.08s ease-in-out infinite; }
                .pl__ring4 { animation: ring4_ 4s 0.12s ease-in-out infinite; }
                .pl__ring5 { animation: ring5_ 4s 0.16s ease-in-out infinite; }
                .pl__ring6 { animation: ring6_ 4s 0.2s ease-in-out infinite; }
                `}
                {keyframes}
            </style>
            <svg className="pl" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                <circle className="pl__ring pl__ring1" cx="80" cy="80" r="72" fill="none" strokeWidth="16" strokeDasharray="376.237129776 376.237129776" strokeDashoffset="376.237129776" transform="rotate(-90,80,80)" />
                <circle className="pl__ring pl__ring--alt pl__ring2" cx="80" cy="80" r="64" fill="none" strokeWidth="16" strokeDasharray="329.207488554 329.207488554" strokeDashoffset="329.207488554" transform="rotate(-90,80,80)" />
                <circle className="pl__ring pl__ring3" cx="80" cy="80" r="56" fill="none" strokeWidth="16" strokeDasharray="288.4484661616 288.4484661616" strokeDashoffset="288.4484661616" transform="rotate(-90,80,80)" />
                <circle className="pl__ring pl__ring--alt pl__ring4" cx="80" cy="80" r="48" fill="none" strokeWidth="16" strokeDasharray="253.9600625988 253.9600625988" strokeDashoffset="253.9600625988" transform="rotate(-90,80,80)" />
                <circle className="pl__ring pl__ring5" cx="80" cy="80" r="40" fill="none" strokeWidth="16" strokeDasharray="225.7422778656 225.7422778656" strokeDashoffset="225.7422778656" transform="rotate(-90,80,80)" />
                <circle className="pl__ring pl__ring--alt pl__ring6" cx="80" cy="80" r="32" fill="none" strokeWidth="16" strokeDasharray="203.795111962 203.795111962" strokeDashoffset="203.795111962" transform="rotate(-90,80,80)" />
            </svg>
        </>
    );
};

export default UploaderIcon;