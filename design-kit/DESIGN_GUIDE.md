# FlowChemia — Brand & UI Design Reference

## Identity
- **Name:** FlowChemia
- **Tagline:** The chemistry of how teams work together.
- **Logo:** six interconnected nodes in a ring, dark teal with cyan/amber touches; wordmark “FlowChemia” below or to the right. Use transparent flat variant for application UI, larger glow concept for marketing only.
- **Typography:** Inter (fallback Roboto). Use medium/semibold for headings and regular weight for body text.

## Official proposed brand palette
| Token | Hex | Purpose |
|---|---|---|
| Deep Teal | `#0F4C5C` | Brand, headings, primary buttons |
| Soft Cyan | `#4FBDBA` | Interactive highlights, charts |
| Warm Amber | `#F6AE2D` | Rewards, featured details |
| Charcoal | `#1F2933` | Main text |
| Off White | `#F8FAFC` | Main application background |
| White | `#FFFFFF` | Cards / panels |
| Light Border | `#E5E7EB` | Outlines / separators |

Chemistry semantic line colors (design defaults, not yet calibrated to algorithm): green `#16A34A` = stronger signal, blue `#0284C7` = positive, gray `#94A3B8` = insufficient/neutral, amber `#F59E0B` = caution, red `#EF4444` = risk. Do not rely on color alone; show labels in legend and hover/focus details. Unknown chemistry MUST be differentiated from neutral measured chemistry.

## Layout rules
- Default **light mode**. White surfaces on off-white background. Teal headings, restrained cyan accents, amber for rewards. Previous dark mockups are exploratory, not the approved Team Builder default.
- Responsive desktop-first design; accessible mobile/tablet layouts.
- Rounded surfaces (~16px cards, ~10px controls), subtle borders and shadows, generous whitespace (8px base spacing, 24px section gaps).
- No gradients or glows on everyday application UI. Use flat brand icon; keep bold decoration on promotional screens only.

## Employee card and profile
- Compact card: employee portrait, full name, role, department, 2–4 relevant skills; professional, easily scanned.
- Manager sees authorized exact skills/overall scores and chemistry details; employee sees personal qualitative strengths and growth areas; coworkers see job-relevant strengths only.
- Do not expose colleague-specific chemistry to employees or show “works best with X” rankings on public cards.
- Scores in screenshots are illustrative, not product-calibrated values.

## Team Builder — TWO approved states
**A. Team Overview (nothing selected):** show all selected employee cards in balanced grid, **no connection lines**, same right-hand Team Analysis panel, selected-team strip, filters and project requirements. Reference `assets/team-builder-overview-reference.png`.

**B. Focus Employee:** clicking an employee changes the center panel to **one larger focused card on the LEFT** and all other team employees stacked on the RIGHT. Draw **only connections from the focused employee** to the other selected team members. Lines encode chemistry semantically by color, with NO permanent numbers. Reveal exact score, confidence, and interpretation in tooltip on mouse hover and on keyboard focus or touch selection. Avoid lines crossing where feasible. Clicking blank background or 'Team Overview' returns to A.

- Maintain consistent left filter sidebar and right team analysis panel across both states.
- Team Analysis should cover team chemistry, confidence/data coverage, required skills coverage, strengths and cautions, with caveats about model uncertainty.
- Distinguish 'low chemistry' from 'unknown/no historical data'; don't show strong claims based on sparse anonymous feedback.

## Accessibility & privacy
- Keyboard focus and click/tap must provide equivalent access to hover-only information.
- Meet readable contrast for ordinary text; do not use amber/cyan as tiny text on white unless contrast tested.
- Scores are only available to authorized managers via secure backend responses, not hidden DOM/JS state for other roles.
- UI privacy rules do not by themselves guarantee legally anonymous surveys.

## Assets & fidelity
- `flowchemia-logo-original.png` = user-selected raster original.
- `flowchemia-logo-flat-transparent.png` and `flowchemia-icon-transparent.png` = **background-removed enlargements from the small raster reference**, not true source vectors. Inspect edges when placing on dark backgrounds.
- `flowchemia-logo-glow-reference.png` = approved glow-style visual reference, generated art; may need further cleanup before shipping.
- Reference UI mockups are *visual inspiration*, not pixel-perfect frontend specifications.

## Codex starting instruction
“Use the FlowChemia JSON/CSS tokens and assets. Implement responsive light-mode React/Next.js UI. Build reusable EmployeeCard and TeamBuilder components with two explicit modes (overview and focus). Maintain role-based information visibility at API layer. No chemistry numbers on lines; use accessible tooltip on hover/focus/tap. No lines in overview; focused employee left, teammates right with focus-only edges.”
