import { APP_BRAND } from "@/config/branding";

type BrandMarkSize = "sm" | "md" | "lg";

interface BrandMarkProps {
  size?: BrandMarkSize;
  className?: string;
}

const SIZE_CLASS: Record<BrandMarkSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12"
};

export function BrandMark({ size = "md", className = "" }: BrandMarkProps) {
  return (
    <picture className={`block shrink-0 ${SIZE_CLASS[size]} ${className}`}>
      <source srcSet={APP_BRAND.iconSvg} type="image/svg+xml" />
      <img
        src={APP_BRAND.iconPng}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full rounded-md object-contain"
      />
    </picture>
  );
}
