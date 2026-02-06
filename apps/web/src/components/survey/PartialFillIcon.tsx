import MaskedSvgIcon from "./MaskedSvgIcon";

export interface PartialFillIconProps {
  src: string;
  sizePx: number;
  /** 0..100 */
  fillPercent: number;
  fillColor: string;
  emptyColor: string;
  className?: string;
}

/**
 * Renders an icon with an "empty" base and a partially clipped filled overlay.
 * Works for any SVG source because the icon is applied as a CSS mask.
 */
export default function PartialFillIcon({
  src,
  sizePx,
  fillPercent,
  fillColor,
  emptyColor,
  className,
}: PartialFillIconProps) {
  const clamped = Math.max(0, Math.min(100, fillPercent));

  return (
    <span
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: sizePx,
        height: sizePx,
      }}
    >
      <MaskedSvgIcon src={src} sizePx={sizePx} color={emptyColor} className="absolute inset-0" />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${clamped}%` }}>
        <MaskedSvgIcon src={src} sizePx={sizePx} color={fillColor} className="absolute inset-0" />
      </span>
    </span>
  );
}
