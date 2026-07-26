interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  online?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, color, size = 48, online }: AvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-medium text-white"
        style={{ backgroundColor: color, fontSize: size * 0.38 }}
      >
        {initials(name)}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-signal-sidebarDark bg-green-500"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
