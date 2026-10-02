export function UnicornMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="32" cy="40" rx="18" ry="14" fill="#FFE4F3" />
      <circle cx="38" cy="28" r="12" fill="#FFF7FB" />
      <path d="M38 8 L42 24 L34 22 Z" fill="#C4B5FD" />
      <path d="M38 8 L40.5 20 L36.5 19 Z" fill="#FDE68A" />
      <path
        d="M26 34 C18 28, 14 22, 16 16 C22 18, 26 24, 28 30"
        stroke="#F9A8D4"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="42" cy="27" r="1.6" fill="#1F2937" />
      <path
        d="M44 32 Q48 34 46 37"
        stroke="#FB7185"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M12 48 L20 44 L18 52 Z" fill="#A7F3D0" />
      <path d="M48 50 L56 46 L54 54 Z" fill="#FDE68A" />
      <circle cx="10" cy="20" r="2" fill="#FDE68A" />
      <circle cx="54" cy="18" r="1.5" fill="#C4B5FD" />
      <circle cx="50" cy="10" r="1.2" fill="#F9A8D4" />
    </svg>
  );
}

export function SparkleBurst() {
  return (
    <div className="sparkle-field" aria-hidden>
      <span className="sparkle s1">✦</span>
      <span className="sparkle s2">✧</span>
      <span className="sparkle s3">✦</span>
      <span className="sparkle s4">⋆</span>
      <span className="sparkle s5">✧</span>
    </div>
  );
}
