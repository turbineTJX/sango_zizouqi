import {customBattleMarkup,defaultCustomBattle} from './custom-battle.mjs';
import {historicalBattleLibrary} from './historical-battle-library.mjs';

export function modeLobby() {
  return `<main class="campaign-lobby mode-lobby">
    <header class="lobby-nav"><a class="lobby-brand" href="#" data-action="lobby"><span>君</span>三国 · 君临</a><span class="lobby-edition">选择模式</span><button class="text-button" data-action="settings">设置</button></header>
    <section class="lobby-hero"><div class="lobby-hero-copy"><div class="eyebrow">汉末风云 · 君临天下</div><h1>逐鹿天下<br><em>从此启程</em></h1></div><div class="lobby-art" aria-hidden="true"><div class="lobby-moon"></div><div class="lobby-mountain mountain-back"></div><div class="lobby-mountain mountain-front"></div><div class="war-banner banner-one">魏</div><div class="war-banner banner-two">蜀</div><div class="war-banner banner-three">吴</div><span class="art-caption">江山如画 · 群雄逐鹿</span></div></section>
    <section class="mode-selection" aria-label="选择游戏模式">
      <button class="mode-card" data-action="strategy"><span class="eyebrow">经营 · 行军 · 征战</span><h2>普通模式</h2><span class="mode-enter">选择剧本 →</span></button>
      <button class="mode-card" data-action="campaign-lobby"><span class="eyebrow">编制 · 布阵 · 对战</span><h2>战役模式</h2><span class="mode-enter">选择战役 →</span></button>
    </section><footer class="lobby-footer"><div><button class="button primary" data-action="load">读取存档</button><button class="text-button" data-action="scenarios">自定义</button></div></footer>
  </main>`;
}

export function campaignLobby(selectedId, resume, customDraft=defaultCustomBattle(),showCustom=false,mapLibrary) {
 return `<main class="campaign-lobby custom-workspace"><header class="lobby-nav"><a class="lobby-brand" href="#" data-action="lobby"><span>君</span>三国 · 君临</a><button class="button secondary" data-action="battle-map-editor">地图编辑器</button><button class="button secondary" data-action="lobby">返回</button></header>${resume?`<section class="lobby-resume"><b>${resume.name}</b><button class="button secondary" data-action="continue-history" ${resume.invalid?'disabled':''}>${resume.invalid?'重新开始':resume.finished?'查看战报':'继续战役'}</button></section>`:''}${historicalBattleLibrary()}${customBattleMarkup(customDraft,mapLibrary)}</main>`;
}
