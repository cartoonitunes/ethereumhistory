"""Generate the /erc20 page content from the standalone Code Trail HTML."""
import json
import os
import re
import sys

from dom import parse, El
from emit import Emitter, js, obj

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))

# The research document lives in its own repository. Point at a checkout with
# ERC20_CODETRAIL_SRC, or keep the default sibling location.
SRC = os.environ.get(
    "ERC20_CODETRAIL_SRC",
    os.path.expanduser("~/Projects/erc20-archaeology/site/index.html"),
)
OUT = os.path.join(REPO, "src", "app", "erc20", "content")

HEADER = """// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";
"""

TIMELINE_HEADER = HEADER + """import { TimelineEra, TimelineEvent } from "../components/Timeline";
"""


# --------------------------------------------------------------------------
# interceptors
# --------------------------------------------------------------------------
def code_block(el, depth, em):
    """figure.codeblock -> <CodeBlock />"""
    if el.tag != "figure" or not el.has_cls("codeblock"):
        return None
    pad = em.indent * depth
    cap = el.find("figcaption")
    pre = el.find("pre")
    code = pre.find("code") if pre else None
    if code is None:
        return None
    lang = code.get("data-lang", "text")
    text = code.text()
    # Trailing newline inside <pre><code> is presentational.
    text = text.rstrip("\n")
    attrs = [f'lang="{lang}"']
    if cap is not None:
        attrs.append(f"caption={{{js(cap.text().strip())}}}")
    attrs.append(f"code={{{js(text)}}}")
    return [f"{pad}<CodeBlock " + " ".join(attrs) + " />"]


def table_scroll(el, depth, em):
    """div.tablewrap -> <TableScroll> (keeps the sideways-scroll hint)."""
    if el.tag != "div" or not el.has_cls("tablewrap"):
        return None
    pad = em.indent * depth
    rest = [c for c in el.cls() if c != "tablewrap"]
    attrs = ""
    if rest:
        attrs = f" className={{cx({js(' '.join(rest))})}}"
    kids = em.children(el, depth + 1)
    return [f"{pad}<TableScroll{attrs}>"] + kids + [f"{pad}</TableScroll>"]


def drop(el, depth, em):
    """The scroll hint was script-driven chrome; TableScroll owns it now."""
    if el.tag == "p" and el.has_cls("scrollhint"):
        return []
    return None


# The standalone document is titled for itself; on Ethereum History the page
# carries the site's plainer register, and the eyebrow states the span the
# timeline actually covers (era 5 runs to September 2017, with its
# out-of-corpus entries marked as such where they appear).
TEXT_OVERRIDES = {
    "How the token standard was written": "The History of ERC-20",
    "A primary-source reconstruction, 2015 to 2016":
        "A primary-source reconstruction, 2015 to 2017",
}


def override(el, depth, em):
    if el.tag not in ("h1", "p"):
        return None
    text = el.text().strip()
    if text not in TEXT_OVERRIDES:
        return None
    pad = em.indent * depth
    attrs = em._attrs(el)
    head = f"{pad}<{el.tag}" + ((" " + " ".join(attrs)) if attrs else "")
    return [f"{head}>{TEXT_OVERRIDES[text]}</{el.tag}>"]


def default_intercept(el, depth, em):
    # An interceptor may legitimately return [] (emit nothing), so each result
    # is tested against None rather than for truthiness.
    for fn in (override, drop, code_block, table_scroll):
        hit = fn(el, depth, em)
        if hit is not None:
            return hit
    return None


EM = Emitter(on_element=default_intercept)


# --------------------------------------------------------------------------
# timeline
# --------------------------------------------------------------------------
def slugify(s):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:60]


def event_component(li, depth, seen_ids):
    """<li class="ev"> -> <TimelineEvent ...>detail</TimelineEvent>"""
    pad = EM.indent * depth
    src = li.get("data-src", "")
    star = li.get("data-star") == "1"
    out_of_corpus = li.has_cls("ev--out")

    when = li.find("div", "ev-when")
    date = ""
    times = []
    if when is not None:
        b = when.find("b")
        if b is not None:
            date = b.text().strip()
        # every non-<b> text/br fragment is a time stamp
        for c in when.children:
            if isinstance(c, str):
                t = c.strip()
                if t:
                    times.append(t)

    details = li.find("details", "ev-body")
    summary = details.find("summary")
    title_el = summary.find("span", "ev-title")
    sub_el = summary.find("span", "ev-sub")
    mobile_el = summary.find("span", "ev-mobile-when")
    tags_el = summary.find("span", "ev-tags")

    title = title_el.text().strip()
    tags = []
    if tags_el is not None:
        for t in tags_el.kids("span"):
            tags.append({"label": t.text().strip(), "actor": t.has_cls("tag--actor")})

    eid = li.get("id")
    if not eid:
        eid = "ev-" + slugify(title)
        n = 2
        base = eid
        while eid in seen_ids:
            eid = f"{base}-{n}"
            n += 1
    seen_ids.add(eid)

    mobile_when = mobile_el.text().strip() if mobile_el is not None else ""

    attrs = [
        f'id="{eid}"',
        f'src="{src}"',
    ]
    if star:
        attrs.append("star")
    if out_of_corpus:
        attrs.append("outOfCorpus")
    attrs += [
        f"date={{{js(date)}}}",
        f"times={{{json.dumps(times, ensure_ascii=False)}}}",
        f"mobileWhen={{{js(mobile_when)}}}",
        f"title={{{js(title)}}}",
        f"tags={{[{', '.join(obj(t) for t in tags)}]}}",
    ]

    sub_kids = EM.children(sub_el, depth + 2) if sub_el is not None else []
    attrs.append("summary={")

    detail = li.find("div", "ev-detail")
    detail_kids = EM.children(detail, depth + 1) if detail is not None else []

    lines = [f"{pad}<TimelineEvent"]
    for a in attrs[:-1]:
        lines.append(f"{pad}{EM.indent}{a}")
    lines.append(f"{pad}{EM.indent}summary={{")
    lines.append(f"{pad}{EM.indent * 2}<>")
    lines.extend(sub_kids)
    lines.append(f"{pad}{EM.indent * 2}</>")
    lines.append(f"{pad}{EM.indent}}}")
    lines.append(f"{pad}>")
    lines.extend(detail_kids)
    lines.append(f"{pad}</TimelineEvent>")

    return lines, {"id": eid, "src": src, "star": star}


