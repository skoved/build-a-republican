interface Props {
  className?: string;
}

/**
 * Unlabelled silhouette — a suited bust with a sweeping forelock and a long
 * tie — used as the face of the setup screen's hidden "Trump deck" button.
 * Monochrome; colour comes from the button's `currentColor`.
 */
export default function TrumpMark({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* shoulders */}
        <path d="M4.5 21c0-3.6 2.8-5.6 7.5-5.6s7.5 2 7.5 5.6" />
        {/* head */}
        <path d="M8 12.6c-.45-2.1.05-5.6 4-5.6s4.45 3.5 4 5.6c-.4 1.9-1.9 3.1-4 3.1s-3.6-1.2-4-3.1Z" />
      </g>
      {/* signature forelock sweep */}
      <path
        fill="currentColor"
        d="M6.9 9c1-3.2 8.7-4.6 10.3-1 .1.2-.1.4-.3.3-1.3-.6-2.8-.8-4.2-.6 1.6.3 2.7 1 3.2 1.8.1.2-.1.5-.3.4-2.6-1.3-6.5-1.5-8.4-.4-.2.1-.4-.1-.3-.3Z"
      />
      {/* long tie */}
      <path fill="currentColor" d="M11.1 15.8h1.8l-.5 4.3c0 .3-.8.3-.8 0z" />
    </svg>
  );
}
