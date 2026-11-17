import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  isArticlePath,
  isLangSwitchOfSameArticle,
  isSourceMenuPath,
  localizeSourceHref,
  rememberSourceOnNav,
  resolveBackTarget,
} from '../src/utils/back-nav.ts';

const fresh = () => ({ source: null, switchedLang: false });
const from = (pathname, extra = {}) => ({ pathname, search: '', hash: '', scrollY: 0, ...extra });

test('isArticlePath：只把文章/手记详情当作正文页，列表本身不算', () => {
  assert.equal(isArticlePath('/posts/claude-vm-vps/'), true);
  assert.equal(isArticlePath('/en/posts/claude-vm-vps/'), true);
  assert.equal(isArticlePath('/notes/hello/'), true);
  assert.equal(isArticlePath('/en/notes/hello/'), true);
  assert.equal(isArticlePath('/posts/'), false);
  assert.equal(isArticlePath('/en/posts/'), false);
  assert.equal(isArticlePath('/notes/'), false);
  assert.equal(isArticlePath('/'), false);
  assert.equal(isArticlePath('/en/'), false);
  assert.equal(isArticlePath('/tags/network/'), false);
  assert.equal(isArticlePath('/archive/'), false);
});

test('isSourceMenuPath：首页、文章/手记列表、标签与归档都是可返回的来源菜单', () => {
  for (const p of [
    '/',
    '/en/',
    '/posts/',
    '/en/posts/',
    '/notes/',
    '/en/notes/',
    '/tags/',
    '/en/tags/',
    '/tags/network/',
    '/en/tags/network/',
    '/archive/',
    '/en/archive/',
  ]) {
    assert.equal(isSourceMenuPath(p), true, p);
  }
  assert.equal(isSourceMenuPath('/posts/claude-vm-vps/'), false);
  assert.equal(isSourceMenuPath('/en/posts/claude-vm-vps/'), false);
  assert.equal(isSourceMenuPath('/about/'), false);
  assert.equal(isSourceMenuPath('/en/about/'), false);
});

test('isLangSwitchOfSameArticle：同一 slug 换语言为真，换一篇或去列表为假', () => {
  assert.equal(isLangSwitchOfSameArticle('/posts/claude-vm-vps/', '/en/posts/claude-vm-vps/'), true);
  assert.equal(isLangSwitchOfSameArticle('/en/posts/claude-vm-vps/', '/posts/claude-vm-vps/'), true);
  assert.equal(isLangSwitchOfSameArticle('/notes/hello/', '/en/notes/hello/'), true);
  assert.equal(isLangSwitchOfSameArticle('/posts/claude-vm-vps/', '/posts/other/'), false);
  assert.equal(isLangSwitchOfSameArticle('/posts/claude-vm-vps/', '/en/posts/other/'), false);
  assert.equal(isLangSwitchOfSameArticle('/posts/', '/en/posts/'), false);
  assert.equal(isLangSwitchOfSameArticle('/posts/claude-vm-vps/', '/en/posts/'), false);
  assert.equal(isLangSwitchOfSameArticle('/posts/claude-vm-vps/', '/posts/claude-vm-vps/'), false);
});

test('localizeSourceHref：把来源菜单改到当前语言，并保留查询与 hash', () => {
  assert.equal(localizeSourceHref(from('/posts/'), 'en'), '/en/posts/');
  assert.equal(localizeSourceHref(from('/en/posts/'), 'zh'), '/posts/');
  assert.equal(localizeSourceHref(from('/'), 'en'), '/en/');
  assert.equal(localizeSourceHref(from('/en/'), 'zh'), '/');
  assert.equal(localizeSourceHref(from('/tags/network/'), 'en'), '/en/tags/network/');
  assert.equal(localizeSourceHref(from('/en/tags/network/'), 'zh'), '/tags/network/');
  assert.equal(
    localizeSourceHref(from('/en/posts/', { search: '?from=dock', hash: '#top' }), 'zh'),
    '/posts/?from=dock#top',
  );
  assert.equal(localizeSourceHref(from('/archive/'), 'en'), '/en/archive/');
  assert.equal(localizeSourceHref(from('/notes/'), 'en'), '/en/notes/');
});

