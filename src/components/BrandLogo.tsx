import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ href = "/", priority = false, className = "" }: { href?: string; priority?: boolean; className?: string }) {
  return (
    <Link href={href} aria-label="SOUP home" className={`inline-flex min-w-0 items-center ${className}`}>
      <Image src="/brand/soup-logo.png" alt="SOUP" width={148} height={36} priority={priority} className="h-6 w-auto max-w-[112px] object-contain sm:h-8 sm:max-w-none" />
    </Link>
  );
}
