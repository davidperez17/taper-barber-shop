import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true as const,
  ...props,
});

export const IconCard = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export const IconStore = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 10.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.6 5.5h16.8l1 4.2a2.4 2.4 0 0 1-4.7.7 2.4 2.4 0 0 1-4.7 0 2.4 2.4 0 0 1-4.7 0 2.4 2.4 0 0 1-4.7-.7l1-4.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M10 20v-4.5h4V20" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

export const IconId = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="8.5" cy="11" r="2.1" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5.5 16c.5-1.6 1.7-2.4 3-2.4s2.5.8 3 2.4M14 9.5h4M14 13h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const IconGrid = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export const IconCalendar = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const IconStack = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 3 21 7.5 12 12 3 7.5 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="m3 12 9 4.5L21 12" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="m3 16.5 9 4.5 9-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

export const IconPencil = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 16.5 15.2 5.3a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L7.5 20H4v-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M13.5 7 17 10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const IconTag = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M3 11.5V5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" />
  </svg>
);

export const IconStats = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="3" y="12" width="4" height="9" rx="1" fill="currentColor" />
    <rect x="10" y="7" width="4" height="14" rx="1" fill="currentColor" opacity="0.62" />
    <rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor" opacity="0.36" />
  </svg>
);

export const IconHistory = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <rect x="4.5" y="3" width="15" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 8h8M8 12h8M8 16h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconUser = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const IconBell = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 3a5.4 5.4 0 0 0-5.4 5.4c0 4.3-1.6 5.4-1.6 5.4h14s-1.6-1.1-1.6-5.4A5.4 5.4 0 0 0 12 3ZM10.2 18a1.8 1.8 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconFlip = ({ size = 14, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M7 9 4.5 11.5 7 14M4.5 11.5h9a4 4 0 0 0 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconScan = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const IconSearch = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
    <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const IconChevronLeft = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M14 5 8 12l6 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCheck = ({ size = 44, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="m7 12 3.2 3.2L17 8.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconUsers = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 19c0-3.2 2.5-5.3 5.5-5.3s5.5 2.1 5.5 5.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 19c0-2.4-1-4.2-2.6-5.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const IconBox = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 2.8 20 7v10l-8 4.2L4 17V7l8-4.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M4 7l8 4.2L20 7M12 11.2V21" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const IconChart = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 4v15.5a.5.5 0 0 0 .5.5H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 14l3-3 2.5 2.5L19 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconPlus = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const IconMessage = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const IconRefresh = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCamera = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.7l.9-1.6A1 1 0 0 1 9 5h6a1 1 0 0 1 .9.4l.9 1.6h1.7A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconEye = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconEyeOff = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size, p)}>
    <path d="M4 12s3.5-6.5 8-6.5c1.3 0 2.5.35 3.5.9M20 12s-1.2 2.2-3.4 3.9M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
