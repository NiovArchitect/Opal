/** State indicator only. The action lives in the conversation options menu. */
export function MutedBell() {
  return (
    <svg className="muted-bell-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M6.5 9.2a5.5 5.5 0 0 1 11 0c0 4.2 1.6 5.6 1.6 5.6H4.9s1.6-1.4 1.6-5.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19.2a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 5.2l14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
