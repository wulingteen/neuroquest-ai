const Saturn = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <defs>
            <clipPath id="saturn-back">
                <path d="M 0 0 H 24 V 12 L 0 12 Z" />
            </clipPath>
            <clipPath id="saturn-front">
                <path d="M 0 24 H 24 V 12 L 0 12 Z" />
            </clipPath>
        </defs>
        {/* Ring back half */}
        <ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(15, 12, 12)" clipPath="url(#saturn-back)" />
        {/* Planet body */}
        <circle cx="12" cy="12" r="6.8" fill="currentColor" />
        {/* Ring front half */}
        <ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(15, 12, 12)" clipPath="url(#saturn-front)" strokeWidth="2.2" />
    </svg>
);

export default Saturn;
