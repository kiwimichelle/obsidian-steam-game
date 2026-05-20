import { App, TFile } from 'obsidian';
import { SteamGameData, SteamTemplateVars, SteamPluginSettings } from './types';

export class SteamTemplateEngine {
  private static DEFAULT_TEMPLATE = `---
appid: {{appid}}
type: game
name: "{{name}}"
developer: "{{developer}}"
publisher: "{{publisher}}"
release_date: "{{release_date}}"
genres: [{{genres}}]
playtime_forever: {{playtime_forever}}
playtime_forever_hours: "{{playtime_forever_hours}}"
playtime_2weeks_hours: "{{playtime_2weeks_hours}}"
last_played: "{{last_played}}"
---

# {{name}}

<div class="steam-game-cover-wrapper">
  <img class="steam-game-cover" src="{{local_cover_path}}" width="400" alt="游戏封面" />
</div>

## 📊 游玩统计
<div class="steam-stats-grid">
  <div class="steam-stat-card">
    <div class="steam-stat-label">累计游玩时间</div>
    <div class="steam-stat-value">{{playtime_forever_hours}} 小时</div>
  </div>
  <div class="steam-stat-card">
    <div class="steam-stat-label">近两周游玩</div>
    <div class="steam-stat-value">{{playtime_2weeks_hours}} 小时</div>
  </div>
  <div class="steam-stat-card">
    <div class="steam-stat-label">最后一次运行</div>
    <div class="steam-stat-value">{{last_played}}</div>
  </div>
</div>

## 🎮 游戏元数据
- **开发商**：{{developer}}
- **发行商**：{{publisher}}
- **发售时间**：{{release_date}}
- **游戏标签**：{{genres}}
- **Steam 页面**：[商店页面]({{steam_url}})

## ✍️ 游玩随笔与日记
`;

  /**
   * 清洗 API 元数据，转化为干净的字符串映射集
   */
  static cleanToTemplateVars(data: SteamGameData, localCoverPath: string): SteamTemplateVars {
    const hoursTotal = (data.playtimeForever / 60).toFixed(1);
    const hours2Weeks = (data.playtime2Weeks / 60).toFixed(1);

    let lastPlayedStr = '从未运行';
    if (data.lastPlayed > 0) {
      const date = new Date(data.lastPlayed * 1000);
      lastPlayedStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return {
      appid: String(data.appid),
      name: data.name,
      developer: data.developer,
      publisher: data.publisher,
      release_date: data.releaseDate,
      categories: data.categories.join(', '),
      genres: data.genres.join(', '),
      short_description: data.shortDescription,
      header_image: data.headerImage,
      local_cover_path: localCoverPath,
      playtime_forever: String(data.playtimeForever),
      playtime_forever_hours: hoursTotal,
      playtime_2weeks: String(data.playtime2Weeks),
      playtime_2weeks_hours: hours2Weeks,
      last_played: lastPlayedStr,
      last_played_raw: String(data.lastPlayed),
      today,
      steam_url: `https://store.steampowered.com/app/${data.appid}/`
    };
  }

  /**
   * Mustache 格式占位符编译替换
   */
  static compile(templateStr: string, vars: SteamTemplateVars): string {
    let result = templateStr;
    for (const key in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, key)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
        result = result.replace(regex, vars[key] ?? '');
      }
    }
    return result;
  }

  /**
   * 读取自定义模板或装载系统默认模板
   */
  static async resolveTemplate(app: App, settings: SteamPluginSettings, vars: SteamTemplateVars): Promise<string> {
    let rawTemplate = SteamTemplateEngine.DEFAULT_TEMPLATE;

    if (settings.templateSource === 'file' && settings.templateFile) {
      const file = app.vault.getAbstractFileByPath(settings.templateFile);
      if (file instanceof TFile) {
        rawTemplate = await app.vault.read(file);
      }
    }
    return SteamTemplateEngine.compile(rawTemplate, vars);
  }
}