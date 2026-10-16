import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  CUSTOM_SWATCHES, GENERATED_PRESETS, PALETTE_IDS, PRESET_BLOCK_END, PRESET_BLOCK_START,
  contrastRatio, customPaletteCss, generatedPresetBlock, hexToRgb, hslHex, isPaletteSetting, normalizeHex,
  paletteAvatarHue, paletteFromAccent, paletteLogo, paletteMetaColors, palettePreview, presetTokens,
  resolvePalette, rgbToHex, rgbToHsl,
} from "@/lib/palette";
import { PALETTE_THEME_COLORS, SECTION_THEME_COLORS, THEME_INIT_SCRIPT, parsePaletteMeta, themeColorFor } from "@/lib/themeColor";
import { isUserSettingKey, validateSettingValue } from "@/lib/userSettingKeys";

const CSS = readFileSync(path.join(__dirname, "..", "app", "palette-themes.css"), "utf8");

describe("normalizeHex / resolvePalette", () => {
  it("accepts #RRGGBB and RRGGBB, rejects the rest", () => {
    expect(normalizeHex("#a87bff")).toBe("#A87BFF");
    expect(normalizeHex("a87bff")).toBe("#A87BFF");
    expect(normalizeHex(" #A87BFF ")).toBe("#A87BFF");
    for (const bad of ["#fff", "#GGGGGG", "#12345", "#1234567", "red", "", null, undefined, 123, "#a87bff;color:red", "<script>"]) {
      expect(normalizeHex(bad as unknown)).toBeNull();
    }
  });
  it("auto follows the section, others are explicit, custom needs a valid color", () => {
    expect(resolvePalette("auto", null, null)).toBe("routine");
    expect(resolvePalette("auto", null, "routine")).toBe("routine");
    expect(resolvePalette("auto", null, "trade")).toBe("trade");
    expect(resolvePalette("auto", null, "workout")).toBe("workout");
    expect(resolvePalette("amethyst", null, "trade")).toBe("amethyst");
    expect(resolvePalette("routine", null, "trade")).toBe("routine");
    expect(resolvePalette("custom", "#14B8A6", "trade")).toBe("custom");
    expect(resolvePalette("custom", null, "trade")).toBe("trade");
    expect(resolvePalette("custom", "nope", null)).toBe("routine");
  });
  it("knows every id", () => {
    for (const id of PALETTE_IDS) expect(isPaletteSetting(id)).toBe(true);
    expect(isPaletteSetting("neon")).toBe(false);
    expect(isPaletteSetting(null)).toBe(false);
  });
});

