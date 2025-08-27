export default function Icon() {
  // SVG-based favicon (Next.js will serve this as the site icon)
  // Size 32x32 is a common favicon size; Next can rasterize as needed
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#g)" stroke="none" />
      <path d="M7 13l3 3 7-7" stroke="#fff" />
    </svg>
  )
}
export const size = { width: 32, height: 32 }
export const contentType = 'image/svg+xml'
