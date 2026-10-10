import type { ComponentPropsWithoutRef, CSSProperties } from "react";

export interface TextProps extends Omit<ComponentPropsWithoutRef<"span">, "color"> {
  color?: CSSProperties["color"];
  background?: CSSProperties["background"];
  /** A CSS font size, or a number in pixels. */
  size?: CSSProperties["fontSize"];
  italic?: boolean;
  bold?: boolean;
  underline?: boolean | CSSProperties["textDecorationStyle"];
  strikethrough?: boolean;
}

export default function Text({
  children,
  color,
  background,
  size,
  italic,
  bold,
  underline,
  strikethrough,
  style,
  ...props
}: TextProps) {
  const decoration = underline !== undefined || strikethrough !== undefined
    ? [underline && "underline", strikethrough && "line-through"].filter(Boolean).join(" ") || "none"
    : undefined;

  return (
    <span
      {...props}
      style={{
        color,
        background,
        fontSize: size,
        fontStyle: italic === undefined ? undefined : italic ? "italic" : "normal",
        fontWeight: bold === undefined ? undefined : bold ? 700 : 400,
        textDecorationLine: decoration,
        textDecorationStyle: typeof underline === "string" ? underline : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
