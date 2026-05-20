import { Plugin, Notice } from 'obsidian';
import { SteamPluginSettings, SteamGameData } from './types';
import { SteamApiClient } from './api';
import { SteamFileManager } from './fileManager';
import { SteamTemplateEngine } from './template';
import { SteamInputModal, SteamConfirmModal } from './modal';
import { SteamSettingTab } from './settings';

const DEFAULT_SETTINGS: SteamPluginSettings = {
  apiKey: '',
  steamId: '',
  archiveRoot: 'SteamGames',
  coverPath: 'SteamCovers',
  syncOnStartup: false,
  overwriteMode: 'ask',
  templateSource: 'default',
  templateFile: ''
};

export default class SteamGamePlugin extends Plugin {
  settings!: SteamPluginSettings;

  async onload() {
    await this.loadSettings();

    // 1. 手动导入命令
    this.addCommand({
      id: 'import-steam-game-note',
      name: '导入特定 Steam 游戏数据',
      callback: () => {
        new SteamInputModal(this.app, async (appid) => {
          await this.importSingleGame(appid);
        }).open();
      }
    });

    // 2. 手动批量时间同步命令
    this.addCommand({
      id: 'sync-all-steam-playtime',
      name: '全量同步 Steam 游戏游玩时长',
      callback: async () => {
        await this.syncAllGamesPlaytime(false);
      }
    });

    // 3. 挂载设置面板
    this.addSettingTab(new SteamSettingTab(this.app, this));

    // 4. 启动静默同步生命周期
    if (this.settings.syncOnStartup) {
      this.app.workspace.onLayoutReady(() => {
        this.syncAllGamesPlaytime(true);
      });
    }
  }

  onunload() {
    console.log('[Steam Game Library] 插件已卸载');
  }

  /**
   * 业务 A：拉取、下载、解析、渲染并存储单个游戏
   */
  async importSingleGame(appid: number) {
    new Notice('🔍 正在连通 Steam 获取游戏资料...');
    const api = new SteamApiClient(this.settings.apiKey, this.settings.steamId);
    const fileManager = new SteamFileManager(this.app, this.settings);

    try {
      // 同时检索商店和用户游玩时间
      const [storeData, ownedMap] = await Promise.all([
        api.fetchStoreDetails(appid),
        api.fetchOwnedGames()
      ]);

      if (!storeData) {
        new Notice('❌ 获取失败：未能从 Steam 获取有效的游戏信息，请检查 AppID 或网络。');
        return;
      }

      const userStats = ownedMap?.[appid];
      const game: SteamGameData = {
        appid,
        name: storeData.name || '未知游戏',
        developer: storeData.developer || '未知',
        publisher: storeData.publisher || '未知',
        releaseDate: storeData.releaseDate || '未知',
        categories: storeData.categories || [],
        genres: storeData.genres || [],
        shortDescription: storeData.shortDescription || '',
        headerImage: storeData.headerImage || '',
        playtimeForever: userStats?.playtime_forever || 0,
        playtime2Weeks: userStats?.playtime_2weeks || 0,
        lastPlayed: userStats?.rtime_last_played || 0
      };

      const existingFile = fileManager.findFileByAppId(appid);

      const writeData = async () => {
        const coverLocal = await fileManager.downloadCover(game.headerImage, appid);
        const vars = SteamTemplateEngine.cleanToTemplateVars(game, coverLocal);
        const mdText = await SteamTemplateEngine.resolveTemplate(this.app, this.settings, vars);
        const targetFile = await fileManager.saveGameNote(vars, mdText, existingFile);
        
        this.app.workspace.getLeaf(false).openFile(targetFile);
      };

      // 冲突处理
      if (existingFile) {
        if (this.settings.overwriteMode === 'never') {
          new Notice(`⚠️ 笔记已存在，自动跳过：《${game.name}》`);
          return;
        }
        if (this.settings.overwriteMode === 'ask') {
          new SteamConfirmModal(
            this.app,
            '发现同名维基文档',
            `本地已存在《${existingFile.basename}》的笔记。确认要拉取最新元数据覆盖它吗？(注意：你在 YAML 外书写的个人随笔会被安全保留)`,
            async () => { await writeData(); },
            () => { new Notice('已取消操作。'); }
          ).open();
          return;
        }
      }

      await writeData();
    } catch (e) {
      console.error('[Steam Plugin] 导入中遇到异常中断:', e);
      new Notice('❌ 导入中断，请在控制台查看异常报错日志。');
    }
  }

  /**
   * 业务 B：全库游玩统计刷新
   */
  async syncAllGamesPlaytime(isSilent = true) {
    if (!this.settings.apiKey || !this.settings.steamId) {
      if (!isSilent) new Notice('❌ 凭证缺失：请先配置 API Key 和 SteamID64');
      return;
    }

    if (!isSilent) new Notice('🔄 正在同步全库游戏时长中...');

    const api = new SteamApiClient(this.settings.apiKey, this.settings.steamId);
    const fileManager = new SteamFileManager(this.app, this.settings);

    try {
      const ownedMap = await api.fetchOwnedGames();
      if (!ownedMap) {
        if (!isSilent) new Notice('❌ 未能获取游戏库，请检查网络和配置。');
        return;
      }

      const files = this.app.vault.getMarkdownFiles();
      let syncCount = 0;

      for (const file of files) {
        const cache = this.app.metadataCache.getFileCache(file);
        const appid = Number(cache?.frontmatter?.appid);

        if (appid && ownedMap[appid]) {
          const stats = ownedMap[appid];
          const mockData: SteamGameData = {
            appid,
            name: file.basename,
            developer: '', publisher: '', releaseDate: '', categories: [], genres: [], shortDescription: '', headerImage: '',
            playtimeForever: stats.playtime_forever,
            playtime2Weeks: stats.playtime_2weeks || 0,
            lastPlayed: stats.rtime_last_played
          };

          const vars = SteamTemplateEngine.cleanToTemplateVars(mockData, '');
          await fileManager.silentUpdatePlaytime(file, vars);
          syncCount++;
        }
      }

      if (!isSilent) {
        new Notice(`✅ 时长刷新完毕！共安全同步 ${syncCount} 款游戏进度。`);
      } else {
        console.log(`[Steam Plugin] 启动后台静默更新成功，已刷新 ${syncCount} 款游戏。`);
      }
    } catch (e) {
      console.error('[Steam Plugin] 刷新总时长出错:', e);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}