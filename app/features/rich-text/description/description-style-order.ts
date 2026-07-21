export interface DescriptionStyleEntry {
  property: string;
  value: string;
  order: number;
}

const OVERLAP_BUCKETS = [
  bucket("margin", ["margin", "margin-top", "margin-right", "margin-bottom", "margin-left"]),
  bucket("padding", ["padding", "padding-top", "padding-right", "padding-bottom", "padding-left"]),
  bucket("background", ["background", "background-color"]),
  bucket("border-paint", [
    "border", "border-top", "border-right", "border-bottom", "border-left",
    "border-color", "border-style", "border-width",
  ]),
  bucket("border-radius", [
    "border-radius", "border-top-left-radius", "border-top-right-radius",
    "border-bottom-right-radius", "border-bottom-left-radius",
  ]),
  bucket("flex-sizing", ["flex", "flex-basis", "flex-grow", "flex-shrink"]),
  bucket("gap", ["gap", "row-gap", "column-gap"]),
];

export function orderDescriptionStyleEntries(entries: DescriptionStyleEntry[]): DescriptionStyleEntry[] {
  const latest = new Map<string, DescriptionStyleEntry>();
  entries.forEach((entry) => latest.set(entry.property, entry));
  const groups = new Map<string, DescriptionStyleEntry[]>();
  latest.forEach((entry) => addToGroup(groups, groupName(entry.property), entry));
  return Array.from(groups).sort((left, right) => groupSortKey(left).localeCompare(groupSortKey(right)))
    .flatMap(([name, group]) => name.startsWith("overlap:")
      ? group.sort((left, right) => left.order - right.order)
      : group);
}

function groupSortKey([name, entries]: [string, DescriptionStyleEntry[]]): string {
  const property = entries.map((entry) => entry.property).sort()[0] ?? "";
  return `${property}:${name}`;
}

function bucket(name: string, properties: string[]) {
  return { name, properties: new Set(properties) };
}

function groupName(property: string): string {
  const overlap = OVERLAP_BUCKETS.find((candidate) => candidate.properties.has(property));
  return overlap ? `overlap:${overlap.name}` : `property:${property}`;
}

function addToGroup(
  groups: Map<string, DescriptionStyleEntry[]>,
  name: string,
  entry: DescriptionStyleEntry,
): void {
  const group = groups.get(name) ?? [];
  group.push(entry);
  groups.set(name, group);
}
