import { requestUrl } from 'obsidian';
import { SteamGameData } from './types';

export class SteamApiClient {
  private static STORE_API = 'https://store.steampowered.com/api/appdetails';
  private static WEB_API = 'https://api.steampowered.com';

  constructor(private apiKey: string, private steamId: string) {}

  /**
   * 抓取游戏商店元数据（强制简体中文，无 CORS 限制）
   */
  async fetchStoreDetails(appid: number): Promise<Partial<SteamGameData> | null> {
    try {
      const url = `${SteamApiClient.STORE_API}?appids=${appid}&l=schinese`;
      const res = await requestUrl({ url, method: 'GET' });

      if (res.status !== 200) return null;

      // 强转为动态索引记录，防止严格模式下报 undefined 错
      const jsonBody = res.json as Record<string, any> | null;
      const rawData = jsonBody?.[String(appid)];
      if (!rawData || !rawData.success) return null;

      const data = rawData.data || {};
      return {
        appid,
        name: String(data.name || '未知游戏'),
        developer: Array.isArray(data.developers) ? data.developers.join(', ') : '未知',
        publisher: Array.isArray(data.publishers) ? data.publishers.join(', ') : '未知',
        releaseDate: String(data.release_date?.date || '未知'),
        shortDescription: String(data.short_description || ''),
        headerImage: String(data.header_image || ''),
        categories: Array.isArray(data.categories) ? data.categories.map((c: any) => String(c?.description || '')) : [],
        genres: Array.isArray(data.genres) ? data.genres.map((g: any) => String(g?.description || '')) : []
      };
    } catch (e) {
      console.error(`[Steam API] 无法拉取 AppID ${appid} 的商店元数据:`, e);
      return null;
    }
  }

  /**
   * 拉取用户所拥有的全部游戏游玩时间列表
   */
  async fetchOwnedGames(): Promise<Record<number, { playtime_forever: number; playtime_2weeks?: number; rtime_last_played: number }> | null> {
    if (!this.apiKey || !this.steamId) return null;

    try {
      const url = `${SteamApiClient.WEB_API}/IPlayerService/GetOwnedGames/v1/?key=${this.apiKey}&steamid=${this.steamId}&format=json&include_played_free_games=true`;
      const res = await requestUrl({ url, method: 'GET' });

      if (res.status !== 200) return null;

      const games = res.json?.response?.games;
      if (!Array.isArray(games)) return null;

      const map: Record<number, { playtime_forever: number; playtime_2weeks?: number; rtime_last_played: number }> = {};
      for (const game of games) {
        if (game && typeof game === 'object' && 'appid' in game) {
          const appId = Number(game.appid);
          map[appId] = {
            playtime_forever: Number(game.playtime_forever || 0),
            playtime_2weeks: Number(game.playtime_2weeks || 0),
            rtime_last_played: Number(game.rtime_last_played || 0)
          };
        }
      }
      return map;
    } catch (e) {
      console.error('[Steam API] 获取用户游戏库信息失败:', e);
      return null;
    }
  }
}