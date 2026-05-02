interface PetfinderIconProps {
  size?: number;
  className?: string;
}

/**
 * Custom Petfinder logo icon — magnifying glass with a paw print inside.
 * Represents "Petfinder" (search) for missing pets.
 */
export function PetfinderIcon({ size = 22, className }: PetfinderIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Magnifying glass lens */}
      <circle cx="10" cy="10" r="8" />
      {/* Magnifying glass handle */}
      <line x1="16" y1="16" x2="22" y2="22" />
      {/* Paw print inside (Emotional pet element) */}
      <path
        d="M10 11.5c-1.3 0-2.2.8-2.2 1.8s.9 1.7 2.2 1.7 2.2-.7 2.2-1.7-.9-1.8-2.2-1.8z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
