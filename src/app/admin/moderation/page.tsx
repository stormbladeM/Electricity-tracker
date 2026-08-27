import type { Metadata } from "next";
import { ModerationView } from "@/components/admin/moderation/moderation-view";
import {
  parseFlaggedOnly,
  parseModerationTab,
} from "@/components/admin/moderation/moderation-tab";

export const metadata: Metadata = {
  title: "Moderation — Admin",
};

/**
 * `?tab=` and `?flagged=` come from the URL so a moderator can link a
 * colleague straight to "contributors with flags".
 */
export default async function ModerationPage({
  searchParams,
}: PageProps<"/admin/moderation">) {
  const { tab, flagged } = await searchParams;

  return (
    <ModerationView
      tab={parseModerationTab(tab)}
      flaggedOnly={parseFlaggedOnly(flagged)}
    />
  );
}
