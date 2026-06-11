"use client";

import type { ReactNode } from "react";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

type WorkspaceShellProps = {
  /** Optional bar rendered full-width above the split (title / battle status). */
  topBar?: ReactNode;
  left: ReactNode;
  right: ReactNode;
};

/**
 * LeetCode-style two-pane workspace: problem on the left, editor on the right,
 * with a draggable divider. Shared by the practice page and the battle room.
 */
export function WorkspaceShell({ topBar, left, right }: WorkspaceShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {topBar}

      <div className="min-h-0 flex-1 p-2">
        <ResizablePanelGroup
          direction="horizontal"
          className="rounded-lg border border-border"
        >
          <ResizablePanel defaultSize={45} minSize={25}>
            {left}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={55} minSize={30}>
            {right}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
