/* The one markdown surface for activity payloads (SPEC-007). Payload `md`
 * fields are trusted authored curriculum content delivered by our own API, so
 * they render without a sanitizer pass — `marked` parses, typographic styles
 * come from the design tokens via Tailwind selectors.
 */
import { useMemo } from "react";
import { marked } from "marked";

marked.use({ gfm: true, breaks: false });

const BLOCK_STYLES = [
  "[&>p+p]:mt-3",
  "[&_strong]:font-semibold [&_strong]:text-pine-950",
  "[&_em]:italic",
  "[&_a]:font-medium [&_a]:text-pine-700 [&_a]:underline",
  "[&_code]:font-mono [&_code]:text-sm [&_code]:text-pine-700",
  "[&_ul]:mt-3 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5 [&_ul>li]:list-disc",
  "[&_ol]:mt-3 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol]:pl-5 [&_ol>li]:list-decimal",
  "[&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-pine-300 [&_blockquote]:pl-4 [&_blockquote]:text-ink-500",
].join(" ");

const INLINE_STYLES =
  "[&_strong]:font-semibold [&_strong]:text-pine-950 [&_em]:italic [&_code]:font-mono [&_code]:text-sm";

export function Markdown({
  md,
  inline = false,
  className = "",
}: {
  md: string;
  /** Render without paragraph wrapping (single-line contexts). */
  inline?: boolean;
  className?: string;
}) {
  const html = useMemo(
    () =>
      inline
        ? (marked.parseInline(md, { async: false }) as string)
        : (marked.parse(md, { async: false }) as string),
    [md, inline],
  );
  if (inline) {
    return (
      <span
        className={`${INLINE_STYLES} ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <div
      className={`${BLOCK_STYLES} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
