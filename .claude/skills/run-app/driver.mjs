/**
 * Headless driver for the Nigeria Electricity Tracker.
 *
 * Run it from a directory that has `playwright` installed (the session
 * scratchpad — see SKILL.md); screenshots and the saved session land beside
 * the working directory, not beside this file.
 *
 *   node driver.mjs <step> [url]
 *
 * Steps:
 *   public   — the no-login area page. Needs no session.
 *   onboard  — anonymous sign-in + pick an area. Writes state.json.
 *              Pass "State/LGA" to choose, e.g. onboard "Oyo/Ibadan North".
 *   area     — the signed-in area dashboard. Needs onboard first.
 *   admin    — the admin overview. Shows the refusal unless the account
 *              has been promoted (see SKILL.md).
 *   page     — any route, WITHOUT a leading slash (Git Bash mangles it):
 *              `node driver.mjs page faults`
 */
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

/**
 * Playwright is installed in the *working* directory (the scratchpad), not
 * beside this file. ESM resolves bare specifiers relative to the module, so
 * a plain `import "playwright"` would miss it — resolve from cwd instead.
 */
const requireFromCwd = createRequire(path.join(process.cwd(), "noop.cjs"));
let chromium;
try {
  ({ chromium } = requireFromCwd("playwright"));
} catch {
  console.error(
    `playwright is not installed in ${process.cwd()}.
` +
      "Run:  npm init -y && npm i playwright && npx playwright install chromium",
  );
  process.exit(1);
}

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const CWD = process.cwd();
const SHOTS = path.join(CWD, "shots");
const STATE = path.join(CWD, "state.json");
fs.mkdirSync(SHOTS, { recursive: true });

const step = process.argv[2] ?? "public";
const arg = process.argv[3];

/** Section headings that mark "the data actually arrived". */
const READY = {
  public: "The week ahead",
  area: "The week ahead",
};

async function shootSection(page, heading, file) {
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) })
    .first();
  if (!(await section.count())) return null;
  await section.screenshot({ path: path.join(SHOTS, `${file}.png`) });
  return await section.innerText();
}

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 900, height: 1500 },
  ...(fs.existsSync(STATE) && step !== "public" ? { storageState: STATE } : {}),
});
const page = await context.newPage();

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

try {
  if (step === "public") {
    await page.goto(`${BASE}/state/lagos/lga/ikeja`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: READY.public }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SHOTS, "public-full.png"), fullPage: true });
    for (const h of ["The usual week", "Getting better or worse", "The week ahead"]) {
      const text = await shootSection(page, h, `public-${h.split(" ")[1]}`);
      if (text) console.log(`\n### ${h}\n${text}`);
    }
  }

  if (step === "onboard") {
    const [stateName, lgaName] = (arg ?? "Lagos/Ikeja").split("/");
    await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelectorAll("select")[0]?.options.length > 5,
      { timeout: 90000 },
    );
    await page.locator("select").first().selectOption({ label: stateName });
    await page.waitForFunction(
      () => document.querySelectorAll("select")[1]?.options.length > 1,
      { timeout: 90000 },
    );
    await page.locator("select").nth(1).selectOption({ label: lgaName });
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.waitForTimeout(6000);
    await context.storageState({ path: STATE });
    console.log(`onboarded to ${stateName}/${lgaName}; landed on ${page.url()}`);
  }

  if (step === "area") {
    await page.goto(`${BASE}/area`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: READY.area }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SHOTS, "area-full.png"), fullPage: true });

    const banner = page.locator("section[aria-label='Recent change in supply']");
    if (await banner.count()) {
      await banner.screenshot({ path: path.join(SHOTS, "area-anomaly.png") });
      console.log("ANOMALY BANNER:\n" + (await banner.innerText()));
    } else {
      console.log("ANOMALY BANNER: absent — this LGA has not shifted. Not a failure.");
    }
    const usual = await shootSection(page, "The usual week", "area-usual-week");
    if (usual) console.log("\n" + usual);
  }

  if (step === "admin") {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(9000);
    await page.screenshot({ path: path.join(SHOTS, "admin-full.png"), fullPage: true });
    const panel = page.locator("section").filter({ hasText: "Changed sharply" }).first();
    if (await panel.count()) {
      await panel.screenshot({ path: path.join(SHOTS, "admin-anomalies.png") });
      console.log("PANEL:\n" + (await panel.innerText()));
    } else {
      console.log(
        "No admin panel. Body:\n" + (await page.locator("body").innerText()).slice(0, 600),
      );
    }
  }

  if (step === "page") {
    // Git Bash on Windows rewrites a bare "/faults" argument into
    // "C:/Program Files/Git/faults" before node ever sees it. Pass paths
    // without the leading slash — "page faults" — and bail loudly if the
    // mangled form arrives anyway, rather than navigating somewhere absurd.
    if (/^[A-Za-z]:[\/]/.test(arg ?? "")) {
      console.error(
        `The shell rewrote "${arg}" into a filesystem path.
` +
          'Pass the route without a leading slash, e.g.  node driver.mjs page faults',
      );
      process.exit(1);
    }
    const target = arg ? (arg.startsWith("/") ? arg : `/${arg}`) : "/";
    await page.goto(`${BASE}${target}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    const name = target.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "root";
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
    console.log((await page.locator("body").innerText()).slice(0, 1500));
  }
} finally {
  console.log("\nCONSOLE-ERRORS:", errors.length);
  for (const e of errors.slice(0, 15)) console.log("  !", e);
  await browser.close();
}
