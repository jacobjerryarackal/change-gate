import { useState } from "react";
import { Check, Copy, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiffViewerProps {
  diffSnippet: string;
  filename?: string;
}

export function DiffViewer({ diffSnippet, filename }: DiffViewerProps) {
  const [copied, setCopied] = useState(false);

  const lines = diffSnippet.split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diffSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded border bg-card/60 text-card-foreground overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 font-mono text-muted-foreground">
          <FileCode2 className="size-3.5" />
          <span>{filename ?? "diff.patch"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 gap-1 px-2 text-[11px] font-mono text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              <span>copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>copy</span>
            </>
          )}
        </Button>
      </div>

      <div className="overflow-x-auto p-0 font-mono text-xs leading-5">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isHunk = line.startsWith("@@");
              const isAddition = line.startsWith("+") && !line.startsWith("+++");
              const isDeletion = line.startsWith("-") && !line.startsWith("---");

              let rowClass = "hover:bg-muted/30 transition-colors";
              let textClass = "text-foreground";
              let signClass = "text-muted-foreground";

              if (isHunk) {
                rowClass = "bg-muted/50 font-semibold";
                textClass = "text-muted-foreground";
              } else if (isAddition) {
                rowClass = "bg-emerald-500/10 dark:bg-emerald-950/30";
                textClass = "text-emerald-900 dark:text-emerald-200";
                signClass = "text-emerald-600 dark:text-emerald-400 font-bold";
              } else if (isDeletion) {
                rowClass = "bg-rose-500/10 dark:bg-rose-950/30";
                textClass = "text-rose-900 dark:text-rose-200";
                signClass = "text-rose-600 dark:text-rose-400 font-bold";
              }

              const symbol = isAddition ? "+" : isDeletion ? "-" : isHunk ? " " : " ";
              const content = isAddition || isDeletion ? line.slice(1) : line;

              return (
                <tr key={idx} className={rowClass}>
                  <td className="w-8 select-none border-r border-border/50 py-0.5 text-right font-mono text-[11px] text-muted-foreground/60 pr-2">
                    {idx + 1}
                  </td>
                  <td className={`w-5 select-none py-0.5 text-center font-mono ${signClass}`}>
                    {symbol}
                  </td>
                  <td className={`py-0.5 pr-4 pl-1 font-mono whitespace-pre ${textClass}`}>
                    {content}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
