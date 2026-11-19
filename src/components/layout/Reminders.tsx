"use client";

import { useEffect, useRef } from "react";
import { useAppData, useRecords } from "@/lib/data/provider";

/** Lembretes locais enquanto o app está aberto (sem push em segundo plano nesta versão). */
export function Reminders() {
  const { preferences, eligibility } = useAppData();
  const fasting = useRecords("fasting_sessions", { limit: 1 });
  const notified = useRef<string | null>(null);

  useEffect(() => {
    if (!("Notification" in window)) return;
    const t = setInterval(() => {
      if (Notification.permission !== "granted") return;
      const active = fasting.data.find((f) => !f.ended_at);
      if (
        preferences?.remind_fasting &&
        eligibility.fasting.allowed &&
        active &&
        Date.now() >= Date.parse(active.expected_end_at) &&
        notified.current !== active.id
      ) {
        notified.current = active.id;
        new Notification("Leveza", {
          body: "O tempo de jejum que você planejou terminou. Encerre quando quiser.",
          icon: "/icons/icon-192.png",
        });
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [fasting.data, preferences, eligibility.fasting.allowed]);

  useEffect(() => {
    if (!preferences?.remind_water || !("Notification" in window)) return;
    const t = setInterval(() => {
      if (Notification.permission === "granted")
        new Notification("Leveza", {
          body: "Que tal um copo de água?",
          icon: "/icons/icon-192.png",
        });
    }, 2 * 3_600_000);
    return () => clearInterval(t);
  }, [preferences?.remind_water]);

  return null;
}
