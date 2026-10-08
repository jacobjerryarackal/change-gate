import { ChevronDown, GitPullRequest } from "lucide-react";
import type { ChangeProposal } from "@/types";

interface ProposalSelectorProps {
  proposals: ChangeProposal[];
  selectedId: string | null;
  onSelect: (proposalId: string) => void;
  disabled?: boolean;
}

export const PROPOSAL_LABELS: Record<string, { code: string; title: string }> = {
  "prop-001": { code: "CHANGE-001", title: "Safe Docstring & Type Annotation Fix" },
  "prop-002": { code: "CHANGE-002", title: "Patch Dependency Bump" },
  "prop-003": { code: "CHANGE-003", title: "Database Column Deprecation" },
  "prop-004": { code: "CHANGE-004", title: "Refactoring with Broken Tests" },
  "prop-005": { code: "CHANGE-005", title: "Unsanitized Security Auth Bypass" },
};

export function ProposalSelector({
  proposals,
  selectedId,
  onSelect,
  disabled = false,
}: ProposalSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="change-select"
        className="block font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        Select Change for Review
      </label>
      <div className="relative">
        <GitPullRequest className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <select
          id="change-select"
          value={selectedId ?? ""}
          onChange={(e) => {
            if (e.target.value) {
              onSelect(e.target.value);
            }
          }}
          disabled={disabled}
          className="w-full appearance-none rounded border border-border bg-card/60 py-2.5 pr-10 pl-9 font-mono text-xs text-foreground transition-colors hover:border-border/80 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
        >
          <option value="" disabled className="bg-popover text-muted-foreground py-1">
            Select a change to begin
          </option>
          {proposals.map((prop) => {
            const meta = PROPOSAL_LABELS[prop.id] ?? {
              code: prop.id.toUpperCase(),
              title: prop.title,
            };
            return (
              <option key={prop.id} value={prop.id} className="bg-popover text-popover-foreground py-1">
                {meta.code} — {meta.title}
              </option>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      </div>

      {/* Quick selection chips for 1-click access */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {proposals.map((prop) => {
          const meta = PROPOSAL_LABELS[prop.id] ?? { code: prop.id.toUpperCase(), title: prop.title };
          const isSelected = prop.id === selectedId;
          return (
            <button
              key={prop.id}
              type="button"
              onClick={() => onSelect(prop.id)}
              disabled={disabled}
              className={`rounded border px-2 py-1 font-mono text-[11px] transition-colors ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {meta.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
