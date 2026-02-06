export interface MaskedSvgIconProps {
  src: string;
  sizePx: number;
  color: string;
  className?: string;
}

/**
 * Renders a colored square masked by an SVG (icon-agnostic).
 *
 * This uses CSS mask-image so the SVG file can be swapped (snowflake, diamond, etc.)
 * without changing the component.
 */
export default function MaskedSvgIcon({ src, sizePx, color, className }: MaskedSvgIconProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        width: sizePx,
        height: sizePx,
        backgroundColor: color,
        maskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

