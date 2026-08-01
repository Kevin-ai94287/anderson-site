const fs = require("fs"), path = require("path"), root = path.join(__dirname, ".."), files = [];
function walk(dir) { for (const e of fs.readdirSync(dir, {withFileTypes:true})) { const p=path.join(dir,e.name); e.isDirectory()?walk(p):e.name === "index.html"&&files.push(p); } }
function fail(s) { console.error(`FAIL: ${s}`); process.exitCode = 1; }
walk(root);
const exact = /(?:20\d{2}年[01]?\d月[0-3]?\d日|[01]?\d月[0-3]?\d日|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+[0-3]?\d(?:st|nd|rd|th)?(?:,?\s+20\d{2})?\b)/;
for (const f of files) {
  const html=fs.readFileSync(f,"utf8"), post=/\/(?:zh\/)?events\/.+\/index\.html$/.test(f), list=/\/(?:zh\/)?events\/index\.html$/.test(f);
  if (post) { const body=(html.match(/<div class="ipz-content"[^>]*>([\s\S]*?)<\/div>\s*<p class="ipz-footer-note">/)||[,""])[1]; if(exact.test(body)) fail(`day precision in article body: ${f}`); if(!/<time datetime="20\d{2}-\d{2}-\d{2}">/.test(html)) fail(`exact time metadata missing: ${f}`); if(!/"datePublished":"20\d{2}-\d{2}-\d{2}"/.test(html)||!/"dateModified":"20\d{2}-\d{2}-\d{2}"/.test(html)) fail(`JSON-LD dates missing: ${f}`); }
  if (list && !/<time>20\d{2}-\d{2}-\d{2}<\/time>/.test(html)) fail(`listing dates lost: ${f}`);
}
if(!process.exitCode) console.log(`PASS: date policy validated in ${files.length} pages`);
