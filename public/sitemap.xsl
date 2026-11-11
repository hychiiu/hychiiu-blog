<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Sitemap · hychiiu</title>
<style>
:root{color-scheme:light dark;--bg:#faf9f5;--fg:#2b2a27;--mute:#8a877f;--line:#e8e5dc;--accent:#c56473}
@media (prefers-color-scheme:dark){:root{--bg:#18181a;--fg:#e6e4de;--mute:#8d8b85;--line:#2c2c2f}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.8 "Noto Serif SC",Georgia,serif}
main{max-width:720px;margin:0 auto;padding:72px 24px}
h1{font-weight:500;font-size:28px;margin:0 0 4px}
p{color:var(--mute);margin:0 0 40px;font-size:14px}
ol{list-style:none;padding:0;margin:0}
li{padding:12px 0;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:baseline}
li span{color:var(--mute);font:12px "JetBrains Mono",ui-monospace,monospace;min-width:2em}
a{color:var(--fg);text-decoration:none;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:14px;word-break:break-all}
a:hover{color:var(--accent)}
</style></head><body><main>
<h1>Sitemap</h1>
<xsl:choose>
<xsl:when test="s:sitemapindex">
<p>索引 · <xsl:value-of select="count(s:sitemapindex/s:sitemap)"/> 个子站点地图</p>
<ol><xsl:for-each select="s:sitemapindex/s:sitemap"><li><span><xsl:value-of select="position()"/></span><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></li></xsl:for-each></ol>
</xsl:when>
<xsl:otherwise>
<p>共 <xsl:value-of select="count(s:urlset/s:url)"/> 个页面</p>
<ol><xsl:for-each select="s:urlset/s:url"><li><span><xsl:value-of select="position()"/></span><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></li></xsl:for-each></ol>
</xsl:otherwise>
</xsl:choose>
</main></body></html>
</xsl:template>
</xsl:stylesheet>
