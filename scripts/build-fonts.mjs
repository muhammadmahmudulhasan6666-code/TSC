// Builds the self-hosted web fonts into public/fonts (design system §5.2).
// - Kalpurush (Bangla) is subset to the Bengali block + joiners and converted to WOFF2 with fontTools.
//   Source: the Kalpurush.ttf installed on Mahmud's PC (or KALPURUSH_TTF=path).
// - Tinos (Apache-2.0, metric-compatible with Times New Roman) is copied from @fontsource/tinos.
// Requires: python -m pip install fonttools brotli
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const out = path.resolve("public/fonts");
fs.mkdirSync(out, { recursive: true });

const kalpurush =
  process.env.KALPURUSH_TTF ||
  path.join(process.env.LOCALAPPDATA || "", "Microsoft/Windows/Fonts/Kalpurush.ttf");
if (!fs.existsSync(kalpurush)) throw new Error(`Kalpurush.ttf not found at ${kalpurush}`);

execFileSync("python", [
  "-m", "fontTools.subset", kalpurush,
  "--unicodes=U+0980-09FF,U+200C-200D,U+25CC,U+0964-0965,U+20B9,U+0020-0040",
  "--layout-features=*",
  "--flavor=woff2",
  `--output-file=${path.join(out, "Kalpurush.woff2")}`,
], { stdio: "inherit" });

const tinos = path.resolve("node_modules/@fontsource/tinos/files");
for (const w of ["400", "700"]) {
  for (const s of ["normal", "italic"]) {
    for (const sub of ["latin", "latin-ext"]) {
      fs.copyFileSync(path.join(tinos, `tinos-${sub}-${w}-${s}.woff2`), path.join(out, `Tinos-${sub}-${w}-${s}.woff2`));
    }
  }
}

for (const f of fs.readdirSync(out)) console.log(f.padEnd(34), (fs.statSync(path.join(out, f)).size / 1024).toFixed(1) + " KB");
