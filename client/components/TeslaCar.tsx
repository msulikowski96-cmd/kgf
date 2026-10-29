import React, { useId } from "react";
import Svg, {
  Path,
  Circle,
  Ellipse,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
} from "react-native-svg";

interface TeslaCarProps {
  width?: number;
  // Body colour, e.g. "#E5E5EA" for white, "#2C2C30" for black
  color?: string;
  // Variant changes the roofline: sedan (Model 3/S) or crossover (Model Y/X)
  variant?: "sedan" | "suv";
}

// Stylised side profile of an electric fastback, drawn in SVG.
export function TeslaCar({
  width = 320,
  color = "#D9D9DE",
  variant = "sedan",
}: TeslaCarProps) {
  const height = (width * 140) / 400;
  // Gradient ids must be unique per drawing: on web all SVGs share one document
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = {
    body: `body${uid}`,
    glass: `glass${uid}`,
    shadow: `shadow${uid}`,
  };
  const suv = variant === "suv";

  const body = suv
    ? "M22 98 C15 90 16 76 28 70 C52 60 86 48 124 36 C156 26 204 22 236 26 C264 30 290 48 312 60 C342 65 368 70 382 78 C390 84 390 94 384 98 L342 98 A32 32 0 0 0 278 98 L124 98 A32 32 0 0 0 60 98 Z"
    : "M22 98 C16 92 16 80 26 74 C50 66 90 56 130 44 C160 35 200 30 232 33 C262 36 288 52 310 62 C340 66 368 70 382 78 C390 84 390 94 384 98 L340 98 A30 30 0 0 0 280 98 L122 98 A30 30 0 0 0 62 98 Z";

  const glass = suv
    ? "M108 56 C138 42 186 32 230 34 C254 36 274 48 292 60 L118 62 Z"
    : "M118 58 C148 46 196 38 228 40 C252 43 272 53 290 62 L126 63 Z";

  const rearWheel = suv ? 92 : 92;
  const frontWheel = suv ? 310 : 310;
  const wheelR = suv ? 26 : 24;

  return (
    <Svg width={width} height={height} viewBox="0 0 400 140">
      <Defs>
        <LinearGradient id={ids.body} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={color} stopOpacity="0.55" />
        </LinearGradient>
        <LinearGradient id={ids.glass} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3A3F4A" />
          <Stop offset="0.6" stopColor="#0E1014" />
          <Stop offset="1" stopColor="#1A1D24" />
        </LinearGradient>
        <RadialGradient id={ids.shadow} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity="0.8" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Ellipse
        cx="200"
        cy="122"
        rx="190"
        ry="10"
        fill={`url(#${ids.shadow})`}
      />

      <Path d={body} fill={`url(#${ids.body})`} />
      <Path d={glass} fill={`url(#${ids.glass})`} />
      {/* B-pillar */}
      <Path
        d={suv ? "M204 33 L200 62" : "M206 39 L202 63"}
        stroke={color}
        strokeOpacity={0.7}
        strokeWidth={3}
      />
      {/* Shoulder line */}
      <Path
        d="M40 78 C140 74 260 72 372 80"
        stroke="#FFFFFF"
        strokeOpacity={0.25}
        strokeWidth={1.2}
        fill="none"
      />
      {/* Door handles */}
      <Path
        d="M168 74 L184 74 M242 74 L258 74"
        stroke="#FFFFFF"
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />
      {/* Headlight and tail light */}
      <Path
        d="M360 76 C368 77 374 79 380 82"
        stroke="#F5F5F7"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M22 80 C28 76 36 74 44 73"
        stroke="#E82127"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />

      {[rearWheel, frontWheel].map((cx) => (
        <G key={cx}>
          <Circle cx={cx} cy={98} r={wheelR} fill="#0A0A0B" />
          <Circle
            cx={cx}
            cy={98}
            r={wheelR * 0.66}
            fill="#2A2A2E"
            stroke="#5A5A60"
            strokeWidth={1.5}
          />
          <Circle cx={cx} cy={98} r={wheelR * 0.18} fill="#8A8A90" />
        </G>
      ))}
    </Svg>
  );
}
