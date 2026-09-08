import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type TrustedPrimaryPromotion = {
  source_item_id: string;
  evidence_source_id: string;
};

export async function promoteTrustedPrimaryEvidence(
  limit = 25,
  itemIds?: string[],
) {
  const db = createAdminClient();
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await db.rpc(
    "promote_trusted_primary_source_items",
    {
      p_limit: boundedLimit,
      p_item_ids: itemIds?.length ? itemIds : null,
    },
  );
  if (error) {
    throw new Error(`Could not promote trusted primary evidence: ${error.message}`);
  }
  return {
    requested: boundedLimit,
    promoted: (data ?? []) as TrustedPrimaryPromotion[],
  };
}
