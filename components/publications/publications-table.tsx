import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { PublicationRow } from "@/lib/publications/queries";
import { subtypeLabel } from "@/lib/publications/labels";
import { formatDateTime } from "@/lib/format";

export function PublicationsTable({ rows }: { rows: PublicationRow[] }) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Aucune publication pour ces filtres.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-28">Date</TableHead>
          <TableHead className="w-56">Société</TableHead>
          <TableHead>Publication</TableHead>
          <TableHead className="w-48">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.uin} className="align-top">
            <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(row.publishedAt)}</TableCell>
            <TableCell className="whitespace-normal">
              <div className="font-medium">{row.company}</div>
              <div className="text-xs text-muted-foreground">
                {row.isin}
                {row.country && row.country !== "FR" && ` · ${row.country}`}
              </div>
            </TableCell>
            <TableCell className="whitespace-normal">
              <Badge variant="secondary" title={row.infoSubtype ?? undefined}>{subtypeLabel(row.infoSubtype)}</Badge>
              <a href={row.documentUrl} target="_blank" rel="noreferrer" className="mt-1 block hover:underline">
                {row.title}
              </a>
            </TableCell>
            <TableCell className="whitespace-normal">
              {row.score === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <div>
                  <span className="font-semibold tabular-nums">{row.score}</span>
                  {row.scoreReasons && (
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {row.scoreReasons.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
