"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getServerTimeZone = () => "UTC";
const getLocalTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function LocalDateTime({
  value,
  dateOnly = false,
}: {
  value: string;
  dateOnly?: boolean;
}) {
  const timeZone = useSyncExternalStore(
    subscribe,
    getLocalTimeZone,
    getServerTimeZone,
  );
  const date = new Date(value);
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    ...(dateOnly
      ? { dateStyle: "short" as const }
      : { dateStyle: "short" as const, timeStyle: "short" as const }),
  }).format(date);

  return <time dateTime={value}>{formatted}</time>;
}
