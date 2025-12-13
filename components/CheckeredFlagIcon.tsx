import * as React from 'react'

export default function CheckeredFlagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 48" aria-hidden="true" {...props}>
      <rect x="0" y="0" width="64" height="48" fill="none" />
      <rect x="0" y="0" width="16" height="16" fill="#000000" />
      <rect x="16" y="0" width="16" height="16" fill="#ffffff" />
      <rect x="32" y="0" width="16" height="16" fill="#000000" />
      <rect x="48" y="0" width="16" height="16" fill="#ffffff" />
      <rect x="0" y="16" width="16" height="16" fill="#ffffff" />
      <rect x="16" y="16" width="16" height="16" fill="#000000" />
      <rect x="32" y="16" width="16" height="16" fill="#ffffff" />
      <rect x="48" y="16" width="16" height="16" fill="#000000" />
      <rect x="0" y="32" width="16" height="16" fill="#000000" />
      <rect x="16" y="32" width="16" height="16" fill="#ffffff" />
      <rect x="32" y="32" width="16" height="16" fill="#000000" />
      <rect x="48" y="32" width="16" height="16" fill="#ffffff" />
    </svg>
  )
}
