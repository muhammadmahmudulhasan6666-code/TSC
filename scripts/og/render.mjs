// Renders scripts/og/og.html → public/brand/og-default-v2.jpg with headless Edge/Chrome,
// which shapes Bangla conjuncts correctly. Bump the file name when the design changes so
// Facebook/WhatsApp caches pick up the new image.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const exe = browsers.find((b) => fs.existsSync(b));
if (!exe) throw new Error("Edge or Chrome is required");

const html = path.resolve("scripts/og/og.html");
const png = path.resolve("scripts/og/og.png");
execFileSync(exe, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  "--force-device-scale-factor=1", "--window-size=1200,630", `--screenshot=${png}`, `file:///${html.replace(/\\/g, "/")}`]);
execFileSync("python", ["-c", `from PIL import Image; Image.open(r"${png}").convert("RGB").save(r"${path.resolve("public/brand/og-default-v2.jpg")}", quality=88, optimize=True, progressive=True)`]);
fs.rmSync(png);
console.log("wrote public/brand/og-default-v2.jpg");
