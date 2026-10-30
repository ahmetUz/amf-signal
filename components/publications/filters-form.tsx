import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { PublicationFilters } from "@/lib/publications/filters";
import { formatDay } from "@/lib/format";

type Props = {
  filters: PublicationFilters;
  subtypes: { value: string; count: number }[];
  days: string[];
};

// Formulaire GET : les filtres vont dans l'URL. Pas de JavaScript côté client, et une vue filtrée peut se partager.
export function FiltersForm({ filters, subtypes, days }: Props) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="q">Société ou ISIN</Label>
        <Input id="q" name="q" defaultValue={filters.q} placeholder="ex. Air Liquide" className="w-56" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="subtype">Type d&apos;information</Label>
        <NativeSelect id="subtype" name="subtype" defaultValue={filters.subtype ?? ""} className="w-72">
          <NativeSelectOption value="">Tous les types</NativeSelectOption>
          {subtypes.map((s) => (
            <NativeSelectOption key={s.value} value={s.value}>
              {s.value} ({s.count})
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="day">Date</Label>
        <NativeSelect id="day" name="day" defaultValue={filters.day ?? ""} className="w-52">
          <NativeSelectOption value="">Tous les jours</NativeSelectOption>
          {days.map((d) => (
            <NativeSelectOption key={d} value={d}>
              {formatDay(d)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit">Filtrer</Button>
      <Button variant="ghost" render={<Link href="/" />} nativeButton={false}>
        Réinitialiser
      </Button>
    </form>
  );
}
