import { Bot, GitBranch, Plus, Minus, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "./diff-viewer";
import { ChangedFileList } from "./changed-file-list";
import type { ChangeProposal } from "@/types";

interface ChangeOverviewProps {
  proposal: ChangeProposal;
  selectedFile?: string;
  onSelectFile?: (file: string) => void;
}

export function ChangeOverview({
  proposal,
  selectedFile,
  onSelectFile,
}: ChangeOverviewProps) {
  const isAgent = proposal.author_type === "autonomous_agent";

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="space-y-2 rounded border bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {proposal.id}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="inline-flex items-center gap-1 rounded border border-border/80 bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            <GitBranch className="size-3" />
            {proposal.target_branch}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-border/80 bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {isAgent ? (
              <Bot className="size-3 text-blue-500" />
            ) : (
              <UserCheck className="size-3 text-emerald-500" />
            )}
            {proposal.author_id}
          </span>
        </div>

        <h2 className="text-base font-semibold leading-snug tracking-tight text-foreground">
          {proposal.title}
        </h2>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {proposal.summary}
        </p>

        {/* Tags and Diff Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-1.5">
            {proposal.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded px-1.5 py-0 text-[10px] font-mono font-normal text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <Plus className="size-3 mr-0.5" />
              {proposal.diff_stat.additions}
            </span>
            <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-medium">
              <Minus className="size-3 mr-0.5" />
              {proposal.diff_stat.deletions}
            </span>
            <span className="text-muted-foreground text-[11px]">
              ({proposal.diff_stat.files_changed} files)
            </span>
          </div>
        </div>
      </div>

      {/* Changed Files */}
      <ChangedFileList
        files={proposal.changed_files}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
      />

      {/* Diff Viewer */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Unified Diff</span>
          <span className="font-mono text-[11px]">
            {proposal.diff_snippet.split("\n").length} lines
          </span>
        </div>
        <DiffViewer
          diffSnippet={proposal.diff_snippet}
          filename={selectedFile || proposal.changed_files[0]}
        />
      </div>
    </div>
  );
}
