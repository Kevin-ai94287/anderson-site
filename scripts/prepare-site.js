const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const months = "January|February|March|April|May|June|July|August|September|October|November|December";
const monthName = n => ["January","February","March","April","May","June","July","August","September","October","November","December"][Number(n) - 1];
function walk(dir, out = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); e.isDirectory() ? walk(p, out) : e.name === "index.html" && out.push(p); } return out; }
function proseDates(text, zh) {
  if (zh) return text.replace(/(20\d{2})年([01]?\d)月[0-3]?\d日/g, "$1年$2月").replace(/([01]?\d)月[0-3]?\d日/g, "$1月");
  return text.replace(new RegExp(`\\b(${months})\\s+[0-3]?\\d(?:st|nd|rd|th)?[,]?\\s+(20\\d{2})`, "g"), "$1 $2")
    .replace(new RegExp(`\\b([0-3]?\\d)(?:st|nd|rd|th)?\\s+(${months})[,]?\\s+(20\\d{2})`, "g"), "$2 $3")
    .replace(new RegExp(`\\b(${months})\\s+[0-3]?\\d(?:st|nd|rd|th)?\\b`, "g"), "$1");
}
const publicationDates = new Map();
for (const f of walk(root).filter(f => /(?:^|\/)events\/index\.html$/.test(f))) {
  const html = fs.readFileSync(f, "utf8");
  for (const m of html.matchAll(/href="([^"]+)"[\s\S]{0,800}?<time>(20\d{2}-\d{2}-\d{2})<\/time>/g)) publicationDates.set(m[1].replace(/^\/zh/, ""), m[2]);
}
let count = 0;
for (const f of walk(root).filter(f => /\/(?:zh\/)?events\/.+\/index\.html$/.test(f))) {
  let html = fs.readFileSync(f, "utf8"), relative = "/" + path.relative(root, f).replace(/\\/g, "/").replace(/\/index\.html$/, "/");
  const date = publicationDates.get(relative.replace(/^\/zh/, "")) || (relative.match(/\/(20\d{2})(\d{2})(\d{2})-/) ? `${RegExp.$1}-${RegExp.$2}-${RegExp.$3}` : null);
  const zh = relative.startsWith("/zh/");
  html = html.replace(/(<p class="ipz-deck"[^>]*>[\s\S]*?<\/p>)/g, body => proseDates(body, zh));
  html = html.replace(/(<div class="ipz-content"[^>]*>[\s\S]*?)(?=<\/div>\s*<p class="ipz-footer-note">)/g, body => proseDates(body, zh));
  if (date && !/<time datetime="20\d{2}-\d{2}-\d{2}"/.test(html)) {
    const [year, month] = date.split("-"); const display = zh ? `${year}年${Number(month)}月` : `${monthName(month)} ${year}`;
    html = html.replace(/(<h1[^>]*>[\s\S]*?<\/h1>)/, `$1\n    <p class="ipz-post-date"><time datetime="${date}">${display}</time></p>`);
  }
  if (date && !/"datePublished"\s*:/.test(html)) {
    const title = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [,"Article"])[1].replace(/<[^>]+>/g, "").replace(/"/g, "&quot;");
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [,""])[1];
    const ld = JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:title,url:canonical,datePublished:date,dateModified:date});
    html = html.replace("</head>", `<script type="application/ld+json">${ld}</script>\n</head>`);
  }
  fs.writeFileSync(f, html); count++;
}
console.log(`Prepared ${count} Anderson articles with month-only body dates.`);
