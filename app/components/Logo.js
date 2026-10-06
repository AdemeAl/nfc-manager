export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Cartes avis Google" className="logo">
      <rect width="512" height="512" rx="112" fill="#243f8f" />
      <g fill="none" stroke="#fff" strokeWidth="34" strokeLinecap="round">
        <path d="M176 190a96 96 0 0 1 0 132" />
        <path d="M238 144a174 174 0 0 1 0 224" />
        <path d="M300 98a252 252 0 0 1 0 316" />
      </g>
      <circle cx="132" cy="256" r="30" fill="#f0a500" />
    </svg>
  );
}
