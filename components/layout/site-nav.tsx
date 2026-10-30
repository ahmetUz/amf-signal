"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Le fil" },
  { href: "/breves", label: "Brèves" },
];

export function SiteNav() {
  const pathname = usePathname(); // seul composant client : il faut l'URL courante pour le lien actif
  return (
    <nav className="border-b">
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-7 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold tracking-[-.02em]">
          <span className="size-2.5 rounded-full bg-mark ring-2 ring-foreground" />
          AMF Signal
        </Link>
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-sm font-medium underline-offset-[6px] decoration-[1.5px]",
              pathname === href ? "text-foreground underline" : "text-muted-foreground hover:text-foreground hover:underline",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
