/** 配置层入口：组件只从这里（或具体文件）读取配置，不写字面量。说明见 README「配置」。 */
export * from './locales.ts';
export { site } from './site.ts';
export { nav, isNavActive, navPaths, type NavItem } from './nav.ts';
export { social, type SocialLink } from './social.ts';
export { content, systemLabels, taxonomy } from './content.ts';
export { comments, icp, credits } from './integrations.ts';
export { pages } from './deploy.ts';
export { dockMotion } from './motion.ts';
