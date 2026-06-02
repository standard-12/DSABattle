"use client";

import { Button } from "@/components/ui/button";

export function RunSubmitButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline">
        Run
      </Button>
      <Button type="button">Submit</Button>
    </div>
  );
}
