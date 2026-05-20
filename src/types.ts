/**
 * 插件全局配置对象
 */
export interface SteamPluginSettings {
  apiKey: string;
  steamId: string;
  archiveRoot: string;
  coverPath: string;
  syncOnStartup: boolean;
  overwriteMode: 'ask' | 'always' | 'never';
  templateSource: 'default' | 'file';
  templateFile: string;
}

/**
 * 清洗整合后的游戏裸数据结构
 */
export interface SteamGameData {
  appid: number;
  name: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  categories: string[];
  genres: string[];
  shortDescription: string;
  headerImage: string;
  playtimeForever: number; // 分钟
  playtime2Weeks: number;  // 分钟
  lastPlayed: number;      // Unix 时间戳
}

/**
 * Markdown 渲染专用的强类型变量集合
 */
export interface SteamTemplateVars {
  appid: string;
  name: string;
  developer: string;
  publisher: string;
  release_date: string;
  categories: string;
  genres: string;
  short_description: string;
  header_image: string;
  local_cover_path: string;
  playtime_forever: string;
  playtime_forever_hours: string;
  playtime_2weeks: string;
  playtime_2weeks_hours: string;
  last_played: string;
  last_played_raw: string;
  today: string;
  steam_url: string;
  [key: string]: string; // 支持用户模板的动态 KV 索引
}

/**
 * ✨ 别名重映射：建立双向桥接
 * 让 fileManager 内部引用的 SteamGameVars 和系统的 SteamTemplateVars 彻底等价
 */
export type SteamGameVars = SteamTemplateVars;