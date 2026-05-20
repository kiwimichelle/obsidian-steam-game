import { SteamPluginSettings } from './types';

export const DEFAULT_SETTINGS: SteamPluginSettings = {
  apiKey: '',
  steamId: '',
  archiveRoot: 'SteamGames',
  coverPath: 'SteamGames/_covers',
  templateSource: 'default',
  templateFile: '',
  overwriteMode: 'ask',
  syncOnStartup: true, // 默认开启启动自动同步时长，体验更无缝
};