import { App, TFile, normalizePath, requestUrl } from 'obsidian';
import { SteamPluginSettings, SteamGameVars } from './types';

export class SteamFileManager {
  constructor(private app: App, private settings: SteamPluginSettings) {}

  /**
   * 规范文件夹路径并确保其在库中真实存在
   */
  async ensureFolder(folderPath: string): Promise<string> {
    const cleanPath = normalizePath(folderPath.trim());
    if (cleanPath && !(await this.app.vault.adapter.exists(cleanPath))) {
      await this.app.vault.createFolder(cleanPath);
    }
    return cleanPath;
  }

  /**
   * 下载封面图片：只在本地没有同名图片时才请求网络。返回纯相对路径。
   */
  async downloadCover(imageUrl: string, appid: number): Promise<string> {
    if (!imageUrl) return '';
    
    try {
      const cleanFolder = await this.ensureFolder(this.settings.coverPath);
      const relativePath = normalizePath(`${cleanFolder}/${appid}.jpg`);

      // 本地缓存检查
      if (await this.app.vault.adapter.exists(relativePath)) {
        return relativePath;
      }

      // 下载二进制数据（避开 CORS 限制）
      const res = await requestUrl({ url: imageUrl, method: 'GET' });
      if (res.status === 200 && res.arrayBuffer) {
        await this.app.vault.createBinary(relativePath, res.arrayBuffer);
        return relativePath;
      }
    } catch (e) {
      console.error(`[File Manager] 下载封面失败 (${imageUrl}):`, e);
    }
    return imageUrl; // 下载失败时降级返回线上网络链接
  }

  /**
   * 保存游戏笔记：安全隔离 YAML 区域，融合并保留用户之前的随笔和文本
   */
  async saveGameNote(vars: SteamGameVars, markdownContent: string, existingFile: TFile | null): Promise<TFile> {
    const cleanFolder = await this.ensureFolder(this.settings.archiveRoot);
    const safeFileName = vars.name.replace(/[\\/:*?"<>|]/g, '-');
    const relativeFilePath = normalizePath(cleanFolder ? `${cleanFolder}/${safeFileName}.md` : `${safeFileName}.md`);

    if (existingFile) {
      // 读取旧内容，并完整切片提取 YAML 以外的笔记随笔
      const currentContent = await this.app.vault.read(existingFile);
      const yamlEndIndex = currentContent.indexOf('\n---', 4);
      
      let userNotes = '';
      if (yamlEndIndex !== -1) {
        userNotes = currentContent.substring(yamlEndIndex + 4).trim();
      }

      const mergedContent = markdownContent.trim() + '\n\n' + userNotes;
      await this.app.vault.modify(existingFile, mergedContent);
      return existingFile;
    } else {
      return await this.app.vault.create(relativeFilePath, markdownContent);
    }
  }

  /**
   * 单点/批量静默刷新：不重写整个文件，采用 Obsidian 官方原子通道仅同步 YAML 内的数据
   */
  async silentUpdatePlaytime(file: TFile, vars: SteamGameVars): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (!frontmatter) return;
      frontmatter['playtime_forever'] = Number(vars.playtime_forever);
      frontmatter['playtime_forever_hours'] = vars.playtime_forever_hours;
      frontmatter['playtime_2weeks_hours'] = vars.playtime_2weeks_hours;
      frontmatter['last_played'] = vars.last_played;
    });
  }

  /**
   * 基于 YAML 识别码在库中检索匹配的笔记文件
   */
  findFileByAppId(appid: number): TFile | null {
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter && String(cache.frontmatter.appid) === String(appid)) {
        return file;
      }
    }
    return null;
  }
}