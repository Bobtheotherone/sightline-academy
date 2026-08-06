import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

/** Styled Radix Tabs — underline style, blaze-adjacent active accent. */
export function Tabs({
  items,
  defaultValue,
  label,
  className = "",
}: {
  items: TabItem[];
  defaultValue?: string;
  label: string;
  className?: string;
}) {
  return (
    <RadixTabs.Root defaultValue={defaultValue ?? items[0]?.value} className={className}>
      <RadixTabs.List
        aria-label={label}
        className="flex gap-1 border-b border-line-200"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-ink-500 transition-colors duration-(--ts-dur-fast) hover:text-pine-950 data-[state=active]:border-pine-700 data-[state=active]:text-pine-950"
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value} className="pt-5 outline-none">
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
