"""Emit JSX from the parsed Code Trail tree."""
import json
import re

from dom import El

ADDR = re.compile(r"0x[0-9a-fA-F]{40}(?![0-9a-fA-F])")
SPECIAL = re.compile(r"[<>{}]")

# HTML attribute -> JSX attribute. data-* / aria-* pass through unchanged.
ATTR_MAP = {
    "class": "className",
    "for": "htmlFor",
    "colspan": "colSpan",
    "rowspan": "rowSpan",
    "tabindex": "tabIndex",
    "viewbox": "viewBox",
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
}

# Attributes that carry no meaning once the vanilla JS is gone.
DROP_ATTRS = {"data-painted", "aria-pressed", "data-filter"}

BLOCK = {
    "html", "body", "main", "header", "footer", "nav", "section", "article", "aside",
    "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "figure",
    "figcaption", "pre", "blockquote", "details", "summary", "form", "hr", "#root",
}

ONE_LINE = {"b", "i", "em", "strong", "span", "code", "cite", "dt", "dd", "th", "h4"}


def js(s):
    return json.dumps(s, ensure_ascii=False)


def attr(v):
    """JSX string attributes take no escapes, so quoted values become expressions."""
    return "{" + js(v) + "}" if '"' in v else js(v)


def obj(d):
    """A JS object literal with bare keys, so the output reads like handwriting."""
    parts = []
    for k, v in d.items():
        key = k if re.fullmatch(r"[A-Za-z_$][\w$]*", k) else js(k)
        parts.append(f"{key}: {json.dumps(v, ensure_ascii=False)}")
    return "{ " + ", ".join(parts) + " }"


def style_obj(css):
    parts = []
    for decl in css.split(";"):
        decl = decl.strip()
        if not decl or ":" not in decl:
            continue
        k, v = decl.split(":", 1)
        key = re.sub(r"-([a-z])", lambda m: m.group(1).upper(), k.strip())
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9]*", key):
            key = js(k.strip())
        parts.append(f"{key}: {js(v.strip())}")
    return "{ " + ", ".join(parts) + " }"


def is_block(node):
    return isinstance(node, El) and node.tag in BLOCK


class Emitter:
    """Turns the tree into JSX source text.

    `on_element` lets a caller intercept a node (used for code blocks, table
    wrappers and the timeline); return None to fall through to the default.
    """

    def __init__(self, on_element=None, indent="  "):
        self.on_element = on_element
        self.indent = indent

    # -- text ---------------------------------------------------------------
    def _addr_pieces(self, s):
        out = []
        pos = 0
        for m in ADDR.finditer(s):
            if m.start() > pos:
                out.append(("t", s[pos:m.start()]))
            out.append(("addr", m.group(0)))
            pos = m.end()
        if pos < len(s):
            out.append(("t", s[pos:]))
        return out

    def _emit_text(self, s, pad):
        """`s` is already whitespace-normalised by children()."""
        if not s:
            return []
        if not s.strip():
            return [pad + '{" "}']
        lines = []
        for kind, piece in self._addr_pieces(s):
            if kind == "addr":
                lines.append(f'{pad}<Addr a="{piece}" />')
                continue
            if not piece:
                continue
            lead = piece.startswith(" ")
            trail = piece.endswith(" ") and piece.strip() != ""
            core = piece.strip()
            if lead:
                lines.append(pad + '{" "}')
            if core:
                # A run starting with // reads as a comment to JSX.
                if SPECIAL.search(core) or core.startswith(("//", "/*")):
                    lines.append(pad + "{" + js(core) + "}")
                else:
                    lines.append(pad + core)
            if trail:
                lines.append(pad + '{" "}')
        return lines

    # -- attributes ---------------------------------------------------------
    def _attrs(self, el):
        out = []
        for k, v in el.attrs.items():
            if k in DROP_ATTRS:
                continue
            if k == "class":
                out.append(f"className={{cx({js(v)})}}")
            elif k == "style":
                out.append(f"style={{{style_obj(v)}}}")
            elif k.startswith("data-") or k.startswith("aria-"):
                out.append(f"{k}={attr(v)}" if v is not None else k)
            else:
                name = ATTR_MAP.get(k, k)
                out.append(f"{name}={attr(v)}" if v is not None else name)
        return out

    # -- elements -----------------------------------------------------------
    def node(self, n, depth, text=None):
        pad = self.indent * depth
        if isinstance(n, str):
            return self._emit_text(text if text is not None else n, pad)
        if self.on_element:
            hit = self.on_element(n, depth, self)
            if hit is not None:
                return hit
        return self.element(n, depth)

    def element(self, el, depth):
        pad = self.indent * depth
        tag = el.tag
        attrs = self._attrs(el)
        head = f"{pad}<{tag}"
        if attrs:
            head += " " + " ".join(attrs)

        if tag == "a":
            return self.anchor(el, depth)

        kids = self.children(el, depth + 1)
        if not kids:
            return [head + " />"]
        if tag in ONE_LINE and len(kids) == 1:
            body = kids[0].strip()
            if not body.startswith("<") and len(head) + len(body) < 116:
                return [f"{head}>{body}</{tag}>"]
        return [head + ">"] + kids + [f"{pad}</{tag}>"]

    def anchor(self, el, depth):
        pad = self.indent * depth
        href = el.get("href", "")
        cls = el.get("class")
        kids = self.children(el, depth + 1)
        attrs = [f"href={attr(href)}"]
        if cls:
            attrs.append(f"className={{cx({js(cls)})}}")
        if not href.startswith("#"):
            attrs += ['target="_blank"', 'rel="noopener noreferrer"']
        head = f"{pad}<a " + " ".join(attrs) + ">"
        if len(kids) == 1 and not kids[0].strip().startswith("<") and len(head) + len(kids[0].strip()) < 116:
            return [f"{head}{kids[0].strip()}</a>"]
        return [head] + kids + [f"{pad}</a>"]

    # -- whitespace ---------------------------------------------------------
    def children(self, el, depth):
        """Apply HTML whitespace collapsing, then emit."""
        raw = el.children
        # 1. merge adjacent text nodes (html.parser can split a run)
        merged = []
        for c in raw:
            if isinstance(c, str) and merged and isinstance(merged[-1], str):
                merged[-1] += c
            else:
                merged.append(c)

        # 2. collapse whitespace runs to single spaces
        norm = [re.sub(r"\s+", " ", c) if isinstance(c, str) else c for c in merged]

        # 3. drop whitespace that a block box would swallow
        parent_block = el.tag in BLOCK
        keep = []
        for i, c in enumerate(norm):
            if not isinstance(c, str):
                keep.append(c)
                continue
            prev = norm[i - 1] if i > 0 else None
            nxt = norm[i + 1] if i + 1 < len(norm) else None
            if not c.strip():
                # whitespace-only: only survives between two inline runs
                prev_inline = prev is not None and not is_block(prev)
                next_inline = nxt is not None and not is_block(nxt)
                if prev_inline and next_inline:
                    keep.append(" ")
                continue
            if c.startswith(" ") and (prev is None and parent_block or is_block(prev)):
                c = c[1:]
            if c.endswith(" ") and (nxt is None and parent_block or is_block(nxt)):
                c = c[:-1]
            keep.append(c)

        out = []
        for c in keep:
            out.extend(self.node(c, depth))
        return out

    def render(self, nodes, depth=0):
        out = []
        for n in nodes:
            out.extend(self.node(n, depth))
        return "\n".join(out)