test('中文列表进入文章，切换英文后再点返回：回到英文列表，而不是中文文章', () => {
  let state = rememberSourceOnNav(
    fresh(),
    from('/posts/', { scrollY: 320, filterScrollLeft: 40 }),
    '/posts/claude-vm-vps/',
  );
  state = rememberSourceOnNav(state, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  const back = resolveBackTarget({
    currentLang: 'en',
    fallbackHref: '/en/posts/',
    source: state.source,
    canUseHistoryBack: true,
    switchedLang: state.switchedLang,
  });
  assert.equal(state.switchedLang, true);
  assert.equal(back.useHistoryBack, false);
  assert.equal(back.href, '/en/posts/');
  assert.equal(back.scrollY, 320);
  assert.equal(back.filterScrollLeft, 40);
  assert.notEqual(back.href, '/posts/claude-vm-vps/');
  assert.notEqual(back.href, '/en/posts/claude-vm-vps/');
});

test('英文列表进入文章，切换中文后再点返回：回到中文列表，而不是英文文章', () => {
  let state = rememberSourceOnNav(fresh(), from('/en/posts/', { scrollY: 80 }), '/en/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/en/posts/claude-vm-vps/'), '/posts/claude-vm-vps/');
  const back = resolveBackTarget({
    currentLang: 'zh',
    fallbackHref: '/posts/',
    source: state.source,
    canUseHistoryBack: true,
    switchedLang: state.switchedLang,
  });
  assert.equal(back.useHistoryBack, false);
  assert.equal(back.href, '/posts/');
  assert.equal(back.scrollY, 80);
});

test('多次语言切换后，返回仍去当前语言的来源菜单，不会停在另一语言的同一篇', () => {
  let state = rememberSourceOnNav(fresh(), from('/posts/', { scrollY: 16 }), '/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/en/posts/claude-vm-vps/'), '/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  assert.equal(state.switchedLang, true);
  assert.equal(localizeSourceHref(state.source, 'en'), '/en/posts/');
  const back = resolveBackTarget({
    currentLang: 'en',
    fallbackHref: '/en/posts/',
    source: state.source,
    canUseHistoryBack: true,
    switchedLang: state.switchedLang,
  });
  assert.equal(back.useHistoryBack, false);
  assert.equal(back.href, '/en/posts/');
  assert.equal(back.scrollY, 16);
});

test('直接打开永久链接：未切换语言时用列表 fallback；切换语言后仍回当前语言列表，不用 history.back', () => {
  const permalink = rememberSourceOnNav(fresh(), from('/about/'), '/posts/claude-vm-vps/');
  assert.equal(permalink.source, null);
  const direct = resolveBackTarget({
    currentLang: 'zh',
    fallbackHref: '/posts/',
    source: permalink.source,
    canUseHistoryBack: false,
    switchedLang: permalink.switchedLang,
  });
  assert.equal(direct.useHistoryBack, false);
  assert.equal(direct.href, '/posts/');

  const afterSwitch = rememberSourceOnNav(permalink, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  const back = resolveBackTarget({
    currentLang: 'en',
    fallbackHref: '/en/posts/',
    source: afterSwitch.source,
    canUseHistoryBack: true,
    switchedLang: afterSwitch.switchedLang,
  });
  assert.equal(afterSwitch.source, null);
  assert.equal(afterSwitch.switchedLang, true);
  assert.equal(back.useHistoryBack, false);
  assert.equal(back.href, '/en/posts/');
});

test('直接打开英文永久链接再切回中文：fallback 为中文列表', () => {
  let state = rememberSourceOnNav(fresh(), from('/about/'), '/en/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/en/posts/claude-vm-vps/'), '/posts/claude-vm-vps/');
  const back = resolveBackTarget({
    currentLang: 'zh',
    fallbackHref: '/posts/',
    source: state.source,
    canUseHistoryBack: true,
    switchedLang: state.switchedLang,
  });
  assert.equal(back.useHistoryBack, false);
  assert.equal(back.href, '/posts/');
});

test('从未切换语言的站内进入：仍用 history.back，以便恢复原列表滚动', () => {
  const state = rememberSourceOnNav(fresh(), from('/posts/', { scrollY: 200 }), '/posts/claude-vm-vps/');
  const back = resolveBackTarget({
    currentLang: 'zh',
    fallbackHref: '/posts/',
    source: state.source,
    canUseHistoryBack: true,
    switchedLang: state.switchedLang,
  });
  assert.equal(state.switchedLang, false);
  assert.equal(back.useHistoryBack, true);
  assert.equal(back.href, '/posts/');
});

