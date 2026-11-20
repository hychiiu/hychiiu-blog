/** 定位配置 API 的固定公开契约；这里仅存常量，不读取任何运行时凭据。 */
export const locationConfig = {
  path: '/api/weather/location-config',
  servicePrefix: '/_AMapService',
  /** 生产域之外（包括 pages.dev / 预览 / www 别名）默认不提供定位配置。 */
  origins: ['https://hychiiu.com', 'https://inbluemoon.com'],
  maxPublicKeyLength: 256,
};
