import { cn } from "cn";

interface InlineImage {
  src: string;
  alt?: string;
  className?: string;
}

export default function InlineImage({ src, alt, className }: InlineImage) {
  return (
    // eslint-disable-next-line
    <img
      src={src}
      alt={alt}
      className={cn(
        "inline h-6 rounded-md",
        className
      )}
    />
  )
}
