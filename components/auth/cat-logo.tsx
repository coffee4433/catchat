export function CatLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 20c0-8.837 8.059-15 18-15s18 6.163 18 15-8.059 15-18 15c-1.657 0-3.26-.16-4.78-.462L10 43l1.83-8.3C8.2 32.02 6 26.4 6 20Z"
        fill="currentColor"
        className="text-primary"
      />
      <path
        d="M12 9.5 15 2l6 5.5M36 9.5 33 2l-6 5.5"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        fill="currentColor"
      />
      <g className="animate-blink">
        <circle cx="17.5" cy="19" r="2.4" className="fill-primary-foreground" />
        <circle cx="30.5" cy="19" r="2.4" className="fill-primary-foreground" />
      </g>
      <path
        d="M24 24.5 22 23h4l-2 1.5Zm0 0v2m0 0c-1 1.4-2.6 1.6-4 .8m4-.8c1 1.4 2.6 1.6 4 .8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary-foreground"
      />
      <path
        d="M10 21h4M10 25l4-1M38 21h-4M38 25l-4-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="text-primary-foreground opacity-70"
      />
    </svg>
  )
}
