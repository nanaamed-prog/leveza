"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { LocalStore, SupabaseStore, safeStorage, type DataStore, type ListOptions } from "./store";
import type {
  Goal,
  Profile,
  ScreeningRow,
  TableName,
  Tables,
  UserPreferences,
  WeightEntry,
} from "./types";
import { evaluateEligibility, type Eligibility } from "@/lib/calc/eligibility";
import { DEFAULT_TZ } from "@/lib/dates";

type Status = "loading" | "signed_out" | "ready";

interface AppData {
  status: Status;
  isDemo: boolean;
  store: DataStore | null;
  session: Session | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  screening: ScreeningRow | null;
  goal: Goal | null;
  latestWeight: WeightEntry | null;
  eligibility: Eligibility;
  tz: string;
  /** Incrementado a cada alteração: telas recarregam seus dados. */
  version: number;
  refresh: () => void;
  enterDemo: () => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);
const DEMO_FLAG = "leveza:demo:active";

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [store, setStore] = useState<DataStore | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [screening, setScreening] = useState<ScreeningRow | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [version, setVersion] = useState(0);

  // Sessão
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Lê o armazenamento local depois da montagem (sistema externo ao React).
      let active = true;
      Promise.resolve().then(() => {
        if (!active) return;
        const demo = safeStorage.get(DEMO_FLAG) === "1";
        if (demo) setStore(new LocalStore());
        else setStatus("signed_out");
      });
      return () => {
        active = false;
      };
    }
    const sb = getSupabase()!;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) setStore(new SupabaseStore(sb, data.session.user.id));
      else setStatus("signed_out");
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s)
        setStore((prev) =>
          prev && prev.userId === s.user.id ? prev : new SupabaseStore(sb, s.user.id),
        );
      else {
        setStore(null);
        setStatus("signed_out");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Dados-base do usuário
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, prefs, scr, goals, weights] = await Promise.all([
          store.getSingle("profiles"),
          store.getSingle("user_preferences"),
          store.list("health_screenings", { limit: 1 }),
          store.list("goals", { eq: { status: "ativa" }, limit: 1 }),
          store.list("weight_entries", { limit: 1 }),
        ]);
        if (cancelled) return;
        setProfile(p);
        setPreferences(prefs);
        setScreening(scr[0] ?? null);
        setGoal(goals[0] ?? null);
        setLatestWeight(weights[0] ?? null);
      } finally {
        if (!cancelled) setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const enterDemo = useCallback(() => {
    safeStorage.set(DEMO_FLAG, "1");
    setStatus("loading");
    setStore(new LocalStore());
  }, []);

  const signOut = useCallback(async () => {
    if (store?.kind === "supabase") await getSupabase()!.auth.signOut();
    safeStorage.remove(DEMO_FLAG);
    setStore(null);
    setProfile(null);
    setScreening(null);
    setStatus("signed_out");
  }, [store]);

  const eligibility = useMemo(() => {
    const bmi =
      latestWeight && profile?.height_cm
        ? latestWeight.weight_kg / (profile.height_cm / 100) ** 2
        : null;
    return evaluateEligibility(screening, { currentBmi: bmi });
  }, [screening, latestWeight, profile]);

  const value: AppData = {
    status,
    isDemo: store?.kind === "demo" || (!isSupabaseConfigured && status !== "loading"),
    store,
    session,
    profile,
    preferences,
    screening,
    goal,
    latestWeight,
    eligibility,
    tz: profile?.timezone || DEFAULT_TZ,
    version,
    refresh,
    enterDemo,
    signOut,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppData fora do AppDataProvider");
  return v;
}

/** Lista registros de uma tabela e recarrega quando algo muda. */
export function useRecords<T extends TableName>(table: T, opts: ListOptions = {}) {
  const { store, version } = useAppData();
  const key = JSON.stringify(opts);
  const reqKey = `${store?.userId ?? ""}|${table}|${key}|${version}`;
  const [state, setState] = useState<{ forKey: string; data: Tables[T][]; error: string | null }>({
    forKey: "",
    data: [],
    error: null,
  });

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    store
      .list(table, JSON.parse(key) as ListOptions)
      .then((rows) => !cancelled && setState({ forKey: reqKey, data: rows, error: null }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setState((s) => ({
            ...s,
            forKey: reqKey,
            error: e instanceof Error ? e.message : "Erro ao carregar.",
          })),
      );
    return () => {
      cancelled = true;
    };
  }, [store, table, key, reqKey]);

  return { data: state.data, loading: state.forKey !== reqKey, error: state.error };
}
