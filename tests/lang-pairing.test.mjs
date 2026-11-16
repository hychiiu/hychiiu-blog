import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { entriesForLang, entryPath, entrySlug, issueEntryKeys, slugOk } from '../src/utils/entry-lang.ts';

const post = (id, lang, slug) => ({ id, data: { lang, slug } });

test('issueEntryKeys：同 slug 不同语言得到不同内部 id，URL slug 相同', () => {
  const used = new Set();
  const zh = issueEntryKeys({ number: 2, lang: 'zh' }, 'claude-vm-vps', used);
  const en = issueEntryKeys({ number: 10002, lang: 'en' }, 'claude-vm-vps', used);
  assert.equal(zh.slug, 'claude-vm-vps');
  assert.equal(en.slug, 'claude-vm-vps');
  assert.equal(zh.id, 'claude-vm-vps--zh');
  assert.equal(en.id, 'claude-vm-vps--en');
  assert.notEqual(zh.id, en.id);
});

test('issueEntryKeys：同语言重复 slug 时，后一篇退回 issue 号，避免同语路径冲突', () => {
  const used = new Set();
  const a = issueEntryKeys({ number: 1, lang: 'zh' }, 'same-slug', used);
  const b = issueEntryKeys({ number: 9, lang: 'zh' }, 'same-slug', used);
  assert.equal(a.slug, 'same-slug');
  assert.equal(b.slug, '9');
  assert.equal(b.id, '9--zh');
});

test('slugOk 拒绝空值和非法字符，合法 slug 原样返回', () => {
  assert.equal(slugOk(undefined), undefined);
  assert.equal(slugOk(''), undefined);
  assert.equal(slugOk('bad slug'), undefined);
  assert.equal(slugOk('claude-vm-vps'), 'claude-vm-vps');
});

test('entriesForLang：中文站只列中文配对版本，英文站只列英文，语言切换靠同一 slug', () => {
  const all = [
    post('claude-vm-vps--zh', 'zh', 'claude-vm-vps'),
    post('claude-vm-vps--en', 'en', 'claude-vm-vps'),
    post('en-only--en', 'en', 'en-only'),
  ];
  const zh = entriesForLang(all, 'zh');
  const en = entriesForLang(all, 'en');
  assert.deepEqual(
    zh.map((e) => e.id),
    ['claude-vm-vps--zh', 'en-only--en'],
  );
  assert.deepEqual(
    en.map((e) => e.id),
    ['claude-vm-vps--en', 'en-only--en'],
  );
  assert.equal(entrySlug(zh[0]), 'claude-vm-vps');
  assert.equal(entrySlug(en[0]), 'claude-vm-vps');
  assert.equal(entryPath('posts', zh[0]), '/posts/claude-vm-vps/');
  assert.equal(entryPath('posts', en[0]), '/posts/claude-vm-vps/');
});

test('entriesForLang：没有英文时，英文站回退全部中文，不编造英文正文', () => {
  const all = [post('only-zh--zh', 'zh', 'only-zh')];
  const en = entriesForLang(all, 'en');
  assert.equal(en.length, 1);
  assert.equal(en[0].data.lang, 'zh');
});

test('路由与列表使用 slug 而不是内部 id，避免 /posts/claude-vm-vps--zh/ 这类路径', () => {
  const routes = readFileSync(new URL('../src/utils/routes.ts', import.meta.url), 'utf8');
  assert.match(routes, /params:\s*\{\s*id:\s*slug\s*\}/);
  assert.match(routes, /has\.zh\.has\(slug\)/);
  assert.match(routes, /has\.en\.has\(slug\)/);
  assert.doesNotMatch(routes, /params:\s*\{\s*id:\s*entry\.id\s*\}/);
  for (const file of [
    'src/views/Home.astro',
    'src/components/YearList.astro',
    'src/views/NotesList.astro',
    'src/utils/rss.ts',
  ]) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(src, /entryPath\(/, `${file} 应使用 entryPath`);
    assert.doesNotMatch(src, /`\/posts\/\$\{p\.id\}\/`/, `${file} 不应再用 collection id 拼文章 URL`);
    assert.doesNotMatch(src, /`\/notes\/\$\{n\.id\}\/`/, `${file} 不应再用 collection id 拼手记 URL`);
    assert.doesNotMatch(src, /`\/\$\{e\.kind\}\/\$\{e\.id\}\/`/, `${file} 不应再用 e.id 拼路径`);
  }
});

test('英文稿与中文共用 slug，并保留关键命令与占位符', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/issues.json', import.meta.url), 'utf8'));
  const zhIssue = data.issues.find((i) => i.lang === 'zh' && i.body.includes('slug: claude-vm-vps'));
  const enIssue = data.issues.find((i) => i.lang === 'en' && i.body.includes('slug: claude-vm-vps'));
  assert.ok(zhIssue, 'issues.json 应含中文 claude-vm-vps');
  assert.ok(enIssue, 'issues.json 应含英文 claude-vm-vps，而不是本地预览号');
  assert.notEqual(enIssue.number, 10002);
  assert.notEqual(zhIssue.number, 10002);
  const zhBody = zhIssue.body;
  const en = enIssue.body;
  assert.match(en, /^<!--[\s\S]*slug:\s*claude-vm-vps/m);
  assert.match(en, /description:\s*.+/);
  assert.doesNotMatch(en, /给 Claude 一条干净的线路：一台 VPS 和两台虚拟机/);
  const required = [
    'bash <(wget -qO- -o- https://github.com/233boy/sing-box/raw/main/install.sh)',
    'sing-box url',
    'sudo timedatectl set-timezone America/Los_Angeles',
    'sudo localectl set-locale LANG=en_US.UTF-8',
    'vless://<UUID>@<VPS_IP>:<PORT>',
    'setup-gateway.sh',
    'dhcp-range=10.10.10.100,10.10.10.200,12h',
    'auto_route',
    'auto_redirect',
    'strict_route',
    'hijack-dns',
    'table inet killswitch',
    'tzutil /s "Pacific Standard Time"',
    'Set-WinUserLanguageList',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_AUTH_TOKEN',
    'bypass_tunnel_proxy',
    'vif_excluded_routes',
    'route -n get <VPS_IP>',
    'vmrun',
    'Intl.DateTimeFormat().resolvedOptions().timeZone',
    '<VPS_IP>',
    '<UUID>',
    '<API_KEY>',
  ];
  for (const s of required) {
    assert.ok(en.includes(s), `英文稿缺少：${s}`);
    // 命令与占位符在中文原稿中同样存在（路径别名等中文提示除外）
    if (!s.includes('please') && s !== 'Set-WinUserLanguageList') {
      assert.ok(zhBody.includes(s) || s === 'setup-gateway.sh', `中文原稿应保留 ${s}`);
    }
  }
  assert.ok((en.match(/<VPS_IP>/g) || []).length > 3);
  assert.doesNotMatch(en, /i@hychiiu\.com/);
  const leaked = [...en.matchAll(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g)]
    .map((m) => m[1])
    .filter((ip) => {
      const allowed = /^(10\.|127\.|8\.8\.8\.8|1\.1\.1\.1|172\.16\.|172\.19\.|198\.18\.)/;
      return !allowed.test(ip);
    });
  assert.deepEqual(leaked, [], `英文稿出现了未约定的公网 IP：${leaked.join(', ')}`);
});
