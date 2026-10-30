import Link from "next/link";

export function SiteNav() {
  return (
    <nav className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3 text-sm">
        <Link href="/" className="font-semibold">AMF Signal</Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground">Publications</Link>
        <Link href="/breves" className="text-muted-foreground hover:text-foreground">Brèves</Link>
      </div>
    </nav>
  );
}
