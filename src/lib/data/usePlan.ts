"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppData } from "./provider";
import { getSupabase } from "@/lib/supabase/client";
import {
  effectivePlan,
  hasFeature,
  type Effective,
  type Feature,
  type SubscriptionLike,
} from "@/lib/plans";

export interface PlanState extends Effective {
  loading: boolean;
  demo: boolean;
  trialUsed: boolean;
  period: "mensal" | "anual" | null;
  can: (f: Feature) => boolean;
  startTrial: () => Promise<string | null>;
}

/** Plano efetivo do usuário. No Modo demonstração, tudo fica liberado para conhecer o app. */
export function usePlan(): PlanState {
  const { store, version, refresh } = useAppData();
  const [sub, setSub] = useState<
    (SubscriptionLike & { trial_used: boolean; period: "mensal" | "anual" | null }) | null
  >(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const demo = store?.kind === "demo";
  const key = `${store?.userId}|${version}`;

  useEffect(() => {
    if (!store || demo) return;
    let alive = true;
    getSupabase()!
      .from("subscriptions")
      .select("plan,status,current_period_end,trial_ends_at,trial_used,period")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setSub((data as typeof sub) ?? null);
        setLoadedFor(key);
      });
    return () => {
      alive = false;
    };
  }, [store, demo, key]);

  const startTrial = useCallback(async () => {
    if (demo) return null;
    const { error } = await getSupabase()!.rpc("start_trial");
    if (error)
      return /trial_unavailable/.test(error.message)
        ? "O teste grátis já foi usado nesta conta."
        : "Não foi possível iniciar o teste agora.";
    refresh();
    return null;
  }, [demo, refresh]);

  const eff: Effective = demo
    ? { plan: "plus_ia", isTrial: false, daysLeft: null, canceledAtPeriodEnd: false }
    : effectivePlan(sub);
  return {
    ...eff,
    loading: !demo && loadedFor !== key,
    demo,
    trialUsed: sub?.trial_used ?? false,
    period: sub?.period ?? null,
    can: (f) => hasFeature(eff.plan, f),
    startTrial,
  };
}
