import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDraft } from "@/lib/draft";
import { saveAssessment } from "@/lib/assessments";

export function SaveButton() {
  const d = useDraft();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const id = await saveAssessment(d);
          toast.success("Assessment saved");
          nav({ to: "/assessments/$shareId", params: { shareId: id } });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Saving…" : "Save assessment"}
    </Button>
  );
}