def era_component(era, index, seen_ids, depth=2):
    pad = EM.indent * depth
    head = era.find("div", "era-head")
    span = head.find("span", "era-span").text().strip()
    h3 = head.find("h3").text().strip()
    blurb_el = head.find("p")

    ol = era.find("ol", "tl")
    events = [c for c in ol.kids("li") if c.has_cls("ev")]

    lines = [f"{pad}<TimelineEra"]
    lines.append(f'{pad}{EM.indent}id="era-{index}"')
    lines.append(f"{pad}{EM.indent}span={{{js(span)}}}")
    lines.append(f"{pad}{EM.indent}title={{{js(h3)}}}")
    lines.append(f"{pad}{EM.indent}blurb={{")
    lines.append(f"{pad}{EM.indent * 2}<>")
    lines.extend(EM.children(blurb_el, depth + 3))
    lines.append(f"{pad}{EM.indent * 2}</>")
    lines.append(f"{pad}{EM.indent}}}")
    lines.append(f"{pad}>")

    index_entries = []
    for li in events:
        elines, meta = event_component(li, depth + 1, seen_ids)
        lines.extend(elines)
        index_entries.append(meta)
    lines.append(f"{pad}</TimelineEra>")
    return lines, index_entries


# --------------------------------------------------------------------------
# section emission
# --------------------------------------------------------------------------
def section_body(sec, depth=2):
    """Emit the children of a section's .wrap, skipping the wrapper itself."""
    wrap = None
    for c in sec.kids("div"):
        if c.has_cls("wrap"):
            wrap = c
            break
    node = wrap if wrap is not None else sec
    return EM.children(node, depth)


def write(name, header, component, body_lines, props=""):
    path = os.path.join(OUT, f"{name}.tsx")
    src = header + "\n"
    src += f"export function {component}({props}) {{\n"
    src += "  return (\n    <>\n"
    src += "\n".join(body_lines) + "\n"
    src += "    </>\n  );\n}\n"
    with open(path, "w") as f:
        f.write(src)
    return path


def main():
    html = open(SRC).read()
    body = html[html.index("<body>"): html.index("<script>\n(function")]
    root = parse(body)

    main_el = root.find("main")
    sections = {}
    for sec in main_el.kids("section"):
        sid = sec.get("id") or ("hero" if sec.has_cls("hero") else None)
        if sid:
            sections[sid] = sec

    os.makedirs(OUT, exist_ok=True)
    written = []

    simple = [
        ("hero", "Hero"),
        ("interface", "Interface"),
        ("findings", "Findings"),
        ("members", "Members"),
        ("artifacts", "Artifacts"),
        ("mistcoin", "MistCoin"),
        ("onchain", "Onchain"),
        ("compliance", "Compliance"),
        ("method", "Method"),
    ]
    for sid, comp in simple:
        sec = sections[sid]
        written.append(write(sid, HEADER, comp, section_body(sec, 3)))

    # Timeline intro (the #timeline section holds only the lede)
    written.append(
        write("timeline-intro", HEADER, "TimelineIntro", section_body(sections["timeline"], 3))
    )

    # Eras
    tl_root = None
    for d in main_el.find_all("div"):
        if d.get("id") == "tl-root":
            tl_root = d
            break
    eras = [c for c in tl_root.kids("div") if c.has_cls("era")]
    seen_ids = set()
    all_index = []
    for i, era in enumerate(eras, start=1):
        lines, entries = era_component(era, i, seen_ids, depth=3)
        all_index.append({"id": f"era-{i}", "events": entries})
        written.append(write(f"era-{i}", TIMELINE_HEADER, f"Era{i}", lines))

    # Footer
    foot = root.find("footer", "foot")
    written.append(write("colophon", HEADER, "Colophon", section_body(foot, 3)))

    # Lightweight index for the client filter shell
    idx = os.path.join(OUT, "timeline-index.ts")
    with open(idx, "w") as f:
        f.write(
            "// Generated. Lightweight index of the timeline, used by the filter shell\n"
            "// so the event bodies themselves never have to reach the client bundle.\n"
            "export interface TimelineIndexEvent {\n"
            "  id: string;\n  src: string;\n  star: boolean;\n}\n\n"
            "export interface TimelineIndexEra {\n"
            "  id: string;\n  events: TimelineIndexEvent[];\n}\n\n"
            "export const TIMELINE_INDEX: TimelineIndexEra[] = "
            + json.dumps(all_index, indent=2)
            + ";\n\nexport const TIMELINE_TOTAL = "
            + str(sum(len(e["events"]) for e in all_index))
            + ";\n"
        )
    written.append(idx)

    for p in written:
        print(os.path.basename(p), os.path.getsize(p))


if __name__ == "__main__":
    main()
