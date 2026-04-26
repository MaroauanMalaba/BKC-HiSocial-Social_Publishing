export function InstagramLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#feda75"/>
          <stop offset="35%" stopColor="#fa7e1e"/>
          <stop offset="65%" stopColor="#d62976"/>
          <stop offset="100%" stopColor="#962fbf"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)"/>
      <rect x="6.5" y="6.5" width="11" height="11" rx="3.5" stroke="white" strokeWidth="1.7" fill="none"/>
      <circle cx="12" cy="12" r="2.6" stroke="white" strokeWidth="1.7" fill="none"/>
      <circle cx="17" cy="7" r="0.9" fill="white"/>
    </svg>
  );
}

export function TikTokLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#000"/>
      <path d="M16 7.5c-1.6 0-2.9-1.3-2.9-2.9V4.5h-2.4v10.2c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8.8-1.8 1.8-1.8c.2 0 .4 0 .5.1V10.6c-.2 0-.3-.1-.5-.1-2.3 0-4.2 1.9-4.2 4.2s1.9 4.2 4.2 4.2 4.2-1.9 4.2-4.2V9.7c.9.6 2 1 3.1 1V8.3c-.1.1-.2.2-.2.2z" fill="#25F4EE" opacity=".9" transform="translate(-0.6,-0.4)"/>
      <path d="M16 7.5c-1.6 0-2.9-1.3-2.9-2.9V4.5h-2.4v10.2c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8.8-1.8 1.8-1.8c.2 0 .4 0 .5.1V10.6c-.2 0-.3-.1-.5-.1-2.3 0-4.2 1.9-4.2 4.2s1.9 4.2 4.2 4.2 4.2-1.9 4.2-4.2V9.7c.9.6 2 1 3.1 1V8.3c-.1.1-.2.2-.2.2z" fill="#FE2C55" opacity=".9" transform="translate(0.6,0.4)"/>
      <path d="M16 7.5c-1.6 0-2.9-1.3-2.9-2.9V4.5h-2.4v10.2c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8.8-1.8 1.8-1.8c.2 0 .4 0 .5.1V10.6c-.2 0-.3-.1-.5-.1-2.3 0-4.2 1.9-4.2 4.2s1.9 4.2 4.2 4.2 4.2-1.9 4.2-4.2V9.7c.9.6 2 1 3.1 1V8.3c-.1.1-.2.2-.2.2z" fill="white"/>
    </svg>
  );
}

export function YouTubeLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="#FF0000"/>
      <path d="M10 9.2v5.6l5-2.8z" fill="white"/>
    </svg>
  );
}

export function FacebookLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#1877F2"/>
      <path d="M14 8.5h2V6h-2c-1.7 0-3 1.3-3 3v1.5H9V13h2v6h2.5v-6H16l.5-2.5H13.5V9c0-.3.2-.5.5-.5z" fill="white"/>
    </svg>
  );
}

export function LinkedInLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5" fill="#0A66C2"/>
      <path d="M7.5 9.5h2.6v8H7.5v-8zM8.8 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 9.5h2.5v1.1c.4-.7 1.3-1.3 2.7-1.3 2.9 0 3.4 1.9 3.4 4.4v4.3h-2.6v-3.8c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2v3.9H12v-8.5z" fill="white"/>
    </svg>
  );
}

export function PlatformLogo({ platform, size = 18 }: { platform: string; size?: number }) {
  switch (platform) {
    case "instagram": return <InstagramLogo size={size}/>;
    case "tiktok":    return <TikTokLogo size={size}/>;
    case "youtube":   return <YouTubeLogo size={size}/>;
    case "facebook":  return <FacebookLogo size={size}/>;
    case "linkedin":  return <LinkedInLogo size={size}/>;
    default: return (
      <div style={{ width: size, height: size, borderRadius: 6, background: "var(--accent-blue-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, fontWeight: 800, color: "var(--accent-blue)" }}>
        {platform[0]?.toUpperCase()}
      </div>
    );
  }
}

export const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#d62976",
  tiktok:    "#000000",
  youtube:   "#FF0000",
  facebook:  "#1877F2",
  linkedin:  "#0A66C2",
};
