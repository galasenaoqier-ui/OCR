export default function ArchiveMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="殷契拾文档案标识"
      className={className}
      fill="none"
    >
      <rect x="3.5" y="3.5" width="41" height="41" rx="5" stroke="#C28A3D" strokeWidth="1.4" />
      <rect x="8.5" y="8.5" width="31" height="31" rx="3" stroke="#9E5B34" strokeWidth="0.8" opacity="0.8" />
      <g stroke="#2E231B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 19 L20 13 L18 22 L26 15" />
        <path d="M28 31 L33 26" />
        <path d="M15 33 L23 28 L22 33" />
      </g>
      <rect x="32" y="14" width="4" height="4" fill="#A95638" opacity="0.92" />
    </svg>
  )
}
