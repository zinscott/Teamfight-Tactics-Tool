import Image from "next/image";

const HEX_CLIP_PATH = "polygon(50% 4%, 93% 27%, 93% 73%, 50% 96%, 7% 73%, 7% 27%)";

type HexSlotProps = {
  size?: number;
  borderColor: string;
  fillColor?: string;
  iconUrl?: string | null;
  label?: string;
  alt: string;
};

export function HexSlot({
  size = 40,
  borderColor,
  fillColor = "#182339",
  iconUrl,
  label,
  alt,
}: HexSlotProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ clipPath: HEX_CLIP_PATH, backgroundColor: fillColor }}
      >
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={alt}
            fill
            sizes={`${size}px`}
            className="object-cover"
          />
        ) : (
          <span
            className="font-mono font-semibold"
            style={{ color: borderColor, fontSize: Math.max(9, size * 0.28) }}
          >
            {label}
          </span>
        )}
      </div>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 pointer-events-none"
      >
        <polygon
          points="50,4 93,27 93,73 50,96 7,73 7,27"
          fill="none"
          stroke={borderColor}
          strokeWidth={4}
        />
      </svg>
    </div>
  );
}
