const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function asCount(value: unknown): number {
  return Number(value ?? 0);
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function containsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function toDoc<T extends { id: string }>(row: T): Omit<T, "id"> & { _id: string } {
  const { id, ...rest } = row;
  return { _id: id, ...rest };
}

export function toActorDoc<T extends { id: string; actor: unknown }>(row: T) {
  const { id, actor, ...rest } = row;
  return { _id: id, ...rest, user: actor ?? undefined };
}
