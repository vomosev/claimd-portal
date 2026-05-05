"use client";

import { useRef } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link, Image,
  Minus, Code, Quote,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ToolbarButtonProps {
  onClick:   () => void;
  title:     string;
  children:  React.ReactNode;
  disabled?: boolean;
  active?:   boolean;
}

// ── Single toolbar button ──────────────────────────────────────────────────────
function ToolbarButton({ onClick, title, children, disabled, active }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`
        p-1.5 rounded-md transition-colors text-sm
        ${active
          ? "bg-[#5871A7] text-white"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────
function ToolbarDivider() {
  return <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />;
}

// ── HTML Rich Textarea ─────────────────────────────────────────────────────────
interface HtmlTextareaProps {
  value:       string;
  onChange:    (v: string) => void;
  disabled?:   boolean;
  placeholder?: string;
  minHeight?:  string;
}

function HtmlTextarea({
  value,
  onChange,
  disabled,
  placeholder = "",
  minHeight = "320px",
}: HtmlTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Core insert helper ───────────────────────────────────────────────────────
  const wrapSelection = (before: string, after: string = "") => {
    const el = textareaRef.current;
    if (!el) return;

    const start  = el.selectionStart;
    const end    = el.selectionEnd;
    const sel    = value.slice(start, end);
    const newVal =
      value.slice(0, start) +
      before + sel + after +
      value.slice(end);

    onChange(newVal);

    // Restore cursor / selection after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const cursor = sel
        ? start + before.length + sel.length + after.length
        : start + before.length;
      el.setSelectionRange(
        sel ? start + before.length : cursor,
        sel ? start + before.length + sel.length : cursor
      );
    });
  };

  // Replace the current line with a prefixed version
  const prefixLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start     = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd   = value.indexOf("\n", start);
    const line      = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

    // Toggle: remove prefix if already present, else add
    const newLine = line.startsWith(prefix)
      ? line.slice(prefix.length)
      : prefix + line;

    const newVal =
      value.slice(0, lineStart) +
      newLine +
      (lineEnd === -1 ? "" : value.slice(lineEnd));

    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length);
    });
  };

  // Insert a block tag on its own line
  const insertBlock = (html: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const pos    = el.selectionStart;
    const newVal = value.slice(0, pos) + html + value.slice(pos);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = pos + html.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  // ── Prompt helpers ───────────────────────────────────────────────────────────
  const insertLink = () => {
    const el   = textareaRef.current;
    const sel  = el ? value.slice(el.selectionStart, el.selectionEnd) : "";
    const url  = window.prompt("Enter URL:", "https://");
    if (!url) return;
    const text = sel || window.prompt("Link text:", "Click here") || "Click here";
    const html = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    if (el && el.selectionStart !== el.selectionEnd) {
      wrapSelection(`<a href="${url}" target="_blank" rel="noopener noreferrer">`, "</a>");
    } else {
      insertBlock(html);
    }
  };

  const insertImage = () => {
    const src = window.prompt("Image URL:", "https://");
    if (!src) return;
    const alt = window.prompt("Alt text:", "") || "";
    insertBlock(`<img src="${src}" alt="${alt}" style="max-width:100%;" />`);
  };

  // ── Toolbar actions ──────────────────────────────────────────────────────────
  const actions = {
    bold:       () => wrapSelection("<strong>", "</strong>"),
    italic:     () => wrapSelection("<em>", "</em>"),
    underline:  () => wrapSelection("<u>", "</u>"),
    strike:     () => wrapSelection("<s>", "</s>"),
    code:       () => wrapSelection("<code>", "</code>"),
    h1:         () => wrapSelection("<h1>", "</h1>"),
    h2:         () => wrapSelection("<h2>", "</h2>"),
    h3:         () => wrapSelection("<h3>", "</h3>"),
    alignLeft:  () => wrapSelection('<p style="text-align:left">', "</p>"),
    alignCentre:() => wrapSelection('<p style="text-align:center">', "</p>"),
    alignRight: () => wrapSelection('<p style="text-align:right">', "</p>"),
    ul:         () => prefixLine("<li>"),
    ol:         () => prefixLine("<li>"),
    blockquote: () => wrapSelection("<blockquote>", "</blockquote>"),
    hr:         () => insertBlock("\n<hr />\n"),
    link:       insertLink,
    image:      insertImage,
    p:          () => wrapSelection("<p>", "</p>"),
    span:       () => wrapSelection("<span>", "</span>"),
    clearFormat:() => {
      // Strip all HTML tags from selection
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end   = el.selectionEnd;
      const sel   = value.slice(start, end).replace(/<[^>]*>/g, "");
      onChange(value.slice(0, start) + sel + value.slice(end));
    },
  };

  return (
    <div className={`
      rounded-lg border border-input overflow-hidden
      focus-within:ring-2 focus-within:ring-[#5871A7] focus-within:border-transparent
      ${disabled ? "opacity-60 pointer-events-none" : ""}
    `}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="
        flex flex-wrap items-center gap-0.5 px-2 py-1.5
        bg-gray-50 dark:bg-gray-800/60
        border-b border-input
      ">

        {/* Headings */}
        <ToolbarButton onClick={actions.h1} title="Heading 1" disabled={disabled}>
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={actions.h2} title="Heading 2" disabled={disabled}>
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={actions.h3} title="Heading 3" disabled={disabled}>
          <Heading3 size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inline styles */}
        <ToolbarButton onClick={actions.bold}      title="Bold"          disabled={disabled}><Bold          size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.italic}    title="Italic"        disabled={disabled}><Italic        size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.underline} title="Underline"     disabled={disabled}><Underline     size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.strike}    title="Strikethrough" disabled={disabled}><Strikethrough size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.code}      title="Inline code"   disabled={disabled}><Code          size={15} /></ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton onClick={actions.alignLeft}   title="Align left"   disabled={disabled}><AlignLeft   size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.alignCentre} title="Align centre" disabled={disabled}><AlignCenter size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.alignRight}  title="Align right"  disabled={disabled}><AlignRight  size={15} /></ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton onClick={actions.ul} title="Unordered list" disabled={disabled}><List        size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.ol} title="Ordered list"   disabled={disabled}><ListOrdered size={15} /></ToolbarButton>

        <ToolbarDivider />

        {/* Blocks */}
        <ToolbarButton onClick={actions.blockquote} title="Blockquote" disabled={disabled}><Quote size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.hr}         title="Divider"    disabled={disabled}><Minus size={15} /></ToolbarButton>

        <ToolbarDivider />

        {/* Media */}
        <ToolbarButton onClick={actions.link}  title="Insert link"  disabled={disabled}><Link  size={15} /></ToolbarButton>
        <ToolbarButton onClick={actions.image} title="Insert image" disabled={disabled}><Image size={15} /></ToolbarButton>

        <ToolbarDivider />

        {/* Paragraph / clear */}
        <ToolbarButton onClick={actions.p}           title="Wrap in <p>"      disabled={disabled}>
          <span className="text-[11px] font-bold font-mono leading-none">P</span>
        </ToolbarButton>
        <ToolbarButton onClick={actions.clearFormat} title="Strip HTML tags"  disabled={disabled}>
          <span className="text-[11px] font-bold leading-none line-through">T</span>
        </ToolbarButton>

      </div>

      {/* ── Textarea ─────────────────────────────────────────────────────── */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{ minHeight }}
        className="
          w-full px-3 py-3
          font-mono text-sm
          bg-white dark:bg-background
          text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          resize-y
          focus:outline-none
          disabled:cursor-not-allowed
        "
      />
    </div>
  );
}

// ── Drop-in replacement FormField ─────────────────────────────────────────────
// Replace your existing FormField block with this:

/*
<FormField
  name="htmltext"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <div className="flex items-center justify-between">
        <FormLabel className="flex items-center gap-2">
          <AlignLeft size={16} /> Notification Body
        </FormLabel>
        <span className="text-xs text-gray-400">HTML supported</span>
      </div>
      <FormControl>
        <HtmlTextarea
          value={field.value ?? ""}
          onChange={field.onChange}
          disabled={!isEditableBroadcast}
          placeholder={`<p>Dear recipient,</p>\n<p>We are excited to share this with you...</p>`}
          minHeight="320px"
        />
      </FormControl>
      <div className="flex justify-between items-center mt-1">
        <FormMessage />
        <span className="text-xs text-gray-400">
          {(field.value?.length || 0).toLocaleString()} characters
        </span>
      </div>
    </FormItem>
  )}
/>
*/

export { HtmlTextarea };