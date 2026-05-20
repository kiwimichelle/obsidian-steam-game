import { App, Modal, Setting } from 'obsidian';

/**
 * 导入 AppID 输入视窗
 */
export class SteamInputModal extends Modal {
  private inputVal = '';

  constructor(app: App, private onSubmit: (appid: number) => Promise<void>) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass('steam-modal-container');

    contentEl.createEl('h2', { text: '导入 Steam 游戏元数据', cls: 'steam-modal-title' });
    contentEl.createEl('p', { 
      text: '输入游戏的 AppID，或者直接贴入 Steam 商店的 URL 链接。', 
      cls: 'steam-modal-description' 
    });

    const inputGroup = contentEl.createDiv({ cls: 'steam-input-group' });
    const input = inputGroup.createEl('input', {
      cls: 'steam-input-field',
      attr: { type: 'text', placeholder: '292030 或 完整的商店链接', autofocus: 'true' }
    });

    input.addEventListener('input', () => {
      this.inputVal = input.value.trim();
    });

    const actionRow = contentEl.createDiv({ cls: 'steam-modal-buttons' });
    
    actionRow.createEl('button', { text: '取消' })
      .addEventListener('click', () => this.close());

    const submitBtn = actionRow.createEl('button', { text: '开始导入', cls: 'mod-cta' });
    
    const triggerSubmit = async () => {
      const appid = this.parseAppId(this.inputVal);
      if (appid) {
        this.close();
        await this.onSubmit(appid);
      }
    };

    submitBtn.addEventListener('click', triggerSubmit);
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') triggerSubmit();
    });
  }

  onClose() {
    this.contentEl.empty();
  }

 private parseAppId(val: string): number | null {
    if (/^\d+$/.test(val)) return parseInt(val, 10);
    const match = val.match(/\/app\/(\d+)/);
    
    // 显式进行二次安全检查，绝不让 undefined 漏进 parseInt 
    if (match && typeof match[1] === 'string') {
      return parseInt(match[1], 10);
    }
    return null;
  }
}

/**
 * 覆盖冲突二次确认弹窗
 */
export class SteamConfirmModal extends Modal {
  constructor(
    app: App,
    private titleText: string,
    private messageText: string,
    private onConfirm: () => void,
    private onCancel: () => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass('steam-modal-container');

    contentEl.createEl('h2', { text: this.titleText, cls: 'steam-modal-title' });
    contentEl.createEl('p', { text: this.messageText, cls: 'steam-modal-description' });

    const btnRow = contentEl.createDiv({ cls: 'steam-modal-buttons' });

    const cancelBtn = btnRow.createEl('button', { text: '保留本地随笔' });
    cancelBtn.addEventListener('click', () => {
      this.close();
      this.onCancel();
    });

    const confirmBtn = btnRow.createEl('button', { text: '确认覆盖', cls: 'mod-warning' });
    confirmBtn.addEventListener('click', () => {
      this.close();
      this.onConfirm();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}