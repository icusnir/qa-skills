# Claude Code Skills — Interface Quality Toolkit

A collection of Claude Code skills for auditing digital interfaces. Drop in a screenshot, Figma URL, live URL, or HTML file and get structured UX/UI critique and WCAG 2.2 AA accessibility findings.

---

## Skills

| Skill | Command | Purpose |
|---|---|---|
| **ux-ui-validator** | `/ux-ui-validator` | Unified entry point — UX/UI + accessibility in one skill. Start here. |
| **uxui-inspector-universal** | `/uxui-inspector-universal` | Standalone UX/UI critique only — 30 UX laws, heuristics, cognitive load. |
| **wcag-inspector-universal** | `/wcag-inspector-universal` | Standalone WCAG 2.2 AA audit only — pass/fail per criterion, exact contrast ratios. |

**`ux-ui-validator` supersedes the two standalone skills.** The standalones exist for focused, single-domain audits.

---

## Requirements

- [Claude Code](https://claude.ai/code) (any version)
- For Figma URL input: Figma MCP server connected in Claude Code

---

## Installation

Clone or download this repository, then copy the skill folder(s) to your Claude Code skills directory.

### macOS / Linux

```bash
# Recommended — install the unified skill only
cp -r design-validator/ux-ui-validator ~/.claude/skills/

# Or install all three
cp -r design-validator/ux-ui-validator \
      design-validator/uxui-inspector-universal \
      design-validator/wcag-inspector-universal \
      ~/.claude/skills/
```

### Windows

```
Copy the folder(s) to: C:\Users\<YourName>\.claude\skills\
```

Restart Claude Code or start a new session after installing. Skills load automatically at session start.

---

## Usage

### Input types

All skills accept the same inputs:

| Input | How to provide |
|---|---|
| Screenshot | Attach the image file directly in chat |
| Figma URL | Paste a `figma.com/design/...` link (requires Figma MCP) |
| Live URL | Paste any `https://` or `localhost` URL |
| HTML file | Attach or reference a `.html` file |

### `/ux-ui-validator` — unified audit

Invoke manually or drop in any interface and the skill activates automatically.

```
/ux-ui-validator [screenshot / URL / Figma link]
```

On first run, the skill presents a mode selector:

```
🎨  UX/UI   — design quality, UX laws, interaction patterns
♿  WCAG    — WCAG 2.2 AA compliance, pass/fail per criterion
✨  Both    — complete picture (recommended)
```

Reply `UX`, `WCAG`, or `Both`. If your message already contains a clear signal ("check accessibility", "full audit"), the skill skips the menu and starts immediately.

#### UX/UI depth options

- **Quick audit** (~2 min) — critical issues, risk table, quick wins. Default.
- **Full audit** (~10 min) — 30 UX laws, Nielsen's 10 heuristics, Norman's 3 emotional design levels, cognitive load analysis, competitive pattern benchmarking. Say `full audit` to trigger.

#### Example prompts

```
give me UX feedback  [attach screenshot]

check accessibility https://example.com

full audit  [attach Figma URL]

audit this  [attach .html file]

both  [after an initial UX or WCAG result]

export PDF  [at any point to get a styled HTML report]
```

---

### `/uxui-inspector-universal` — UX/UI only

Focused UX/UI critique without any WCAG output. Same Quick → Full depth model as above.

```
/uxui-inspector-universal [screenshot / URL / Figma link]
```

Use this when you want pure design feedback and don't need accessibility compliance findings.

---

### `/wcag-inspector-universal` — accessibility only

Strict WCAG 2.2 Level AA audit. Pass/fail per criterion, exact contrast ratios from design tokens or computed CSS, specific code fixes.

```
/wcag-inspector-universal [screenshot / URL / Figma link]
```

Priority criteria always checked: 1.1.1, 1.3.1, 1.3.2, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 2.1.1, 2.4.3, 2.4.7, 2.5.3, 3.3.1, 3.3.2, 4.1.2.

For Figma input, the skill pulls design tokens to compute exact contrast ratios rather than estimating from the rendered image.

---

## Whole-file Figma audits

If you paste a Figma URL without a `node-id` (i.e., the whole file), the skill will:

1. Enumerate all pages and frames
2. Deduplicate similar screens and version variants
3. Confirm scope with you before proceeding
4. Audit every unique screen and produce a single report with a table of contents, executive summary, and a cross-screen systemic-findings section

---

## PDF export

After any completed audit, say **"export PDF"**. The skill generates a self-contained `.html` file you open in a browser and print to PDF (`Cmd+P` on Mac, `Ctrl+P` on Windows).

File format: `ux-ui-validator-audit-[product-name]-[YYYY-MM-DD].html`

---

## What the audits cover

### UX/UI (Quick)
- Visual hierarchy and primary action clarity
- CTA labeling and button hierarchy
- Missing feedback states (loading, error, empty, success)
- Fitts' Law, Hick's Law, Jakob's Law, Miller's Law, Proximity

### UX/UI (Full, adds)
- All 30 UX laws across cognition, motor, predictability, Gestalt, and behavior
- Nielsen's 10 heuristics (scored 1–5)
- Norman's 3 emotional design levels (visceral, behavioral, reflective)
- Cognitive load (intrinsic, extraneous, germane)
- Business goals alignment
- Competitive pattern benchmarking against category leaders

### WCAG 2.2 AA
- Contrast ratios for text, large text, and UI components (exact values)
- Keyboard operability and focus visibility
- Heading hierarchy and semantic structure
- ARIA name/role/value correctness
- Error identification and form labeling
- Reflow at 320px and 200% zoom

---

## Repo structure

```
design-validator/
├── ux-ui-validator/          ← Unified skill (install this one)
│   └── SKILL.md
├── uxui-inspector-universal/ ← Standalone UX/UI
│   └── SKILL.md
└── wcag-inspector-universal/ ← Standalone WCAG
    └── SKILL.md
README.md                     ← This file
```

Each skill is a single `SKILL.md` file — YAML frontmatter (`name`, `description`) followed by the full instruction document Claude executes as a system prompt when the skill is invoked.

---

## Language support

All skills detect the language of your first message and respond in it. Supported: EN · UA · RU · ES · DE · JA · FR. UX law names, WCAG criterion IDs, and Nielsen/Norman model names always stay in English as universal identifiers.
