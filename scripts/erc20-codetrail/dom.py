"""Tolerant HTML -> tree parser for the standalone Code Trail page."""
from html.parser import HTMLParser

VOID = {"br", "hr", "img", "input", "meta", "link", "source", "col", "area", "base", "wbr"}


class El:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs, parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []
        self.parent = parent

    def get(self, k, default=None):
        return self.attrs.get(k, default)

    def cls(self):
        return (self.attrs.get("class") or "").split()

    def has_cls(self, c):
        return c in self.cls()

    # --- traversal helpers -------------------------------------------------
    def find_all(self, tag=None, cls=None):
        out = []
        for c in self.children:
            if isinstance(c, El):
                if (tag is None or c.tag == tag) and (cls is None or c.has_cls(cls)):
                    out.append(c)
                out.extend(c.find_all(tag, cls))
        return out

    def find(self, tag=None, cls=None):
        r = self.find_all(tag, cls)
        return r[0] if r else None

    def kids(self, tag=None, cls=None):
        """Direct element children only."""
        return [
            c for c in self.children
            if isinstance(c, El)
            and (tag is None or c.tag == tag)
            and (cls is None or c.has_cls(cls))
        ]

    def text(self):
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return "".join(out)

    def __repr__(self):
        return f"<{self.tag} {self.attrs.get('class','')}>"


class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = El("#root", [])
        self.stack = [self.root]
        # inside <pre>, whitespace is significant and entities must survive raw
        self.pre_depth = 0

    def handle_starttag(self, tag, attrs):
        el = El(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(el)
        if tag not in VOID:
            self.stack.append(el)
        if tag == "pre":
            self.pre_depth += 1

    def handle_startendtag(self, tag, attrs):
        el = El(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(el)

    def handle_endtag(self, tag):
        if tag == "pre":
            self.pre_depth = max(0, self.pre_depth - 1)
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return
        # stray close tag: ignore

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def handle_comment(self, data):
        pass


def parse(html):
    b = Builder()
    b.feed(html)
    b.close()
    return b.root
