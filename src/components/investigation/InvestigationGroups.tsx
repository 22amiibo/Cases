"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import styles from "./InvestigationGroups.module.css";

export type GroupedInvestigationItem = {
  id: string;
  displayCategory?: string;
  displayDepth?: number;
};

type InvestigationGroupsProps<T extends GroupedInvestigationItem> = {
  items: readonly T[];
  listClassName?: string;
  getItemClassName?: (item: T) => string | undefined;
  renderItem: (item: T) => ReactNode;
};

function groupByCategory<T extends GroupedInvestigationItem>(items: readonly T[]) {
  const groups = new Map<string | null, T[]>();
  items.forEach((item) => {
    const category = item.displayCategory ?? null;
    const group = groups.get(category) ?? [];
    group.push(item);
    groups.set(category, group);
  });
  return [...groups.entries()];
}

export function InvestigationGroups<T extends GroupedInvestigationItem>({
  items,
  listClassName,
  getItemClassName,
  renderItem,
}: InvestigationGroupsProps<T>) {
  const baseId = useId();

  return (
    <div className={styles.groups}>
      {groupByCategory(items).map(([category, group], groupIndex) => {
        const headingId = `${baseId}-category-${groupIndex}`;
        const list = (
          <ol className={`${styles.list} ${listClassName ?? ""}`.trim()}>
            {group.map((item) => (
              <li
                className={getItemClassName?.(item)}
                key={item.id}
                style={{
                  "--investigation-depth": Math.max(0, item.displayDepth ?? 0),
                } as CSSProperties}
              >
                {renderItem(item)}
              </li>
            ))}
          </ol>
        );

        if (!category) return <div key="uncategorized">{list}</div>;

        return (
          <section
            aria-labelledby={headingId}
            className={styles.group}
            key={category}
          >
            <h3 id={headingId}>{category}</h3>
            {list}
          </section>
        );
      })}
    </div>
  );
}
