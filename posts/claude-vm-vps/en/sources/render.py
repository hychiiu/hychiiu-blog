#!/usr/bin/env python3
"""Generate English figure assets for the claude-vm-vps article.

Reads sources/strings.yaml, writes svg/, png/, and webp/ under /workspace/blog-en-assets.
Rasterizes with cairosvg at 2x, matching the original Playwright deviceScaleFactor.
Does not touch the blog worktree, the assets branch, or Chinese originals.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml
from PIL import Image, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "sources"
OUT_SVG = ROOT / "svg"
OUT_PNG = ROOT / "png"
OUT_WEBP = ROOT / "webp"

PAPER = "#faf9f5"
INK = "#2b2a27"
STRONG = "#141312"
MUTED = "#5c5a55"
FAINT = "#8a8780"
HAIR = "rgba(24,24,27,.12)"
HAIR2 = "rgba(24,24,27,.07)"
HAIR16 = "rgba(24,24,27,.16)"
HAIR22 = "rgba(24,24,27,.22)"
HAIR24 = "rgba(24,24,27,.24)"
HAIR28 = "rgba(24,24,27,.28)"
ACCENT = "#c56473"
ACCENT6 = "rgba(197,100,115,.06)"
ACCENT7 = "rgba(197,100,115,.07)"
ACCENT8 = "rgba(197,100,115,.08)"
ACCENT10 = "rgba(197,100,115,.1)"
ACCENT12 = "rgba(197,100,115,.12)"
ACCENT14 = "rgba(197,100,115,.14)"
ACCENT55 = "rgba(197,100,115,.55)"
ACCENT5S = "rgba(197,100,115,.5)"
ACCENT6S = "rgba(197,100,115,.6)"
TERM_BG = "#f1efe9"
MARK = "#a84e5d"
SERIF = "Noto Serif, Noto Serif CJK SC, serif"
MONO = "JetBrains Mono, ui-monospace, monospace"

FONT_SERIF = "/usr/share/fonts/truetype/sand-box/google/Noto Serif/NotoSerif-VariableFont_wdth,wght.ttf"
FONT_MONO = "/usr/share/fonts/truetype/sand-box/google/JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf"

CJK_RE = re.compile(r"[\u3400-\u9fff\uF900-\uFAFF\u3000-\u303F]")


def load_strings() -> dict:
    with (SOURCES / "strings.yaml").open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def t(node):
    if isinstance(node, dict) and "en" in node:
        return node["en"]
    return node


def esc(s: str) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def font(path: str, size: float, weight: int = 400) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(path, size)
    axes = f.get_variation_axes()
    names = [a["name"].decode() if isinstance(a["name"], bytes) else a["name"] for a in axes]
    values = []
    for a, name in zip(axes, names):
        if name.lower().startswith("weight") or name == "wght":
            values.append(float(weight))
        else:
            values.append(float(a["default"]))
    f.set_variation_by_axes(values)
    return f


def measure(text: str, size: float, *, mono=False, weight: int = 400) -> float:
    f = font(FONT_MONO if mono else FONT_SERIF, size, weight)
    return float(f.getlength(text))


def text(
    x,
    y,
    s,
    *,
    size=14,
    fill=INK,
    family="serif",
    weight=None,
    anchor="start",
    spacing=None,
    extra="",
):
    ff = MONO if family == "mono" else SERIF
    attrs = [
        f'x="{x}"',
        f'y="{y}"',
        f'font-family="{ff}"',
        f'font-size="{size}"',
        f'fill="{fill}"',
    ]
    if weight:
        attrs.append(f'font-weight="{weight}"')
    if anchor != "start":
        attrs.append(f'text-anchor="{anchor}"')
    if spacing is not None:
        attrs.append(f'letter-spacing="{spacing}"')
    if extra:
        attrs.append(extra)
    return f"<text {' '.join(attrs)}>{esc(s)}</text>"


def wrap_text(s: str, size: float, max_w: float, *, mono=False, weight: int = 400) -> list[str]:
    words = s.split()
    lines, cur = [], ""
    for w in words:
        trial = w if not cur else cur + " " + w
        if measure(trial, size, mono=mono, weight=weight) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def arrow_defs() -> str:
    return f"""
