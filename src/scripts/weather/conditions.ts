export type WeatherLang = 'zh' | 'en';
export type WeatherIcon = 'sun' | 'moon' | 'cloud' | 'partly' | 'fog' | 'rain' | 'snow' | 'storm' | 'unknown';

/** Official WeatherAPI condition list (weather_conditions.json), prepared offline.
 *  English day/night text is copied from that published list.
 *  Chinese for 1036/1063 uses verified official API lang=zh wording; other zh strings are offline translations of the same official list.
 *  Icons are a complete explicit mapping onto the approved nine-state glyphs. Unknown codes stay unknown, never clear.
 *  Response `icon` numbers are never used.
 */
type Entry = { zhDay: string; zhNight: string; enDay: string; enNight: string; icon: WeatherIcon };
export const weatherApiConditions: Record<number, Entry> = {
  1000: { zhDay: '晴', zhNight: '晴', enDay: 'Sunny', enNight: 'Clear', icon: 'sun' },
  1003: { zhDay: '局部多云', zhNight: '局部多云', enDay: 'Partly cloudy', enNight: 'Partly cloudy', icon: 'partly' },
  1006: { zhDay: '多云', zhNight: '多云', enDay: 'Cloudy', enNight: 'Cloudy', icon: 'cloud' },
  1009: { zhDay: '阴', zhNight: '阴', enDay: 'Overcast', enNight: 'Overcast', icon: 'cloud' },
  1012: { zhDay: '霾', zhNight: '霾', enDay: 'Haze', enNight: 'Haze', icon: 'fog' },
  1015: { zhDay: '尘霾', zhNight: '尘霾', enDay: 'Dust haze', enNight: 'Dust haze', icon: 'fog' },
  1018: { zhDay: '扬沙', zhNight: '扬沙', enDay: 'Blowing dust', enNight: 'Blowing dust', icon: 'fog' },
  1021: { zhDay: '尘暴', zhNight: '尘暴', enDay: 'Dust storm', enNight: 'Dust storm', icon: 'fog' },
  1024: { zhDay: '沙尘暴', zhNight: '沙尘暴', enDay: 'Sandstorm', enNight: 'Sandstorm', icon: 'fog' },
  1027: { zhDay: '强沙尘暴', zhNight: '强沙尘暴', enDay: 'Severe sandstorm', enNight: 'Severe sandstorm', icon: 'fog' },
  1030: { zhDay: '薄雾', zhNight: '薄雾', enDay: 'Mist', enNight: 'Mist', icon: 'fog' },
  1033: { zhDay: '烟', zhNight: '烟', enDay: 'Smoke', enNight: 'Smoke', icon: 'fog' },
  1036: { zhDay: '烟霾', zhNight: '烟霾', enDay: 'Smoky haze', enNight: 'Smoky haze', icon: 'fog' },
  1039: { zhDay: '雾霾', zhNight: '雾霾', enDay: 'Smog', enNight: 'Smog', icon: 'fog' },
  1042: { zhDay: '强雾霾', zhNight: '强雾霾', enDay: 'Severe smog', enNight: 'Severe smog', icon: 'fog' },
  1045: { zhDay: '撒哈拉沙尘', zhNight: '撒哈拉沙尘', enDay: 'Saharan dust', enNight: 'Saharan dust', icon: 'fog' },
  1048: { zhDay: '浮尘', zhNight: '浮尘', enDay: 'Dust', enNight: 'Dust', icon: 'fog' },
  1063: {
    zhDay: '附近局部降雨',
    zhNight: '附近局部降雨',
    enDay: 'Patchy rain possible',
    enNight: 'Patchy rain possible',
    icon: 'rain',
  },
  1066: {
    zhDay: '可能有零星小雪',
    zhNight: '可能有零星小雪',
    enDay: 'Patchy snow possible',
    enNight: 'Patchy snow possible',
    icon: 'snow',
  },
  1069: {
    zhDay: '可能有零星雨夹雪',
    zhNight: '可能有零星雨夹雪',
    enDay: 'Patchy sleet possible',
    enNight: 'Patchy sleet possible',
    icon: 'rain',
  },
  1072: {
    zhDay: '可能有零星冻毛毛雨',
    zhNight: '可能有零星冻毛毛雨',
    enDay: 'Patchy freezing drizzle possible',
    enNight: 'Patchy freezing drizzle possible',
    icon: 'rain',
  },
  1087: {
    zhDay: '可能有雷雨',
    zhNight: '可能有雷雨',
    enDay: 'Thundery outbreaks possible',
    enNight: 'Thundery outbreaks possible',
    icon: 'storm',
  },
  1114: { zhDay: '吹雪', zhNight: '吹雪', enDay: 'Blowing snow', enNight: 'Blowing snow', icon: 'snow' },
  1117: { zhDay: '暴风雪', zhNight: '暴风雪', enDay: 'Blizzard', enNight: 'Blizzard', icon: 'snow' },
  1135: { zhDay: '雾', zhNight: '雾', enDay: 'Fog', enNight: 'Fog', icon: 'fog' },
  1147: { zhDay: '冻雾', zhNight: '冻雾', enDay: 'Freezing fog', enNight: 'Freezing fog', icon: 'fog' },
  1150: {
    zhDay: '零星小毛毛雨',
    zhNight: '零星小毛毛雨',
    enDay: 'Patchy light drizzle',
    enNight: 'Patchy light drizzle',
    icon: 'rain',
  },
  1153: { zhDay: '小毛毛雨', zhNight: '小毛毛雨', enDay: 'Light drizzle', enNight: 'Light drizzle', icon: 'rain' },
  1168: {
    zhDay: '冻毛毛雨',
    zhNight: '冻毛毛雨',
    enDay: 'Freezing drizzle',
    enNight: 'Freezing drizzle',
    icon: 'rain',
  },
  1171: {
    zhDay: '强冻毛毛雨',
    zhNight: '强冻毛毛雨',
    enDay: 'Heavy freezing drizzle',
    enNight: 'Heavy freezing drizzle',
    icon: 'rain',
  },
  1180: {
    zhDay: '零星小雨',
    zhNight: '零星小雨',
    enDay: 'Patchy light rain',
    enNight: 'Patchy light rain',
    icon: 'rain',
  },
  1183: { zhDay: '小雨', zhNight: '小雨', enDay: 'Light rain', enNight: 'Light rain', icon: 'rain' },
  1186: {
    zhDay: '有时中雨',
    zhNight: '有时中雨',
    enDay: 'Moderate rain at times',
    enNight: 'Moderate rain at times',
    icon: 'rain',
  },
  1189: { zhDay: '中雨', zhNight: '中雨', enDay: 'Moderate rain', enNight: 'Moderate rain', icon: 'rain' },
  1192: {
    zhDay: '有时大雨',
    zhNight: '有时大雨',
    enDay: 'Heavy rain at times',
    enNight: 'Heavy rain at times',
    icon: 'rain',
  },
  1195: { zhDay: '大雨', zhNight: '大雨', enDay: 'Heavy rain', enNight: 'Heavy rain', icon: 'rain' },
  1198: {
    zhDay: '小冻雨',
    zhNight: '小冻雨',
    enDay: 'Light freezing rain',
    enNight: 'Light freezing rain',
    icon: 'rain',
  },
  1201: {
    zhDay: '中到大冻雨',
    zhNight: '中到大冻雨',
    enDay: 'Moderate or heavy freezing rain',
    enNight: 'Moderate or heavy freezing rain',
    icon: 'rain',
  },
  1204: { zhDay: '小雨夹雪', zhNight: '小雨夹雪', enDay: 'Light sleet', enNight: 'Light sleet', icon: 'rain' },
  1207: {
    zhDay: '中到大雨夹雪',
    zhNight: '中到大雨夹雪',
    enDay: 'Moderate or heavy sleet',
    enNight: 'Moderate or heavy sleet',
    icon: 'rain',
  },
  1210: {
    zhDay: '零星小雪',
    zhNight: '零星小雪',
    enDay: 'Patchy light snow',
    enNight: 'Patchy light snow',
    icon: 'snow',
  },
  1213: { zhDay: '小雪', zhNight: '小雪', enDay: 'Light snow', enNight: 'Light snow', icon: 'snow' },
  1216: {
    zhDay: '零星中雪',
    zhNight: '零星中雪',
    enDay: 'Patchy moderate snow',
    enNight: 'Patchy moderate snow',
    icon: 'snow',
  },
  1219: { zhDay: '中雪', zhNight: '中雪', enDay: 'Moderate snow', enNight: 'Moderate snow', icon: 'snow' },
  1222: {
    zhDay: '零星大雪',
    zhNight: '零星大雪',
    enDay: 'Patchy heavy snow',
    enNight: 'Patchy heavy snow',
    icon: 'snow',
  },
  1225: { zhDay: '大雪', zhNight: '大雪', enDay: 'Heavy snow', enNight: 'Heavy snow', icon: 'snow' },
  1237: { zhDay: '冰粒', zhNight: '冰粒', enDay: 'Ice pellets', enNight: 'Ice pellets', icon: 'snow' },
  1240: { zhDay: '小阵雨', zhNight: '小阵雨', enDay: 'Light rain shower', enNight: 'Light rain shower', icon: 'rain' },
  1243: {
    zhDay: '中到大阵雨',
    zhNight: '中到大阵雨',
    enDay: 'Moderate or heavy rain shower',
    enNight: 'Moderate or heavy rain shower',
    icon: 'rain',
  },
  1246: {
    zhDay: '强阵雨',
    zhNight: '强阵雨',
    enDay: 'Torrential rain shower',
    enNight: 'Torrential rain shower',
    icon: 'rain',
  },
  1249: {
    zhDay: '小阵雨夹雪',
    zhNight: '小阵雨夹雪',
    enDay: 'Light sleet showers',
    enNight: 'Light sleet showers',
    icon: 'rain',
  },
  1252: {
    zhDay: '中到大阵雨夹雪',
    zhNight: '中到大阵雨夹雪',
    enDay: 'Moderate or heavy sleet showers',
    enNight: 'Moderate or heavy sleet showers',
    icon: 'rain',
  },
  1255: {
    zhDay: '小阵雪',
    zhNight: '小阵雪',
    enDay: 'Light snow showers',
    enNight: 'Light snow showers',
    icon: 'snow',
  },
  1258: {
    zhDay: '中到大阵雪',
    zhNight: '中到大阵雪',
    enDay: 'Moderate or heavy snow showers',
    enNight: 'Moderate or heavy snow showers',
    icon: 'snow',
  },
  1261: {
    zhDay: '小阵冰粒',
    zhNight: '小阵冰粒',
    enDay: 'Light showers of ice pellets',
    enNight: 'Light showers of ice pellets',
    icon: 'snow',
  },
  1264: {
    zhDay: '中到大阵冰粒',
    zhNight: '中到大阵冰粒',
    enDay: 'Moderate or heavy showers of ice pellets',
    enNight: 'Moderate or heavy showers of ice pellets',
    icon: 'snow',
  },
  1273: {
    zhDay: '零星小雷雨',
    zhNight: '零星小雷雨',
    enDay: 'Patchy light rain with thunder',
    enNight: 'Patchy light rain with thunder',
    icon: 'storm',
  },
  1276: {
    zhDay: '中到大雷雨',
    zhNight: '中到大雷雨',
    enDay: 'Moderate or heavy rain with thunder',
    enNight: 'Moderate or heavy rain with thunder',
    icon: 'storm',
  },
  1279: {
    zhDay: '零星小雷雪',
    zhNight: '零星小雷雪',
    enDay: 'Patchy light snow with thunder',
    enNight: 'Patchy light snow with thunder',
    icon: 'storm',
  },
  1282: {
    zhDay: '中到大雷雪',
    zhNight: '中到大雷雪',
    enDay: 'Moderate or heavy snow with thunder',
    enNight: 'Moderate or heavy snow with thunder',
    icon: 'storm',
  },
};

export const officialWeatherApiCodes = Object.keys(weatherApiConditions).map(Number);

export function condition(code: number, lang: WeatherLang, isDay = true) {
  const entry = weatherApiConditions[code];
  if (!entry) return { text: lang === 'zh' ? '天气未知' : 'Unknown conditions', icon: 'unknown' as WeatherIcon };
  const text = lang === 'zh' ? (isDay ? entry.zhDay : entry.zhNight) : isDay ? entry.enDay : entry.enNight;
  const icon = code === 1000 && !isDay ? ('moon' as WeatherIcon) : entry.icon;
  return { text, icon };
}