test('来源是首页、标签页或手记列表时，切换语言后的返回落到当前语言的同一类菜单', () => {
  const home = rememberSourceOnNav(fresh(), from('/'), '/posts/claude-vm-vps/');
  const homeEn = rememberSourceOnNav(home, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  assert.equal(
    resolveBackTarget({
      currentLang: 'en',
      fallbackHref: '/en/posts/',
      source: homeEn.source,
      canUseHistoryBack: true,
      switchedLang: homeEn.switchedLang,
    }).href,
    '/en/',
  );

  const tag = rememberSourceOnNav(fresh(), from('/tags/network/', { scrollY: 48 }), '/posts/claude-vm-vps/');
  const tagEn = rememberSourceOnNav(tag, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  const tagBack = resolveBackTarget({
    currentLang: 'en',
    fallbackHref: '/en/posts/',
    source: tagEn.source,
    canUseHistoryBack: true,
    switchedLang: tagEn.switchedLang,
  });
  assert.equal(tagBack.href, '/en/tags/network/');
  assert.equal(tagBack.scrollY, 48);

  const notes = rememberSourceOnNav(fresh(), from('/en/notes/'), '/en/notes/hello/');
  const notesZh = rememberSourceOnNav(notes, from('/en/notes/hello/'), '/notes/hello/');
  assert.equal(
    resolveBackTarget({
      currentLang: 'zh',
      fallbackHref: '/notes/',
      source: notesZh.source,
      canUseHistoryBack: true,
      switchedLang: notesZh.switchedLang,
    }).href,
    '/notes/',
  );

  const archive = rememberSourceOnNav(fresh(), from('/archive/'), '/posts/claude-vm-vps/');
  const archiveEn = rememberSourceOnNav(archive, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  assert.equal(
    resolveBackTarget({
      currentLang: 'en',
      fallbackHref: '/en/posts/',
      source: archiveEn.source,
      canUseHistoryBack: true,
      switchedLang: archiveEn.switchedLang,
    }).href,
    '/en/archive/',
  );
});

test('从上下篇跳到另一篇文章时保留最初的来源菜单；未切换语言时仍可 history.back', () => {
  let state = rememberSourceOnNav(fresh(), from('/posts/', { scrollY: 99 }), '/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/posts/claude-vm-vps/'), '/posts/other/');
  assert.equal(state.switchedLang, false);
  assert.equal(localizeSourceHref(state.source, 'zh'), '/posts/');
  const noSwitch = resolveBackTarget({
    currentLang: 'zh',
    fallbackHref: '/posts/',
    source: state.source,
    canUseHistoryBack: true,
    switchedLang: state.switchedLang,
  });
  assert.equal(noSwitch.useHistoryBack, true);

  state = rememberSourceOnNav(state, from('/posts/other/'), '/en/posts/other/');
  const after = resolveBackTarget({
    currentLang: 'en',
    fallbackHref: '/en/posts/',
    source: state.source,
    canUseHistoryBack: true,
    switchedLang: state.switchedLang,
  });
  assert.equal(after.useHistoryBack, false);
  assert.equal(after.href, '/en/posts/');
  assert.equal(after.scrollY, 99);
});

test('离开文章回到菜单后，来源状态被清空，避免脏数据带到下一篇', () => {
  let state = rememberSourceOnNav(fresh(), from('/posts/'), '/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/posts/claude-vm-vps/'), '/en/posts/claude-vm-vps/');
  state = rememberSourceOnNav(state, from('/en/posts/claude-vm-vps/'), '/en/posts/');
  assert.equal(state.source, null);
  assert.equal(state.switchedLang, false);
});

test('浏览器脚本在全局加载来源记录，文章页返回不再无条件 history.back()', () => {
  const dock = readFileSync(new URL('../src/components/Dock.astro', import.meta.url), 'utf8');
  const article = readFileSync(new URL('../src/scripts/article.ts', import.meta.url), 'utf8');
  const binder = readFileSync(new URL('../src/scripts/back-nav.ts', import.meta.url), 'utf8');
  assert.match(dock, /import\s+['"]\.\.\/scripts\/back-nav['"]/);
  assert.match(binder, /rememberSourceOnNav|resolveBackTarget/);
  assert.match(binder, /data-back/);
  assert.match(binder, /astro:before-preparation/);
  // 语言切换后不得再把返回直接交给 history.back()
  assert.match(article, /to-top|data-to-top/);
  assert.doesNotMatch(article, /history\.back\(/);
});