<defs>
  <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M1 1 L8 5 L1 9" fill="none" stroke="{ACCENT}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
  <marker id="arg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M1 1 L8 5 L1 9" fill="none" stroke="{MUTED}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
  <marker id="arg2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M1 1 L8 5 L1 9" fill="none" stroke="#8a8780" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>"""


def win_icon(x, y, s=13, stroke=INK, sw=1.3):
    # four rounded squares, top-left at (x,y)
    g = []
    for i, j in ((0, 0), (s + 2, 0), (0, s + 2), (s + 2, s + 2)):
        g.append(
            f'<rect x="{x+i}" y="{y+j}" width="{s}" height="{s}" rx="1.5" fill="none" stroke="{stroke}" stroke-width="{sw}"/>'
        )
    return "".join(g)


def globe(cx, cy, r=12, dot=True, opacity=1.0):
    bits = [
        f'<g transform="translate({cx},{cy})" opacity="{opacity}">',
        f'<circle r="{r}" fill="{PAPER}" stroke="{INK}" stroke-width="{1.1 if r>=12 else 1}"/>',
        f'<ellipse rx="{r*0.42:.1f}" ry="{r}" fill="none" stroke="{INK}" stroke-width="0.8"/>',
        f'<line x1="{-r}" x2="{r}" stroke="{INK}" stroke-width="0.8"/>',
    ]
    if r >= 18:
        bits.append(f'<path d="M{-r*0.86:.1f} {-r*0.5:.1f} H{r*0.86:.1f} M{-r*0.86:.1f} {r*0.5:.1f} H{r*0.86:.1f}" stroke="{INK}" stroke-width="0.7"/>')
    if dot:
        bits.append(f'<circle cx="{r*0.25:.1f}" cy="{r*0.42:.1f}" r="{max(2.2, r*0.14):.1f}" fill="{ACCENT}"/>')
    bits.append("</g>")
    return "".join(bits)


def svg_doc(w, h, body: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<rect width="{w}" height="{h}" fill="{PAPER}"/>
{body}
</svg>
'''


def header_row(w, kicker, badge, y=30, inset=16):
    return (
        text(inset, y, kicker, size=10.5, fill=FAINT, family="mono", spacing=1.6)
        + text(w - inset, y, badge, size=10.5, fill=FAINT, family="mono", anchor="end")
    )


def check_cjk(label: str, raw: str) -> list[str]:
    hits = []
    for i, line in enumerate(raw.splitlines(), 1):
        # ignore comments
        if CJK_RE.search(line):
            hits.append(f"{label}:{i}: {line.strip()[:160]}")
    return hits


def fig_cover(S) -> tuple[int, int, str]:
    s = S["cover-v2"]
    w, h = 800, 450
    # Title: "A clean path" / "to Claude" with "clean" accented.
    body = f'''
<defs>
  <radialGradient id="grain" cx="78%" cy="50%" r="70%">
    <stop offset="0%" stop-color="{ACCENT}" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="{ACCENT}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="{w}" height="{h}" fill="url(#grain)"/>
{text(56, 76, t(s["kicker"]), size=11, fill=FAINT, family="mono", spacing=1.54)}
'''
    # Title lines at ~38px, weight 700. Baseline around y=128 / 176 (22px after kicker + line-height 1.28)
    # kicker at 62px top in HTML; first title baseline ≈ 62+22+38*0.8 ≈ 114? Let's compute.
    # HTML: left top 62, kicker, h1 margin-top 22, font 38 lh 1.28.
    # kicker is ~11px, so h1 starts at 62+11+22=95, first baseline ~95+30=125, second 95+38*1.28=143.6+30=173.6
    y1, y2 = 128, 176
    body += f'''
<text x="56" y="{y1}" font-family="{SERIF}" font-size="38" font-weight="700" fill="{STRONG}">A <tspan fill="{ACCENT}">clean</tspan> path</text>
{text(56, y2, "to Claude", size=38, fill=STRONG, weight=700)}
'''
    # Subtitle may wrap; available width 380
    sub_lines = wrap_text(t(s["subtitle"]), 15, 380, weight=400)
    sy = 206
    for i, line in enumerate(sub_lines):
        body += text(56, sy + i * 27, line, size=15, fill=MUTED)
    body += f'<rect x="56" y="378" width="28" height="1" fill="{ACCENT}"/>'
    body += text(56, 412, t(s["footer"]), size=11, fill=FAINT, family="mono", spacing=0.88)

    # Right diagram, original group translated by (-14,26)
    body += f'''
<g transform="translate(-14,26)">
  <rect x="470" y="70" width="250" height="250" rx="26" fill="none" stroke="rgba(24,24,27,.14)"/>
  {text(490, 96, "MAC · VMWARE FUSION", size=10, fill=FAINT, family="mono", spacing=1.4)}
  <rect x="498" y="122" width="88" height="62" rx="14" fill="{PAPER}" stroke="rgba(24,24,27,.22)"/>
  {win_icon(512, 136, 13)}
  {text(548, 148, "WIN 11", size=10, fill=INK, family="mono")}
  {text(548, 163, ".125", size=9, fill=FAINT, family="mono")}
  <rect x="604" y="212" width="94" height="62" rx="14" fill="{PAPER}" stroke="{ACCENT}" stroke-width="1.2"/>
  <circle cx="626" cy="243" r="10" fill="none" stroke="{ACCENT}" stroke-width="1.3"/>
  <circle cx="626" cy="243" r="3" fill="{ACCENT}"/>
  {text(644, 239, "GATEWAY", size=10, fill=INK, family="mono")}
  {text(644, 254, "sing-box", size=9, fill=FAINT, family="mono")}
  <path d="M542 184 C542 222 572 243 604 243" fill="none" stroke="{INK}" stroke-width="1.1" stroke-dasharray="1 4" stroke-linecap="round"/>
  {text(498, 296, "AI Agent Internet", size=9, fill=FAINT, family="mono")}
  {text(498, 309, "10.10.10.0/24", size=9, fill=FAINT, family="mono")}
  <path d="M698 243 C760 243 760 160 742 120" fill="none" stroke="{ACCENT}" stroke-width="1.3"/>
  <path d="M742 120 C730 92 712 78 690 60" fill="none" stroke="{ACCENT}" stroke-width="1.3" stroke-dasharray="3 5"/>
  {globe(668, 40, 22, dot=True)}
  {text(600, 44, "US WEST", size=9.5, fill=FAINT, family="mono", anchor="end")}
  {text(600, 57, "UTC−08:00", size=9, fill=FAINT, family="mono", anchor="end")}
  <line x1="651" y1="274" x2="651" y2="336" stroke="rgba(24,24,27,.18)" stroke-dasharray="2 4"/>
  <g transform="translate(630,346)">
    <rect x="0" y="0" width="42" height="22" rx="11" fill="none" stroke="rgba(24,24,27,.24)"/>
    <circle cx="31" cy="11" r="7" fill="{ACCENT}"/>
  </g>
  {text(682, 361, "kill switch", size=10, fill=MUTED, family="mono", spacing="0.6")}
</g>
'''
    return w, h, svg_doc(w, h, body)


def fig_topology(S) -> tuple[int, int, str]:
    s = S["topology-v2"]
    w, h = 720, 652
    body = arrow_defs() + header_row(w, t(s["kicker"]), t(s["badge"]))
    body += f'''
<rect x="16" y="48" width="392" height="588" rx="22" fill="none" stroke="rgba(24,24,27,.16)"/>
{text(36, 76, t(s["mac_title"]), size=14, fill=STRONG, weight=600)}
{text(72, 76, t(s["mac_sub"]), size=10, fill=FAINT, family="mono")}
<rect x="30" y="92" width="364" height="362" rx="16" fill="none" stroke="rgba(24,24,27,.16)" stroke-dasharray="4 4"/>
{text(48, 116, t(s["fusion"]), size=10, fill=FAINT, family="mono", spacing=1.4)}

<rect x="46" y="130" width="332" height="72" rx="14" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>
{win_icon(64, 152, 12)}
{text(102, 161, t(s["win_title"]), size=15, fill=STRONG, weight=600)}
{text(102, 183, t(s["win_meta"]), size=10.5, fill=MUTED, family="mono")}
{text(362, 161, "10.10.10.125", size=11, fill=INK, family="mono", anchor="end")}
{text(362, 183, "DHCP", size=10, fill=FAINT, family="mono", anchor="end")}

<line x1="212" y1="202" x2="212" y2="244" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#ar)"/>
<rect x="224" y="212" width="154" height="22" rx="11" fill="{ACCENT8}"/>
{text(301, 227, t(s["isolated_name"]), size=10.5, fill=ACCENT, family="mono", anchor="middle")}
{text(202, 227, t(s["isolated"]), size=10, fill=FAINT, family="mono", anchor="end")}

<rect x="46" y="248" width="332" height="150" rx="14" fill="{PAPER}" stroke="{ACCENT}" stroke-width="1.2"/>
{text(64, 276, t(s["gw_title"]), size=15, fill=STRONG, weight=600)}
{text(362, 276, t(s["gw_os"]), size=10.5, fill=FAINT, family="mono", anchor="end")}
<line x1="64" y1="290" x2="362" y2="290" stroke="rgba(24,24,27,.08)"/>
{text(64, 314, "enp10s0", size=11, fill=INK, family="mono")}
{text(136, 314, "10.10.10.1/24", size=11, fill=INK, family="mono")}
{text(362, 314, t(s["if_lan"]), size=11, fill=FAINT, family="mono", anchor="end")}
{text(64, 342, "tun0", size=11, fill=ACCENT, family="mono")}
{text(136, 342, "172.19.0.1/30", size=11, fill=ACCENT, family="mono")}
{text(362, 342, t(s["if_tun"]), size=11, fill=FAINT, family="mono", anchor="end")}
{text(64, 370, "enp2s0", size=11, fill=INK, family="mono")}
{text(136, 370, "172.16.236.x", size=11, fill=INK, family="mono")}
{text(362, 370, t(s["if_wan"]), size=11, fill=FAINT, family="mono", anchor="end")}

<line x1="212" y1="398" x2="212" y2="488" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#ar)"/>
{text(224, 424, t(s["vmware_nat"]), size=10, fill=FAINT, family="mono")}
{text(224, 474, t(s["encrypted"]), size=10, fill=FAINT, family="mono")}

<rect x="46" y="492" width="332" height="124" rx="14" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>
{text(64, 520, t(s["egern_title"]), size=15, fill=STRONG, weight=600)}
{text(64, 544, t(s["egern_note"]), size=10.5, fill=MUTED, family="mono")}
<rect x="64" y="562" width="226" height="24" rx="12" fill="none" stroke="{ACCENT}"/>
{text(177, 578, t(s["direct"]), size=10.5, fill=ACCENT, family="mono", anchor="middle")}

<path d="M378 554 H 566 V 430" fill="none" stroke="{ACCENT}" stroke-width="1.6" marker-end="url(#ar)"/>
{text(472, 546, t(s["public"]), size=10.5, fill=ACCENT, family="mono", anchor="middle")}

<rect x="432" y="262" width="272" height="164" rx="14" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>
{globe(462, 294, 12)}
{text(484, 299, t(s["vps_title"]), size=15, fill=STRONG, weight=600)}
<line x1="452" y1="316" x2="684" y2="316" stroke="rgba(24,24,27,.08)"/>
{text(452, 340, t(s["vps_cloud"]), size=10.5, fill=INK, family="mono")}
{text(452, 362, t(s["vps_sb"]), size=10.5, fill=ACCENT, family="mono")}
{text(452, 384, t(s["vps_cpa"]), size=10.5, fill=ACCENT, family="mono")}
{text(452, 406, t(s["vps_tz"]), size=10.5, fill=FAINT, family="mono")}

<line x1="566" y1="262" x2="566" y2="200" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#ar)"/>
{text(578, 236, t(s["https"]), size=10, fill=FAINT, family="mono")}
<rect x="432" y="112" width="272" height="84" rx="14" fill="{ACCENT6}" stroke="{ACCENT5S}"/>
{text(452, 146, t(s["claude_title"]), size=17, fill=STRONG, weight=600)}
{text(452, 172, t(s["claude_note"]), size=10.5, fill=MUTED, family="mono")}

<rect x="596" y="452" width="108" height="46" rx="12" fill="{PAPER}" stroke="{ACCENT6S}" stroke-dasharray="3 3"/>
{text(650, 472, t(s["other"]), size=10.5, fill=INK, family="mono", anchor="middle")}
{text(650, 488, t(s["other_meta"]), size=9.5, fill=FAINT, family="mono", anchor="middle")}
<line x1="650" y1="452" x2="650" y2="432" stroke="{ACCENT}" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#ar)"/>

{text(468, 584, t(s["legend_win"]), size=10, fill=MUTED, family="mono")}
<line x1="432" y1="580" x2="458" y2="580" stroke="{ACCENT}" stroke-width="1.6"/>
{text(468, 604, t(s["legend_cpa"]), size=10, fill=MUTED, family="mono")}
<line x1="432" y1="600" x2="458" y2="600" stroke="{ACCENT}" stroke-width="1.3" stroke-dasharray="3 3"/>
{text(468, 624, t(s["legend_virt"]), size=10, fill=MUTED, family="mono")}
<line x1="432" y1="620" x2="458" y2="620" stroke="rgba(24,24,27,.4)" stroke-dasharray="4 4"/>
'''
    # Check overflow on a few tight labels and widen/reposition if needed
    # isolated label ends at x=202; "Isolated net · no NAT/DHCP" may be long.
    iso = t(s["isolated"])
    iso_w = measure(iso, 10, mono=True)
    # if too long, the function already placed it; we'll visually QA.
    _ = iso_w
    note_w = measure(t(s["egern_note"]), 10.5, mono=True)
    # if note is wider than card inner 300px, we should wrap — handled in post if needed
    _ = note_w
    return w, h, svg_doc(w, h, body)


def fig_killswitch(S) -> tuple[int, int, str]:
    s = S["killswitch-v2"]
    w, h = 720, 520
    body = arrow_defs() + header_row(w, t(s["kicker"]), t(s["badge"]))

    def panel(y, title, filled_dot, body_text, expect_lines, lower=False):
        parts = [
            f'<rect x="16" y="{y}" width="688" height="220" rx="20" fill="none" stroke="rgba(24,24,27,.14)"/>'
        ]
        cy = y + 30
        if filled_dot:
            parts.append(f'<circle cx="42" cy="{cy}" r="5" fill="{ACCENT}"/>')
        else:
            parts.append(f'<circle cx="42" cy="{cy}" r="5" fill="none" stroke="{FAINT}" stroke-width="1.3"/>')
        parts.append(text(56, cy + 5, title, size=15, fill=STRONG, weight=600))
        mid = y + 118
        # Windows node
        parts.append(f'<rect x="42" y="{mid-30}" width="112" height="60" rx="14" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>')
        parts.append(win_icon(54, mid - 12, 10, sw=1.2))
        parts.append(text(90, mid - 1, "Windows", size=10.5, fill=INK, family="mono"))
        parts.append(text(90, mid + 14, ".125", size=9.5, fill=FAINT, family="mono"))
        if not filled_dot:
            parts.append(text(98, mid + 50, t(s["no_second"]), size=9.5, fill=FAINT, family="mono", anchor="middle"))
        # Gateway
        if filled_dot:
            parts.append(f'<rect x="176" y="{mid-30}" width="104" height="60" rx="14" fill="{PAPER}" stroke="{ACCENT}" stroke-width="1.2"/>')
            parts.append(text(228, mid - 4, "Gateway", size=10.5, fill=INK, family="mono", anchor="middle"))
            parts.append(text(228, mid + 12, "sing-box ●", size=9.5, fill=ACCENT, family="mono", anchor="middle"))
            parts.append(globe(362, mid, 20, dot=False))
            parts.append(f'<circle cx="368" cy="{mid+6}" r="2.6" fill="{ACCENT}"/>')
            parts.append(f'<line x1="154" y1="{mid}" x2="172" y2="{mid}" stroke="{ACCENT}" stroke-width="1.5" marker-end="url(#ar)"/>')
            parts.append(f'<line x1="280" y1="{mid}" x2="336" y2="{mid}" stroke="{ACCENT}" stroke-width="1.5" marker-end="url(#ar)"/>')
            parts.append(text(308, mid - 12, t(s["tunnel"]), size=9.5, fill=ACCENT, family="mono", anchor="middle"))
            parts.append(text(362, mid + 42, t(s["us_egress"]), size=9.5, fill=FAINT, family="mono", anchor="middle"))
        else:
            parts.append(f'<rect x="176" y="{mid-30}" width="104" height="60" rx="14" fill="none" stroke="rgba(24,24,27,.28)" stroke-dasharray="4 4"/>')
            parts.append(text(228, mid - 4, "Gateway", size=10.5, fill=FAINT, family="mono", anchor="middle"))
            parts.append(text(228, mid + 12, "off", size=9.5, fill=FAINT, family="mono", anchor="middle"))
            parts.append(globe(362, mid, 20, dot=False, opacity=0.45))
            parts.append(f'<line x1="154" y1="{mid}" x2="172" y2="{mid}" stroke="rgba(24,24,27,.35)" stroke-width="1.3" stroke-dasharray="3 3"/>')
            parts.append(f'<line x1="280" y1="{mid}" x2="336" y2="{mid}" stroke="rgba(24,24,27,.25)" stroke-width="1.3" stroke-dasharray="3 3"/>')
            parts.append(f'<g transform="translate(164,{mid})" stroke="{ACCENT}" stroke-width="1.8" stroke-linecap="round"><line x1="-6" y1="-6" x2="6" y2="6"/><line x1="6" y1="-6" x2="-6" y2="6"/></g>')
        parts.append(f'<line x1="424" y1="{y+24}" x2="424" y2="{y+196}" stroke="rgba(24,24,27,.08)"/>')
        lines = wrap_text(body_text, 13.5, 248, weight=400)
        ty = mid - 30
        for i, line in enumerate(lines):
            parts.append(text(448, ty + i * 22, line, size=13.5, fill=MUTED))
        ey = ty + len(lines) * 22 + 20
        for i, line in enumerate(expect_lines):
            parts.append(text(448, ey + i * 16, line, size=10, fill=FAINT, family="mono"))
        return "".join(parts)

    body += panel(48, t(s["up_title"]), True, t(s["up_body"]), ["Expected: curl api.ipify.org", "→ <VPS_IP>"])
    body += panel(284, t(s["down_title"]), False, t(s["down_body"]), ["Expected: ping 8.8.8.8 fails"])
    return w, h, svg_doc(w, h, body)


def fig_cpa(S) -> tuple[int, int, str]:
    s = S["cpa-flow"]
    w, h = 720, 470
    body = arrow_defs() + header_row(w, t(s["kicker"]), t(s["badge"]))
    body += f'''
<rect x="16" y="62" width="196" height="104" rx="16" fill="{PAPER}" stroke="{ACCENT}" stroke-width="1.2"/>
{win_icon(34, 82, 11)}
{text(68, 99, "Windows 11", size=15, fill=STRONG, weight=600)}
{text(34, 130, t(s["win_browser"]), size=10.5, fill=MUTED, family="mono")}
{text(34, 150, t(s["win_path"]), size=10, fill=FAINT, family="mono")}

<rect x="16" y="226" width="196" height="132" rx="16" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>
{text(34, 256, t(s["other_title"]), size=15, fill=STRONG, weight=600)}
<line x1="34" y1="270" x2="194" y2="270" stroke="rgba(24,24,27,.08)"/>
{text(34, 292, "Mac · Claude Code", size=10.5, fill=INK, family="mono")}
{text(34, 314, t(s["other_clients"]), size=10.5, fill=INK, family="mono")}
{text(34, 340, t(s["only_key"]), size=10, fill=FAINT, family="mono")}

<rect x="282" y="100" width="216" height="228" rx="18" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>
{globe(308, 130, 12)}
{text(330, 135, t(s["vps_title"]), size=15, fill=STRONG, weight=600)}
<line x1="300" y1="152" x2="480" y2="152" stroke="rgba(24,24,27,.08)"/>
{text(300, 176, "Caddy · HTTPS", size=10, fill=FAINT, family="mono")}
{text(300, 194, t(s["domain"]), size=10.5, fill=INK, family="mono")}
{text(300, 222, "CLIProxyAPI · Docker", size=10, fill=FAINT, family="mono")}
{text(300, 240, t(s["keys"]), size=10.5, fill=INK, family="mono")}
<rect x="300" y="250" width="180" height="62" rx="12" fill="{ACCENT7}" stroke="{ACCENT55}"/>
{text(390, 270, t(s["auth"]), size=10.5, fill=ACCENT, family="mono", anchor="middle")}
{text(390, 286, "Stay on the VPS,", size=9.5, fill=FAINT, family="mono", anchor="middle")}
{text(390, 300, "refresh automatically", size=9.5, fill=FAINT, family="mono", anchor="middle")}

<path d="M212 114 C250 114 250 150 278 150" fill="none" stroke="{ACCENT}" stroke-width="1.5" marker-end="url(#ar)"/>
<rect x="204" y="72" width="80" height="22" rx="11" fill="{ACCENT10}"/>
<circle cx="218" cy="83" r="6" fill="none" stroke="{ACCENT}" stroke-width="1.1"/>
{text(218, 86.5, "1", size=8, fill=ACCENT, family="mono", anchor="middle")}
{text(252, 87, "Once", size=10, fill=ACCENT, family="mono", anchor="middle")}
<path d="M212 292 C250 292 250 270 278 270" fill="none" stroke="{MUTED}" stroke-width="1.4" stroke-dasharray="4 4" marker-end="url(#arg)"/>
<rect x="204" y="318" width="80" height="22" rx="11" fill="none" stroke="rgba(24,24,27,.2)"/>
<circle cx="218" cy="329" r="6" fill="none" stroke="{MUTED}" stroke-width="1.1"/>
{text(218, 332.5, "2", size=8, fill=MUTED, family="mono", anchor="middle")}
{text(252, 333, "Daily", size=10, fill=MUTED, family="mono", anchor="middle")}

<line x1="498" y1="211" x2="560" y2="211" stroke="{ACCENT}" stroke-width="1.5" marker-end="url(#ar)"/>
<rect x="564" y="160" width="140" height="102" rx="16" fill="{ACCENT6}" stroke="{ACCENT5S}"/>
{text(584, 194, "Claude", size=17, fill=STRONG, weight=600)}
{text(584, 220, t(s["sees"]), size=10, fill=MUTED, family="mono")}
{text(584, 238, t(s["equals"]), size=10.5, fill=ACCENT, family="mono")}

<line x1="16" y1="384" x2="704" y2="384" stroke="rgba(24,24,27,.08)"/>
'''
    # Notes with drawn numerals (avoid circled-unicode tofu)
    y = 412
    for num, raw, color in (("1", t(s["note1"]), ACCENT), ("2", t(s["note2"]), MUTED)):
        body += f'<circle cx="24" cy="{y-4}" r="7" fill="none" stroke="{color}" stroke-width="1.1"/>'
        body += text(24, y-0.5, num, size=9, fill=color, family="mono", anchor="middle")
        lines = wrap_text(raw, 13, 660)
        for i, line in enumerate(lines):
            body += text(38, y + i * 20, line, size=13, fill=MUTED)
        y += max(1, len(lines)) * 20 + 4
    needed = y + 14
    if needed > h:
        h = int(needed)
    return w, h, svg_doc(w, h, body)


def fig_egern(S) -> tuple[int, int, str]:
    s = S["egern-bypass-v2"]
    w, h = 720, 500
    body = arrow_defs() + header_row(w, t(s["kicker"]), t(s["badge"]))

    def boxes(y, items, accent_last=False, color_stroke=None):
        """items: list of (title, sub, style) style in {plain, muted, fail, ok, mid}"""
        parts = []
        n = len(items)
        # Use consistent 118 boxes; for 4-item after row, widen the physical NIC box
        xs = [16, 158, 300, 442, 586]
        width = 118
        for i, (title, sub, style) in enumerate(items):
            x = xs[i] if i < 5 else 16 + i * 142
            bw = width
            if n == 4 and i == 2:
                # after row: third box can be a bit wider; still use 118 if text fits, else 130
                pass
            if style == "fail":
                rect = f'<rect x="{x}" y="{y}" width="{bw}" height="52" rx="12" fill="none" stroke="{ACCENT}" stroke-dasharray="4 3"/>'
                tc, sc = INK, ACCENT
            elif style == "ok":
                rect = f'<rect x="{x}" y="{y}" width="{bw}" height="52" rx="12" fill="{ACCENT6}" stroke="{ACCENT}"/>'
                tc, sc = INK, ACCENT
            elif style == "mid":
                rect = f'<rect x="{x}" y="{y}" width="{bw}" height="52" rx="12" fill="rgba(24,24,27,.03)" stroke="rgba(24,24,27,.3)"/>'
                tc, sc = INK, FAINT
            elif style == "accent":
                rect = f'<rect x="{x}" y="{y}" width="{bw}" height="52" rx="12" fill="{PAPER}" stroke="{ACCENT}"/>'
                tc, sc = INK, FAINT
            else:
                rect = f'<rect x="{x}" y="{y}" width="{bw}" height="52" rx="12" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>'
                tc, sc = INK, FAINT
            if style == "ok-sub":
                sc = ACCENT
            parts.append(rect)
            # shrink font if title is wide
            ts = 10.5 if measure(title, 10.5, mono=True) <= bw - 10 else 9.5
            parts.append(text(x + bw / 2, y + 22, title, size=ts, fill=tc, family="mono", anchor="middle"))
            parts.append(text(x + bw / 2, y + 39, sub, size=9.5, fill=sc, family="mono", anchor="middle"))
        return "".join(parts), xs[:n], width

    # Before
    body += text(16, 72, t(s["before"]), size=15, fill=STRONG, weight=600)
    body += text(70, 72, t(s["before_sub"]), size=10.5, fill=FAINT, family="mono")
    before_items = [
        ("Gateway", "sing-box", "plain"),
        ("VMware NAT", "172.16.236.2", "plain"),
        ("Egern utun", "TUN · fake-ip", "mid"),
        (t(s["other_node"]), t(s["other_path"]), "plain"),
        ("VPS", t(s["hs_fail"]), "fail"),
    ]
    bsvg, bxs, bw = boxes(88, before_items)
    body += bsvg
    for i in range(4):
        x1 = bxs[i] + bw
        x2 = bxs[i + 1]
        body += f'<line x1="{x1}" y1="114" x2="{x2}" y2="114" stroke="#8a8780" stroke-width="1.3" marker-end="url(#arg2)"/>'
    body += f'''
<rect x="16" y="156" width="688" height="62" rx="12" fill="rgba(24,24,27,.025)"/>
<text x="34" y="182" font-family="{MONO}" font-size="10.5" fill="{MUTED}"><tspan fill="{FAINT}">{esc(t(s["log_gw"]))}  </tspan>outbound/vless[my-node]: EOF / context deadline exceeded</text>
<text x="34" y="204" font-family="{MONO}" font-size="10.5" fill="{MUTED}"><tspan fill="{FAINT}">{esc(t(s["log_vps"]))}  </tspan>TLS handshake: REALITY: processed invalid connection</text>
<line x1="16" y1="244" x2="704" y2="244" stroke="rgba(24,24,27,.08)"/>
'''
    # After — 4 boxes, long arrow from box3 to VPS
    body += text(16, 282, t(s["after"]), size=15, fill=STRONG, weight=600)
    body += text(70, 282, t(s["after_sub"]), size=10.5, fill=FAINT, family="mono")
    after_items = [
        ("Gateway", "sing-box", "accent"),
        ("VMware NAT", "172.16.236.2", "plain"),
        (t(s["phys_nic"]), "DIRECT", "ok-sub"),
        # placeholder skipped
    ]
    # custom after layout: 3 boxes + VPS at 586
    def after_box(x, title, sub, style):
        if style == "accent":
            rect = f'<rect x="{x}" y="298" width="118" height="52" rx="12" fill="{PAPER}" stroke="{ACCENT}"/>'
            sc = FAINT
        elif style == "ok":
            rect = f'<rect x="{x}" y="298" width="118" height="52" rx="12" fill="{ACCENT6}" stroke="{ACCENT}"/>'
            sc = ACCENT
        elif style == "direct":
            rect = f'<rect x="{x}" y="298" width="130" height="52" rx="12" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>'
            sc = ACCENT
        else:
            rect = f'<rect x="{x}" y="298" width="118" height="52" rx="12" fill="{PAPER}" stroke="rgba(24,24,27,.24)"/>'
            sc = FAINT
        bw2 = 130 if style == "direct" else 118
        ts = 10.5 if measure(title, 10.5, mono=True) <= bw2 - 10 else 9.2
        return (
            rect
            + text(x + bw2 / 2, 320, title, size=ts, fill=INK, family="mono", anchor="middle")
            + text(x + bw2 / 2, 337, sub, size=9.5, fill=sc, family="mono", anchor="middle")
        )

    body += after_box(16, "Gateway", "sing-box", "accent")
    body += after_box(158, "VMware NAT", "172.16.236.2", "plain")
    body += after_box(300, t(s["phys_nic"]), "DIRECT", "direct")
    body += after_box(586, "VPS", t(s["hs_ok"]), "ok")
    body += f'''
<line x1="134" y1="324" x2="154" y2="324" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#ar)"/>
<line x1="276" y1="324" x2="296" y2="324" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#ar)"/>
<line x1="430" y1="324" x2="582" y2="324" stroke="{ACCENT}" stroke-width="1.4" marker-end="url(#ar)"/>
{text(506, 314, t(s["bypass_utun"]), size=9.5, fill=FAINT, family="mono", anchor="middle")}
<rect x="16" y="366" width="688" height="110" rx="12" fill="{ACCENT8.replace('.08','.05') if False else 'rgba(197,100,115,.05)'}"/>
<text x="34" y="394" font-family="{MONO}" font-size="11" fill="{INK}"><tspan fill="{ACCENT}">bypass_tunnel_proxy</tspan>  +  <tspan fill="{ACCENT}">vif_excluded_routes</tspan>  ←  &lt;VPS_IP&gt;/32</text>
'''
    foot_lines = wrap_text(t(s["footer"]), 10, 660, mono=True)
    fy = 420
    for i, line in enumerate(foot_lines):
        body += text(34, fy + i * 16, line, size=10, fill=FAINT, family="mono")
    return w, h, svg_doc(w, h, body)


def fig_vmware(S) -> tuple[int, int, str]:
    s = S["vmware-network"]
    w, h = 720, 462
    body = header_row(w, t(s["kicker"]), t(s["badge"]), y=28)
    # Custom network card — 2x2 so English labels do not collide with toggles
    body += f'''
<rect x="16" y="48" width="688" height="132" rx="18" fill="none" stroke="{HAIR}"/>
{text(38, 74, t(s["custom_title"]), size=15, fill=STRONG, weight=600)}
{text(684, 74, t(s["custom_path"]), size=10.5, fill=FAINT, family="mono", anchor="end")}
<line x1="38" y1="88" x2="684" y2="88" stroke="{HAIR2}"/>
'''
    cells = [
        (t(s["use_nat"]), "tog", None),
        (t(s["connect_mac"]), "tog", None),
        (t(s["dhcp"]), "tog", None),
        (t(s["subnet"]), "note", t(s["subnet_note"])),
    ]
    row_y = [102, 138]
    # Left column is narrower so its toggle is not mistaken for the right-hand label.
    col_x = [38, 300]
    col_w = [230, 382]  # right edge 300+382=682, inside the 704-22 padded card
    for i, (lab, kind, note) in enumerate(cells):
        col, row = i % 2, i // 2
        x = col_x[col]
        y = row_y[row]
        body += text(x, y + 11, lab, size=13, fill=INK)
        if kind == "tog":
            tx = x + col_w[col] - 30
            body += (
                f'<rect x="{tx}" y="{y}" width="30" height="17" rx="9" fill="none" stroke="rgba(24,24,27,.22)"/>'
                f'<circle cx="{tx+12}" cy="{y+8.5}" r="4.5" fill="#a8a69f"/>'
            )
        else:
            body += text(x + col_w[col], y + 11, note, size=10.5, fill=FAINT, family="mono", anchor="end")

    # Two VM cards
    def nic_block(x, y, wcard, line1_l, line1_r, line2_l, line2_r, pill_accent=False, faint=False, pill=True):
        fill_c = FAINT if faint else INK
        parts = [f'<line x1="{x}" y1="{y}" x2="{x+wcard}" y2="{y}" stroke="{HAIR2}"/>']
        parts.append(text(x, y + 18, line1_l, size=11, fill=fill_c if faint else INK, family="mono"))
        if pill and line1_r:
            tw = measure(line1_r, 10.5, mono=False)
            pw = tw + 20
            px = x + wcard - pw
            if pill_accent:
                parts.append(f'<rect x="{px}" y="{y+5}" width="{pw}" height="20" rx="10" fill="{ACCENT6}" stroke="{ACCENT6S}"/>')
                parts.append(text(px + pw / 2, y + 19, line1_r, size=10.5, fill=ACCENT, anchor="middle"))
            else:
                parts.append(f'<rect x="{px}" y="{y+5}" width="{pw}" height="20" rx="10" fill="none" stroke="{HAIR}"/>')
                parts.append(text(px + pw / 2, y + 19, line1_r, size=10.5, fill=MUTED, anchor="middle"))
        elif line1_r:
            parts.append(text(x + wcard, y + 18, line1_r, size=11, fill=fill_c, family="mono", anchor="end"))
        parts.append(text(x, y + 36, line2_l, size=10.5, fill=MUTED, family="mono"))
        parts.append(text(x + wcard, y + 36, line2_r, size=10.5, fill=INK if not faint else MUTED, family="mono", anchor="end"))
        return "".join(parts)

    # Gateway card
    body += f'''
<rect x="16" y="196" width="334" height="168" rx="18" fill="none" stroke="{ACCENT55}"/>
{text(36, 222, t(s["gw_title"]), size=15, fill=STRONG, weight=600)}
{text(334, 222, t(s["gw_nics"]), size=10.5, fill=FAINT, family="mono", anchor="end")}
'''
    body += nic_block(36, 238, 294, "NIC 1", "Share with my Mac", "enp2s0", "172.16.236.x · DHCP", pill_accent=False)
    body += nic_block(36, 290, 294, "NIC 2", "AI Agent Internet", "enp10s0", f"10.10.10.1 · {t(s['static'])}", pill_accent=True)

    # Windows card
    body += f'''
<rect x="366" y="196" width="338" height="168" rx="18" fill="none" stroke="{HAIR}"/>
{text(386, 222, t(s["win_title"]), size=15, fill=STRONG, weight=600)}
{text(688, 222, t(s["win_nics"]), size=10.5, fill=FAINT, family="mono", anchor="end")}
'''
    body += nic_block(386, 238, 298, "NIC 1", "AI Agent Internet", "Ethernet", "10.10.10.1xx · DHCP", pill_accent=True)
    body += nic_block(386, 290, 298, "—", t(s["no_second"]), t(s["nat_bridged"]), t(s["neither"]), pill=False, faint=True)

    # Footer, wrap if needed
    foot = wrap_text(t(s["footer"]), 12.5, 688)
    fy = 392
    for i, line in enumerate(foot):
        body += text(16, fy + i * 20, line, size=12.5, fill=MUTED)
    # adjust height if more than 2 footer lines
    needed = fy + len(foot) * 20 + 16
    if needed > h:
        h = needed
        # rebuild not needed if we already used h in header_row width only; svg_doc uses h
    return w, h, svg_doc(w, h, body)


def fig_timezone(S) -> tuple[int, int, str]:
    s = S["timezone-v2"]
    w, h = 720, 400
    body = header_row(w, t(s["kicker"]), t(s["badge"]), y=28)
    cols = [
        {
            "accent": True,
            "lab": t(s["col1_lab"]),
            "big": "US West",
            "sub": "United States",
            "kvs": [("VPS", "Oracle Cloud"), (t(s["sys_tz"]), "America/Los_Angeles"), ("locale", "en_US.UTF-8")],
        },
        {
            "accent": False,
            "lab": t(s["col2_lab"]),
            "big": "(UTC−08:00)",
            "sub": "Pacific Time",
            "kvs": [("ID", "Pacific Standard Time"), (t(s["check"]), "tzutil /g"), (t(s["auto_tz"]), t(s["auto_rec"]))],
        },
        {
            "accent": False,
            "lab": t(s["col3_lab"]),
            "big": "English (US)",
            "sub": t(s["ime_big"]),
            "kvs": [(t(s["display_lang"]), "English (United States)"), (t(s["input_method"]), t(s["ime_value"])), (t(s["check"]), "Get-WinUserLanguageList")],
        },
    ]
    gap = 12
    cw = (688 - 2 * gap) / 3
    top = 50
    ch = 276
    for i, c in enumerate(cols):
        x = 16 + i * (cw + gap)
        stroke = ACCENT55 if c["accent"] else HAIR
        fill = ACCENT6.replace("06", "04") if c["accent"] else "none"
        # use exact accent fill from original
        fill = "rgba(197,100,115,.04)" if c["accent"] else PAPER
        body += f'<rect x="{x}" y="{top}" width="{cw}" height="{ch}" rx="18" fill="{fill}" stroke="{stroke}"/>'
        body += text(x + 16, top + 28, c["lab"], size=10.5, fill=FAINT, family="mono", spacing=1.26)
        body += text(x + 16, top + 58, c["big"], size=20, fill=STRONG, weight=600)
        body += text(x + 16, top + 82, c["sub"], size=15, fill=MUTED)
        ky = top + 104
        body += f'<line x1="{x+16}" y1="{ky}" x2="{x+cw-16}" y2="{ky}" stroke="{HAIR2}"/>'
        ky += 8
        for j, (k, v) in enumerate(c["kvs"]):
            body += text(x + 16, ky + 14, k, size=10.5, fill=FAINT, family="mono")
            body += text(x + 16, ky + 30, v, size=10.5, fill=INK, family="mono")
            ky += 48
            if j < len(c["kvs"]) - 1:
                body += f'<line x1="{x+16}" y1="{ky-10}" x2="{x+cw-16}" y2="{ky-10}" stroke="{HAIR2}"/>'
    foot = wrap_text(t(s["footer"]), 13, 688)
    fy = top + ch + 28
    for i, line in enumerate(foot):
        body += text(16, fy + i * 22, line, size=13, fill=MUTED)
    needed = fy + len(foot) * 22 + 18
    if needed > h:
        h = int(needed)
    return w, h, svg_doc(w, h, body)


def checkmark(cx, cy, r=8):
    return f'''
<g>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{ACCENT}" stroke-width="1.3"/>
  <path d="M{cx-3.2} {cy-0.2} l2.3 2.6 l4.6-5.2" fill="none" stroke="{ACCENT}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</g>'''


def fig_checklist(S) -> tuple[int, int, str]:
    s = S["checklist-v2"]
    w, h = 720, 548
    body = header_row(w, t(s["kicker"]), t(s["badge"]), y=28)
    body += text(16, 70, t(s["title"]), size=26, fill=STRONG, weight=700)
    sub_lines = wrap_text(t(s["sub"]), 13.5, 688)
    sy = 96
    for i, line in enumerate(sub_lines):
        body += text(16, sy + i * 22, line, size=13.5, fill=MUTED)
    y = sy + len(sub_lines) * 22 + 16
    body += f'<line x1="16" y1="{y}" x2="704" y2="{y}" stroke="{HAIR}"/>'
    # columns: n 26, ck 26, title ~170, how flex, pass ~160
    items = s["items"]
    row_h = 44
    for it in items:
        mid = y + row_h / 2 + 4
        body += text(16, mid, it["n"], size=10.5, fill=FAINT, family="mono")
        body += checkmark(54, mid - 4)
        title = t(it["title"])
        how = t(it["how"])
        pas = t(it["pass"])
        body += text(74, mid, title, size=14.5, fill=STRONG, weight=600)
        # how starts after title column
        how_x = 74 + 168
        body += text(how_x, mid, how, size=10.8, fill=MUTED, family="mono")
        body += text(704, mid, pas, size=10, fill=FAINT, family="mono", anchor="end")
        y += row_h
        body += f'<line x1="16" y1="{y}" x2="704" y2="{y}" stroke="{HAIR2}"/>'
    needed = y + 20
    if needed > h:
        h = int(needed)
    return w, h, svg_doc(w, h, body)


def term_span_svg(x, y, size, spans):
    """spans: list of (text, kind) kind in p, cmd, hl, mk, plain."""
    parts = []
    cx = x
    f = font(FONT_MONO, size, 400)
    highlights = []
    tspans = []
    for raw, kind in spans:
        w = float(f.getlength(raw))
        if kind == "mk":
            highlights.append(
                f'<rect x="{cx-2}" y="{y-size+1}" width="{w+4}" height="{size+5}" rx="3" fill="{ACCENT12}"/>'
            )
            fill = MARK
        elif kind == "hl":
            fill = ACCENT
        elif kind == "p":
            fill = FAINT
        elif kind == "cmd":
            fill = STRONG
        else:
            fill = MUTED
        tspans.append(f'<tspan fill="{fill}">{esc(raw)}</tspan>')
        cx += w
    text_el = (
        f'<text x="{x}" y="{y}" font-family="{MONO}" font-size="{size}" '
        f'xml:space="preserve">{"".join(tspans)}</text>'
    )
    return "".join(highlights) + text_el, cx


def term_block(x, y, width, head_l, head_r, lines, size=11.2, lh=1.75):
    """lines: list of list of spans. Returns (svg, height)."""
    pad_x, pad_top, pad_bot = 20, 16, 18
    # header ~10px + 10 margin
    inner_top = y + pad_top + 10 + 10
    line_px = size * lh
    blk_h = pad_top + 20 + len(lines) * line_px + pad_bot - 4
    parts = [
        f'<rect x="{x}" y="{y}" width="{width}" height="{blk_h}" rx="14" fill="{TERM_BG}"/>',
        text(x + pad_x, y + pad_top + 8, head_l, size=10, fill=FAINT, family="mono", spacing=0.6),
        text(x + width - pad_x, y + pad_top + 8, head_r, size=10, fill=FAINT, family="mono", anchor="end", spacing=0.6),
    ]
    ty = inner_top + size
    for spans in lines:
        svg, _ = term_span_svg(x + pad_x, ty, size, spans)
        parts.append(svg)
        ty += line_px
    return "".join(parts), blk_h


def fig_term_gateway(S) -> tuple[int, int, str]:
    s = S["term-gateway"]
    w = 720
    body = header_row(w, t(s["kicker"]), t(s["badge"]), y=28)
    gw_lines = [
        [("hychiiu@AIAgentGateway:~$ ", "p"), ("ip route", "cmd")],
        [("default via 172.16.236.2 dev ", "plain"), ("enp2s0", "hl"), (" proto dhcp src 172.16.236.130 metric 1002", "plain")],
        [("10.10.10.0/24 dev ", "plain"), ("enp10s0", "hl"), (" proto kernel scope link src 10.10.10.1", "plain")],
        [("172.16.236.0/24 dev enp2s0 proto dhcp scope link src 172.16.236.130 metric 1002", "plain")],
        [("172.19.0.0/30 dev tun0 proto kernel scope link src 172.19.0.1", "mk")],
    ]
    win_lines = [
        [("PS C:\\Users\\hychiiu> ", "p"), ("ipconfig /all", "cmd")],
        [("Ethernet adapter Ethernet:", "plain")],
        [("   Description . . . . . . . . . . . : vmxnet3 Ethernet Adapter", "plain")],
        [("   DHCP Enabled. . . . . . . . . . . : Yes", "plain")],
        [("   IPv4 Address. . . . . . . . . . . : ", "plain"), ("10.10.10.125", "hl"), ("(Preferred)", "plain")],
        [("   Subnet Mask . . . . . . . . . . . : 255.255.255.0", "plain")],
        [("   Default Gateway . . . . . . . . . : ", "plain"), ("10.10.10.1", "mk")],
        [("   DHCP Server . . . . . . . . . . . : 10.10.10.1", "plain")],
        [("   DNS Servers . . . . . . . . . . . : 10.10.10.1", "plain")],
        [("PS C:\\Users\\hychiiu> ", "p"), ("route print -4", "cmd")],
        [("Network Destination        Netmask          Gateway       Interface  Metric", "plain")],
        [("          0.0.0.0          0.0.0.0       10.10.10.1     10.10.10.125     15", "plain")],
        [("       10.10.10.0    255.255.255.0         On-link      10.10.10.125    271", "plain")],
    ]
    y = 48
    gsvg, gh = term_block(16, y, 688, t(s["gw_head"]), t(s["gw_os"]), gw_lines)
    body += gsvg
    y += gh + 16
    wsvg, wh = term_block(16, y, 688, t(s["win_head"]), t(s["win_redaction"]), win_lines)
    body += wsvg
    y += wh + 18
    cap_lines = wrap_text(t(s["caption"]), 12.5, 688)
    for i, line in enumerate(cap_lines):
        body += text(16, y + i * 20, line, size=12.5, fill=MUTED)
    h = y + len(cap_lines) * 20 + 18
    return w, int(h), svg_doc(w, int(h), body)


def fig_term_debug(S) -> tuple[int, int, str]:
    s = S["term-debug-v2"]
    w = 720
    body = header_row(w, t(s["kicker"]), t(s["badge"]), y=28)
    # Pre-wrapped to match the published original, without rewriting output.
    gw_lines = [
        [("root@AIAgentGateway:~# ", "p"), ("systemctl is-active sing-box dnsmasq", "cmd")],
        [("active", "plain")],
        [("active", "plain")],
        [("root@AIAgentGateway:~# ", "p"), ("systemctl status sing-box --no-pager -l", "cmd")],
        [("     Active: active (running) since Fri 2026-10-23 04:21:10 PDT; 4 days ago", "plain")],
        [("Oct 28 00:26:53 sing-box[964]: ERROR … open connection to 95.101.31.36:80 using", "plain")],
        [("outbound/vless[my-node]: ", "plain"), ("EOF", "mk")],
        [("Oct 28 02:27:06 sing-box[964]: ERROR … open connection to 95.101.31.36:80 using", "plain")],
        [("outbound/vless[my-node]: ", "plain"), ("context deadline exceeded", "mk")],
        [("root@AIAgentGateway:~# ", "p"), ("timeout 5 bash -c 'echo >/dev/tcp/<VPS_IP>/<PORT>' && echo TCP_OK || echo", "cmd")],
        [("TCP_FAIL", "cmd")],
        [("TCP_OK", "hl")],
        [("root@AIAgentGateway:~# ", "p"), ("curl -sS --max-time 8 --connect-timeout 5 https://1.1.1.1/cdn-cgi/trace", "cmd")],
        [("curl: (28) Connection timed out after 5003 milliseconds", "plain")],
    ]
    vps_lines = [
        [("TLS handshake: ", "plain"), ("REALITY: processed invalid connection", "mk")],
    ]
    y = 48
    gsvg, gh = term_block(16, y, 688, t(s["gw_head"]), t(s["gw_note"]), gw_lines)
    body += gsvg
    y += gh + 16
    wsvg, wh = term_block(16, y, 688, t(s["vps_head"]), t(s["vps_when"]), vps_lines)
    body += wsvg
    y += wh + 18
    cap_lines = wrap_text(t(s["caption"]), 12.5, 688)
    for i, line in enumerate(cap_lines):
        body += text(16, y + i * 20, line, size=12.5, fill=MUTED)
    h = y + len(cap_lines) * 20 + 18
    return w, int(h), svg_doc(w, int(h), body)


FIGURES = [
    # key, filename stem (without .en), builder, original published name, figure no
    ("cover-v2", "cover-v2", fig_cover, "cover-v2.webp", "cover"),
    ("topology-v2", "topology-v2", fig_topology, "topology-v2.webp", "fig-1"),
    ("vmware-network", "vmware-network", fig_vmware, "vmware-network.webp", "fig-2"),
    ("term-gateway", "term-gateway", fig_term_gateway, "term-gateway.webp", "fig-3"),
    ("killswitch-v2", "killswitch-v2", fig_killswitch, "killswitch-v2.webp", "fig-4"),
    ("timezone-v2", "timezone-v2", fig_timezone, "timezone-v2.webp", "fig-5"),
    ("cpa-flow", "cpa-flow", fig_cpa, "cpa-flow.webp", "fig-6"),
    ("egern-bypass-v2", "egern-bypass-v2", fig_egern, "egern-bypass-v2.webp", "fig-7"),
    ("checklist-v2", "checklist-v2", fig_checklist, "checklist-v2.webp", "fig-8"),
    ("term-debug-v2", "term-debug-v2", fig_term_debug, "term-debug-v2.webp", "fig-9"),
]

ASSET_BASE = "https://raw.githubusercontent.com/hychiiu/hychiiu-blog/assets/posts/claude-vm-vps"


def rasterize(svg_path: Path, png_path: Path, webp_path: Path, scale: float = 2.0):
    import cairosvg

    cairosvg.svg2png(url=str(svg_path), write_to=str(png_path), scale=scale)
    im = Image.open(png_path).convert("RGB")
    im.save(webp_path, "WEBP", quality=88, method=6)
    return im.size


def collect_cjk(svg_text: str, label: str) -> list[str]:
    # Decode entities then search SVG text content, not comments
    hits = []
    for m in re.finditer(r">([^<>{]+)<", svg_text):
        raw = (
            m.group(1)
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&")
            .replace("&quot;", '"')
        )
        if CJK_RE.search(raw):
            hits.append(f"{label}: {raw.strip()[:160]}")
    return hits


def build_manifest(entries: list[dict]) -> dict:
    return {
        "article_en": "https://hychiiu.com/en/posts/claude-vm-vps/",
        "issue_en": "https://github.com/hychiiu/hychiiu-blog/issues/3",
        "issue_zh": "https://github.com/hychiiu/hychiiu-blog/issues/2",
        "note": (
            "English raster assets only. Do not overwrite Chinese files on the assets branch. "
            "Suggested upload path uses an en/ prefix under the same post folder."
        ),
        "figures": entries,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", help="Build only these stems, e.g. cover-v2 fig-4 keys")
    parser.add_argument("--scale", type=float, default=2.0)
    args = parser.parse_args()
    strings = load_strings()
    OUT_SVG.mkdir(parents=True, exist_ok=True)
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    OUT_WEBP.mkdir(parents=True, exist_ok=True)

    wanted = set(args.only or [])
    entries = []
    all_cjk = []
    for key, stem, builder, orig_name, fig_no in FIGURES:
        if wanted and stem not in wanted and key not in wanted and fig_no not in wanted:
            continue
        w, h, svg = builder(strings)
        svg_path = OUT_SVG / f"{stem}.en.svg"
        png_path = OUT_PNG / f"{stem}.en.png"
        webp_path = OUT_WEBP / f"{stem}.en.webp"
        svg_path.write_text(svg, encoding="utf-8")
        cjk = collect_cjk(svg, stem)
        all_cjk.extend(cjk)
        size = rasterize(svg_path, png_path, webp_path, scale=args.scale)
        orig_url = f"{ASSET_BASE}/{orig_name}"
        entry = {
            "id": fig_no,
            "key": key,
            "original_url": orig_url,
            "original_file": orig_name,
            "css_size": [w, h],
            "raster_size": [size[0], size[1]],
            "svg": str(svg_path.relative_to(ROOT)),
            "png": str(png_path.relative_to(ROOT)),
            "webp": str(webp_path.relative_to(ROOT)),
            "suggested_assets_path": f"posts/claude-vm-vps/en/{orig_name}",
            "suggested_raw_url": f"{ASSET_BASE.replace('/posts/', '/en/posts/' )}",  # placeholder fixed below
            "cjk_hits": cjk,
        }
        # correct suggested URL
        entry["suggested_raw_url"] = (
            "https://raw.githubusercontent.com/hychiiu/hychiiu-blog/assets/posts/claude-vm-vps/en/"
            + orig_name
        )
        entries.append(entry)
        print(f"{fig_no:6} {stem}.en  css={w}x{h}  raster={size[0]}x{size[1]}  cjk={len(cjk)}")

    if not wanted:
        (ROOT / "manifest.json").write_text(
            json.dumps(build_manifest(entries), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"wrote manifest.json with {len(entries)} figures")
    if all_cjk:
        print("CJK leftovers:")
        for h in all_cjk:
            print(" ", h)
        sys.exit(2)


if __name__ == "__main__":
    main()
