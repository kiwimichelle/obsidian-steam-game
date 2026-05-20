import { App, PluginSettingTab, Setting } from 'obsidian';
import SteamGamePlugin from './main';

export class SteamSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SteamGamePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('steam-settings-wrapper');

    containerEl.createEl('h2', { text: 'Steam 游戏同步库配置' });

    containerEl.createEl('h3', { text: '🔑 接入凭证', cls: 'steam-setting-title' });

    new Setting(containerEl)
      .setName('Steam Web API Key')
      .setDesc('从 Steamworks 免费申请。用于同步私人游戏时长。')
      .addText(text => text
        .setPlaceholder('输入 32 位 API Key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (val) => {
          this.plugin.settings.apiKey = val.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('SteamID64')
      .setDesc('17位纯数字玩家ID。')
      .addText(text => text
        .setPlaceholder('例如：76561198xxxxxxxxx')
        .setValue(this.plugin.settings.steamId)
        .onChange(async (val) => {
          this.plugin.settings.steamId = val.trim();
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: '📂 目录与文件归档', cls: 'steam-setting-title' });

    new Setting(containerEl)
      .setName('游戏笔记根文件夹')
      .setDesc('笔记生成的默认存放目录。')
      .addText(text => text
        .setValue(this.plugin.settings.archiveRoot)
        .onChange(async (val) => {
          this.plugin.settings.archiveRoot = val.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('封面资产保存路径')
      .setDesc('用于脱机离线查看的二进制 JPG 海报保存目录。')
      .addText(text => text
        .setValue(this.plugin.settings.coverPath)
        .onChange(async (val) => {
          this.plugin.settings.coverPath = val.trim();
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: '🔄 时长更新及防冲突策略', cls: 'steam-setting-title' });

    new Setting(containerEl)
      .setName('启动时自动后台更新')
      .setDesc('Obsidian 启动时静默同步库内文件的全部游戏时长（无感更新 YAML）。')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.syncOnStartup)
        .onChange(async (val) => {
          this.plugin.settings.syncOnStartup = val;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('重新手动导入时的覆盖策略')
      .setDesc('本地已有同名同 ID 笔记时的表现。')
      .addDropdown(dropdown => dropdown
        .addOption('ask', '弹窗询问（建议）')
        .addOption('always', '强制覆盖数据')
        .addOption('never', '静默跳过')
        .setValue(this.plugin.settings.overwriteMode)
        .onChange(async (val) => {
          this.plugin.settings.overwriteMode = val as any;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: '📝 文档模板控制', cls: 'steam-setting-title' });

    new Setting(containerEl)
      .setName('数据模板源')
      .setDesc('可直接使用系统预置的精美统计卡片模板。')
      .addDropdown(dropdown => dropdown
        .addOption('default', '内置高密面板样式')
        .addOption('file', '自定义 Markdown 文件')
        .setValue(this.plugin.settings.templateSource)
        .onChange(async (val) => {
          this.plugin.settings.templateSource = val as any;
          this.display(); // 重绘展示
          await this.plugin.saveSettings();
        }));

    if (this.plugin.settings.templateSource === 'file') {
      new Setting(containerEl)
        .setName('自定义模板 .md 路径')
        .addText(text => text
          .setPlaceholder('Templates/SteamTemplate.md')
          .setValue(this.plugin.settings.templateFile)
          .onChange(async (val) => {
            this.plugin.settings.templateFile = val.trim();
            await this.plugin.saveSettings();
          }));
    }
  }
}