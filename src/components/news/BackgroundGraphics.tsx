"use client";

const NewsBackgroundGraphics = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Solid color cosmic background wrapper is handled by the main div, we just add the SVG overlay */}
            <svg width="100%" height="100%" className="absolute inset-0">
                {/* Kurzgesagt Planets - Solid bright colors, crisp borders */}
                {/* Red Planet */}
                <circle cx="10%" cy="20%" r="80" fill="#FF1E56" />
                <circle cx="13%" cy="17%" r="35" fill="#FF4E78" />
                <circle cx="5%" cy="25%" r="15" fill="#D90036" />

                {/* Blue Planet */}
                <circle cx="90%" cy="25%" r="140" fill="#00D4FF" />
                <circle cx="93%" cy="20%" r="40" fill="#5CE1E6" />
                <circle cx="85%" cy="30%" r="20" fill="#00B0D9" />
                <circle
                    cx="90%"
                    cy="25%"
                    r="170"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeDasharray="12 18"
                    opacity="0.4"
                />

                {/* Yellow Ringed Planet */}
                <circle cx="75%" cy="85%" r="100" fill="#FFB800" />
                <circle cx="78%" cy="82%" r="25" fill="#FFD166" />
                <ellipse
                    cx="75%"
                    cy="85%"
                    rx="160"
                    ry="40"
                    fill="none"
                    stroke="#FFD166"
                    strokeWidth="12"
                />

                {/* Kurzgesagt Starfield - crisp solid white dots */}
                <circle cx="15%" cy="15%" r="3" fill="#ffffff" />
                <circle cx="25%" cy="5%" r="1.5" fill="#ffffff" />
                <circle cx="45%" cy="20%" r="4" fill="#ffffff" />
                <circle cx="80%" cy="12%" r="2" fill="#ffffff" />
                <circle cx="95%" cy="50%" r="3.5" fill="#ffffff" />
                <circle cx="8%" cy="65%" r="2" fill="#ffffff" />
                <circle cx="30%" cy="85%" r="4" fill="#ffffff" />
                <circle cx="65%" cy="85%" r="2.5" fill="#ffffff" />
                <circle cx="85%" cy="65%" r="3" fill="#ffffff" />
                <circle cx="50%" cy="55%" r="1.5" fill="#ffffff" />
                <circle cx="40%" cy="40%" r="3" fill="#ffffff" />
                <circle cx="20%" cy="45%" r="2" fill="#ffffff" />
                <circle cx="60%" cy="30%" r="2.5" fill="#ffffff" />

                <path
                    d="M-50,200 Q150,50 350,250 T700,150"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeDasharray="10 20"
                    opacity="0.2"
                />
            </svg>
        </div>
    );
};

export default NewsBackgroundGraphics;
