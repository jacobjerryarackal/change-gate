import { FileCode, FileDiff } from "lucide-react";

interface ChangedFileListProps {
  files: string[];
  selectedFile?: string;
  onSelectFile?: (file: string) => void;
}

export function ChangedFileList({ files, selectedFile, onSelectFile }: ChangedFileListProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileDiff className="size-3.5" />
        <span>Changed files ({files.length})</span>
      </div>
      <div className="flex flex-col gap-1 rounded border bg-card/40 p-1.5">
        {files.map((file) => {
          const isSelected = selectedFile === file;
          return (
            <button
              key={file}
              type="button"
              onClick={() => onSelectFile?.(file)}
              className={`flex items-center gap-2 rounded px-2 py-1 text-left font-mono text-xs transition-colors ${
                isSelected
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <FileCode className="size-3.5 shrink-0 opacity-70" />
              <span className="truncate">{file}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
