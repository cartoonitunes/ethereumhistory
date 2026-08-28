# ERC-20 Code Trail content generator

`src/app/erc20/content/*` is generated, not hand-written. It comes from the
standalone research document at `erc20-archaeology/site/index.html`, which is
the working copy the research is edited in.

The generator parses that page and emits JSX that uses this app's components
and design tokens:

- `figure.codeblock` becomes `<CodeBlock>`, which highlights on the server
- `div.tablewrap` becomes `<TableScroll>`
- each timeline entry becomes `<TimelineEvent>` inside a `<TimelineEra>`
- every 40-hex-digit address in the prose becomes `<Addr>`, a link to
  `/contract/<address>`
- external links keep `target="_blank"` and `rel="noopener noreferrer"`
- the page's own nav, footer chrome and script-driven scroll hints are dropped,
  because the app supplies those

## Running it

```bash
python3 scripts/erc20-codetrail/build.py
# or against a checkout elsewhere:
ERC20_CODETRAIL_SRC=/path/to/site/index.html python3 scripts/erc20-codetrail/build.py
```

Then `npx tsc --noEmit && npx eslint src/app/erc20`. Malformed output fails the
typecheck, so a clean compile is a real check on the conversion.

## Verifying nothing was lost

The point of the page is that it is complete. After regenerating, compare the
text of the source document against the rendered page; the only differences
should be UI chrome ("Copy", the filter count) and tokens split by the syntax
highlighter.
