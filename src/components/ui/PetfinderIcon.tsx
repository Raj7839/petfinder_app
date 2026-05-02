interface PetfinderIconProps {
  size?: number;
  className?: string;
}

/**
 * Custom Petfinder logo icon — magnifying glass with a person silhouette inside.
 * Represents "Petfinder" (search) for missing people.
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
      <circle cx="10" cy="10" r="7" />
      {/* Magnifying glass handle */}
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
      {/* Person head inside the lens */}
      <circle cx="10" cy="8" r="2" strokeWidth="1.5" />
      {/* Person body inside the lens */}
      <path d="M7 14c0-1.7 1.3-3 3-3s3 1.3 3 3" strokeWidth="1.5" />
    </svg>
  );
}