describe("color math", () => {
  it("round trips rgb/hsl/hex", () => {
    for (const hex of ["#A87BFF", "#FF8A3D", "#E6E8EB", "#000000", "#FFFFFF", "#14B8A6"]) {
      const [h, s, l] = rgbToHsl(hexToRgb(hex));
      const back = hslHex(h, s, l);
      expect(contrastRatio(hex, back)).toBeLessThan(1.02);
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });
  it("matches known WCAG ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });
});

// جمع کردن چند رنگ تصادفی ولی قطعی (LCG) + حالت‌های لبه
function sampleColors(): string[] {
  const out = ["#FFD400", "#00E5FF", "#808080", "#FFFFFF", "#000000", "#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#7CFC00", "#3A2A8C", "#F5F5DC", "#222222", "#FDFDFD", ...CUSTOM_SWATCHES];
  for (let h = 0; h < 360; h += 15) for (const l of [0.2, 0.5, 0.85]) out.push(hslHex(h, 0.9, l));
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 150; i++) out.push(hslHex(rnd() * 360, rnd(), rnd()));
  return out;
}

describe("paletteFromAccent contrast guarantees", () => {
  const colors = sampleColors();
  it("is deterministic", () => {
    expect(paletteFromAccent("#7C5CFF")).toEqual(paletteFromAccent("#7C5CFF"));
    expect(paletteFromAccent("#7c5cff")).toEqual(paletteFromAccent("#7C5CFF"));
  });
  it("keeps WCAG AA (4.5) for body text, accent text and button text in both modes", () => {
    for (const c of colors) {
      const t = paletteFromAccent(c);
      for (const mode of ["dark", "light"] as const) {
        const m = t[mode];
        const bg = m["--bg"];
        const tag = `${c} ${mode}`;
        expect(contrastRatio(m["--text"], bg), `${tag} text/bg`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--muted"], bg), `${tag} muted/bg`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--accent"], bg), `${tag} accent/bg`).toBeGreaterThanOrEqual(4.5);
        // متن دکمه‌ی accent همیشه var(--bg) ـه
        expect(contrastRatio(bg, m["--accent"]), `${tag} bg/accent`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--secondary"], bg), `${tag} secondary/bg`).toBeGreaterThanOrEqual(4.5);
        // روی سطح‌های کارت/پاپ‌آپ هم
        for (const k of ["--surface-1", "--surface-2"]) {
          expect(contrastRatio(m["--text"], m[k]), `${tag} text/${k}`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(m["--accent"], m[k]), `${tag} accent/${k}`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(m["--muted"], m[k]), `${tag} muted/${k}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      // روز: سفید روی accent (--sec-on-accent) هم
      expect(contrastRatio("#FFFFFF", t.light["--accent"]), `${c} white/accent`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("gives a complete, well formed token set", () => {
    const need = ["--bg", "--bg-rgb", "--surface-rgb", "--text", "--text-rgb", "--muted", "--muted2", "--accent", "--accent-rgb", "--accent-dim",
      "--accent-soft", "--accent-deep", "--secondary", "--secondary-rgb", "--secondary-dim", "--card-bg", "--input-bg", "--line", "--surface-1",
      "--surface-2", "--surface-glass", "--surface-line", "--box-bg", "--box-line", "--ring-1a", "--ring-1b", "--ring-2a", "--ring-2b", "--ring-3a",
      "--ring-3b", "--ring-over", "--sec-head", "--sec-muted", "--sec-line", "--sec-card-border", "--sec-accent", "--sec-accent-rgb",
      "--sec-secondary", "--sec-secondary-rgb", "--sec-on-accent", "--sec-on-secondary", "--logo-from", "--logo-mid", "--logo-to"];
    for (const c of ["#FFD400", "#808080", "#00E5FF"]) {
      const t = paletteFromAccent(c);
      for (const mode of ["dark", "light"] as const) {
        for (const k of need) expect(t[mode][k], `${c} ${mode} ${k}`).toBeTruthy();
        expect(t[mode]["--bg"]).toMatch(/^#[0-9A-F]{6}$/);
        expect(t[mode]["--accent-rgb"]).toMatch(/^\d{1,3},\d{1,3},\d{1,3}$/);
      }
    }
  });
  it("keeps the hue of a colorful input and stays neutral for gray", () => {
    const [h] = rgbToHsl(hexToRgb(paletteFromAccent("#2F7DF6").dark["--accent"]));
    const [h0] = rgbToHsl(hexToRgb("#2F7DF6"));
    expect(Math.abs(h - h0)).toBeLessThan(6);
    const g = paletteFromAccent("#808080");
    const [, s] = rgbToHsl(hexToRgb(g.dark["--bg"]));
    expect(s).toBeLessThan(0.1);
  });
  it("falls back safely for garbage input", () => {
    expect(paletteFromAccent("zzz").dark["--bg"]).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe("presets", () => {
  it("meet AA for body text, accent text, button text and secondary in both modes", () => {
    for (const id of GENERATED_PRESETS) {
      const t = presetTokens(id);
      for (const mode of ["dark", "light"] as const) {
        const m = t[mode];
        const bg = m["--bg"];
        const tag = `${id} ${mode}`;
        expect(contrastRatio(m["--text"], bg), `${tag} text`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--muted"], bg), `${tag} muted`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--accent"], bg), `${tag} accent`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(bg, m["--accent"]), `${tag} button text`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--secondary"], bg), `${tag} secondary`).toBeGreaterThanOrEqual(4.5);
        for (const k of ["--surface-1", "--surface-2"]) {
          expect(contrastRatio(m["--text"], m[k]), `${tag} text/${k}`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(m["--accent"], m[k]), `${tag} accent/${k}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrastRatio("#FFFFFF", t.light["--accent"]), `${id} white on light accent`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("uses the lead's identity colors", () => {
    expect(presetTokens("amethyst").dark["--accent"]).toBe("#A87BFF");
    expect(presetTokens("amethyst").dark["--secondary"]).toBe("#E9C77B");
    expect(presetTokens("amethyst").light["--accent"]).toBe("#6B3FD1");
    expect(presetTokens("sunset").dark["--accent"]).toBe("#FF8A3D");
    expect(presetTokens("sunset").dark["--secondary"]).toBe("#FF5E7E");
    expect(presetTokens("graphite").dark["--accent"]).toBe("#E6E8EB");
    expect(presetTokens("graphite").dark["--secondary"]).toBe("#8FA3B8");
    expect(presetTokens("graphite").light["--accent"]).toBe("#1F2937");
  });
  it("static css file matches the generator output", () => {
    const a = CSS.indexOf(PRESET_BLOCK_START);
    const b = CSS.indexOf(PRESET_BLOCK_END);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(CSS.slice(a, b + PRESET_BLOCK_END.length) + "\n").toBe(generatedPresetBlock());
  });
});

describe("palette-themes.css", () => {
  it("is keyed by data-palette only (no data-section color rules left)", () => {
    expect(CSS).not.toMatch(/html\[data-section=/);
    for (const id of ["trade", "workout", ...GENERATED_PRESETS]) expect(CSS).toContain(`html[data-palette="${id}"]`);
  });
  it("keeps event theme and admin noir precedence on every token block", () => {
    const blocks = CSS.split("\n").filter((l) => /^html\[data-palette="[a-z]+"\]:not\(\[data-event-theme\]\)/.test(l) && l.includes("body") && !l.includes("lh-aurora-b"));
    expect(blocks.length).toBeGreaterThan(10);
    for (const l of blocks) expect(l).toContain(':not([data-admin-theme="noir"])');
  });
  it("meta theme-color table equals the --bg declared in the css", () => {
    for (const id of ["trade", "workout"] as const) {
      const dark = new RegExp(`html\\[data-palette="${id}"\\][^{]*body:not\\(\\[data-theme="light"\\]\\)\\{[^}]*?--bg:(#[0-9A-Fa-f]{6})`).exec(CSS)?.[1];
      const light = new RegExp(`html\\[data-palette="${id}"\\][^{]*body\\[data-theme="light"\\]\\{[^}]*?--bg:(#[0-9A-Fa-f]{6})`).exec(CSS)?.[1];
      expect(dark?.toUpperCase()).toBe(SECTION_THEME_COLORS[id].dark.toUpperCase());
      expect(light?.toUpperCase()).toBe(SECTION_THEME_COLORS[id].light.toUpperCase());
    }
    for (const id of GENERATED_PRESETS) {
      expect(PALETTE_THEME_COLORS[id].dark).toBe(presetTokens(id).dark["--bg"]);
      expect(PALETTE_THEME_COLORS[id].light).toBe(presetTokens(id).light["--bg"]);
    }
  });
  it("defines the routine logo gradient and per-palette logo tokens", () => {
    expect(CSS).toContain("--logo-from:#34D26B; --logo-mid:#09C796; --logo-to:#00AAB1;");
    expect(CSS).toContain('html[data-palette="trade"] body{ --logo-from:#00B9F3; --logo-mid:#01A4F2; --logo-to:#0475F5; }');
    expect(CSS).toContain('html[data-palette="workout"] body{ --logo-from:#F11834; --logo-mid:#E9133D; --logo-to:#D0084B; }');
  });
});

describe("workout palette (black + red only)", () => {
  function block(mode: "dark" | "light"): Record<string, string> {
    const re = mode === "dark"
      ? /html\[data-palette="workout"\][^{]*body:not\(\[data-theme="light"\]\)\{([^}]*)\}/
      : /html\[data-palette="workout"\][^{]*body\[data-theme="light"\]\{([^}]*)\}/;
    const body = re.exec(CSS)![1];
    const out: Record<string, string> = {};
    for (const m of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/gi)) out[m[1]] = m[2].trim();
    return out;
  }
  for (const mode of ["dark", "light"] as const) {
    it(`${mode}: meets AA for text, muted, accent, secondary and button text`, () => {
      const m = block(mode);
      const bg = m["--bg"];
      expect(contrastRatio(m["--text"], bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(m["--muted"], bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(m["--accent"], bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(m["--secondary"], bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(bg, m["--accent"])).toBeGreaterThanOrEqual(4.5);
      for (const k of ["--surface-1", "--surface-2"]) {
        expect(contrastRatio(m["--text"], m[k]), `text/${k}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--muted"], m[k]), `muted/${k}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--accent"], m[k]), `accent/${k}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(m["--secondary"], m[k]), `secondary/${k}`).toBeGreaterThanOrEqual(4.5);
      }
      if (mode === "light") expect(contrastRatio("#FFFFFF", m["--accent"])).toBeGreaterThanOrEqual(4.5);
    });
    it(`${mode}: stays monochrome red/black (no gold, pink or orange hues)`, () => {
      const m = block(mode);
      for (const k of ["--accent", "--accent-soft", "--accent-deep", "--ring-1a", "--ring-1b", "--ring-2a", "--ring-2b", "--ring-over"]) {
        const [h, s] = rgbToHsl(hexToRgb(m[k]));
        expect(s, k).toBeGreaterThan(0.5);
        expect(h >= 346 || h <= 6, `${k} hue ${h}`).toBe(true);
      }
      for (const k of ["--bg", "--text", "--muted", "--secondary", "--surface-1", "--surface-2", "--ring-3a", "--ring-3b"]) {
        expect(rgbToHsl(hexToRgb(m[k]))[1], k).toBeLessThan(0.1);
      }
    });
  }
});

describe("custom palette css", () => {
  it("is empty without a valid color and has only safe characters otherwise", () => {
    expect(customPaletteCss(null)).toBe("");
    expect(customPaletteCss("javascript:alert(1)")).toBe("");
    for (const c of ["#14B8A6", "#FFD400", "#808080"]) {
      const css = customPaletteCss(c);
      expect(css).toContain('html[data-palette="custom"]');
      expect(css).not.toMatch(/[<>\\`]/);
      expect(css).toMatch(/^[A-Za-z0-9#.,:;(){}\[\]="%\-\s_>*/]*$/);
      expect(css).toContain("--logo-from:");
    }
  });
  it("meta colors come from the generated bg", () => {
    const m = paletteMetaColors("#14B8A6");
    expect(m).toEqual({ dark: paletteFromAccent("#14B8A6").dark["--bg"], light: paletteFromAccent("#14B8A6").light["--bg"] });
    expect(paletteMetaColors("x")).toBeNull();
  });
});

describe("previews and hues", () => {
  it("returns three colors per palette and mode", () => {
    for (const id of ["routine", "trade", "workout", "amethyst", "sunset", "graphite", "custom"] as const) {
      for (const mode of ["dark", "light"] as const) {
        const p = palettePreview(id, mode, "#14B8A6");
        expect(p.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(p.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(paletteLogo(id, mode, "#14B8A6")).toHaveLength(3);
      }
    }
  });
  it("avatar hue keeps the old section hues and leaves routine to the theme", () => {
    expect(paletteAvatarHue("routine", "dark", null)).toBeUndefined();
    expect(paletteAvatarHue("trade", "dark", null)).toBe(196);
    expect(paletteAvatarHue("workout", "light", null)).toBe(350);
    expect(paletteAvatarHue("amethyst", "dark", null)).toBeGreaterThan(240);
  });
});

describe("meta theme-color", () => {
  it("uses the palette bg, section as fallback, base for event themes and routine", () => {
    expect(themeColorFor("dark", null)).toBe("#0E1011");
    expect(themeColorFor("light", "trade")).toBe("#E7EDF4");
    expect(themeColorFor("dark", "trade", false, "routine")).toBe("#0E1011");
    expect(themeColorFor("dark", null, false, "amethyst")).toBe(presetTokens("amethyst").dark["--bg"]);
    expect(themeColorFor("light", "workout", false, "sunset")).toBe(presetTokens("sunset").light["--bg"]);
    expect(themeColorFor("dark", null, true, "amethyst")).toBe("#0E1011");
    const custom = paletteMetaColors("#14B8A6")!;
    expect(themeColorFor("light", null, false, "custom", custom)).toBe(custom.light);
    expect(themeColorFor("dark", null, false, "custom", null)).toBe("#0E1011");
  });
  it("parses the data-palette-meta attribute", () => {
    expect(parsePaletteMeta("#0A1213,#E4F2F4")).toEqual({ dark: "#0A1213", light: "#E4F2F4" });
    expect(parsePaletteMeta("#0A1213")).toBeNull();
    expect(parsePaletteMeta("red,blue")).toBeNull();
    expect(parsePaletteMeta(null)).toBeNull();
  });
  it("inline init script picks the effective palette bg", () => {
    function run(attrs: Record<string, string>, cookie = ""): string | null {
      const root: Record<string, string> = { ...attrs };
      let content: string | null = null;
      const metaEl = { setAttribute: (k: string, v: string) => { if (k === "content") content = v; }, remove() {} };
      const doc = {
        cookie,
        documentElement: {
          getAttribute: (k: string) => root[k] ?? null,
          setAttribute: (k: string, v: string) => { root[k] = v; },
          hasAttribute: (k: string) => k in root,
        },
        body: { setAttribute() {} },
        querySelectorAll: () => [],
        createElement: () => metaEl,
        head: { appendChild() {} },
      };
      new Function("document", "location", THEME_INIT_SCRIPT)(doc, { hostname: "localhost", protocol: "http:" });
      return content;
    }
    expect(run({ "data-palette": "routine", "data-theme": "dark" })).toBe("#0E1011");
    expect(run({ "data-palette": "amethyst", "data-theme": "dark", "data-theme-src": "account" })).toBe(presetTokens("amethyst").dark["--bg"]);
    expect(run({ "data-palette": "amethyst", "data-theme": "light", "data-theme-src": "account" })).toBe(presetTokens("amethyst").light["--bg"]);
    expect(run({ "data-palette": "trade", "data-theme": "light", "data-theme-src": "account" })).toBe("#E7EDF4");
    expect(run({ "data-palette": "custom", "data-palette-meta": "#0A1213,#E4F2F4", "data-theme": "light", "data-theme-src": "account" })).toBe("#E4F2F4");
    expect(run({ "data-palette": "custom", "data-palette-meta": "#0A1213,#E4F2F4", "data-theme": "dark", "data-theme-src": "account" })).toBe("#0A1213");
    expect(run({ "data-palette": "amethyst", "data-event-theme": "nowruz", "data-theme": "dark", "data-theme-src": "account" })).toBe("#0E1011");
    expect(run({ "data-section": "workout", "data-theme": "dark", "data-theme-src": "account" })).toBe("#0B0B0C");
  });
});

describe("settings allowlist", () => {
  it("palette keys are user writable and validated", () => {
    expect(isUserSettingKey("palette")).toBe(true);
    expect(isUserSettingKey("paletteCustom")).toBe(true);
    expect(validateSettingValue("palette", "amethyst")).toEqual({ ok: true, value: "amethyst" });
    expect(validateSettingValue("palette", "neon")).toEqual({ ok: false });
    expect(validateSettingValue("palette", { a: 1 })).toEqual({ ok: false });
    expect(validateSettingValue("paletteCustom", "#14b8a6")).toEqual({ ok: true, value: "#14B8A6" });
    expect(validateSettingValue("paletteCustom", "#14b8a6; background:url(x)")).toEqual({ ok: false });
    expect(validateSettingValue("paletteCustom", null)).toEqual({ ok: true, value: null });
    expect(validateSettingValue("theme", "light")).toEqual({ ok: true, value: "light" });
  });
});
