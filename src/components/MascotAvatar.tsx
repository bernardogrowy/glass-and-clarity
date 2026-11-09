import type { AvatarExpression } from "@/lib/profile-store";

const INK = "#1B2140";

export function MascotAvatar({
  color,
  expression,
  size = 40,
}: {
  color: string;
  expression: AvatarExpression;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="50" cy="52" r="46" fill={color} />
      <FaceFeatures expression={expression} />
      <AccentDecoration expression={expression} />
    </svg>
  );
}

function FaceFeatures({ expression }: { expression: AvatarExpression }) {
  const nose = (
    <path
      d="M46 40 C42 40 40 44 41 48 C42 53 42 57 46 60"
      stroke={INK}
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
  );

  if (expression === "sorriso") {
    return (
      <>
        <path
          d="M30 46 Q34 41 38 46"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M60 48 Q64 43 68 48"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        {nose}
        <path
          d="M42 62 Q54 74 66 60"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }

  if (expression === "piscada") {
    return (
      <>
        <circle cx="34" cy="46" r="4" fill={INK} />
        <path
          d="M58 46 Q64 42 69 46"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        {nose}
        <path
          d="M42 62 Q54 70 65 61"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }

  if (expression === "duvida-intensa") {
    return (
      <>
        <path
          d="M28 40 Q34 36 40 39"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="34" cy="47" r="4" fill={INK} />
        <path d="M58 45 L68 45" stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none" />
        <circle cx="63" cy="52" r="4" fill={INK} />
        {nose}
        <path
          d="M46 63 Q52 66 58 62"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }

  return (
    <>
      <path
        d="M28 40 Q34 36 40 39"
        stroke={INK}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="34" cy="47" r="4" fill={INK} />
      {nose}
      <circle cx="63" cy="50" r="4" fill={INK} />
      <path
        d="M46 63 Q52 66 58 62"
        stroke={INK}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

function AccentDecoration({ expression }: { expression: AvatarExpression }) {
  if (expression === "duvida") {
    return (
      <g fill={INK}>
        <circle cx="18" cy="20" r="3" />
        <circle cx="24" cy="14" r="2.3" />
        <circle cx="31" cy="10" r="1.6" />
      </g>
    );
  }
  if (expression === "duvida-intensa") {
    return (
      <path
        d="M76 16 C80 12 72 10 76 16 C80 22 70 20 74 26"
        stroke={INK}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return <path d="M78 14 L80 20 L86 22 L80 24 L78 30 L76 24 L70 22 L76 20 Z" fill={INK} />;
}
