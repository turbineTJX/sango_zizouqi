import {customBattleMarkup,defaultCustomBattle} from './custom-battle.mjs';
import {historicalBattleLibrary} from './historical-battle-library.mjs';

export function modeLobby() {
  return `<main class="campaign-lobby mode-lobby">
    <header class="lobby-nav"><a class="lobby-brand" href="#" data-action="lobby"><span>君</span>三国 · 君临</a><button class="text-button" data-action="settings">设置</button></header>
    <div class="lobby-start">
    <section class="lobby-hero"><div class="lobby-hero-copy"><div class="eyebrow">汉末风云 · 君临天下</div><h1>逐鹿天下<br><em>从此启程</em></h1></div><div class="lobby-art" aria-hidden="true"><div class="lobby-moon"></div><div class="lobby-mountain mountain-back"></div><div class="lobby-mountain mountain-front"></div><div class="war-banner banner-one">魏</div><div class="war-banner banner-two">蜀</div><div class="war-banner banner-three">吴</div><span class="art-caption">江山如画 · 群雄逐鹿</span></div></section>
    <nav class="mode-selection main-menu" aria-label="游戏主菜单">
      <button class="button secondary" data-action="strategy">普通模式</button>
      <button class="button secondary" data-action="campaign-lobby">战役模式</button>
      <button class="button secondary" data-action="officer-editor">武将编辑</button>
      <button class="button secondary" data-action="scenario-editor">剧本编辑</button>
      <button class="button secondary" data-action="treasure-editor">宝物编辑</button>
      <button class="button secondary" data-action="load">读取存档</button>
      <button class="button secondary" data-action="exit-game">退出游戏</button>
    </nav></div>
  </main>`;
}

export function campaignLobby(selectedId, resume, customDraft=defaultCustomBattle(),showCustom=false,mapLibrary) {
 return `<main class="campaign-lobby custom-workspace"><header class="lobby-nav"><a class="lobby-brand" href="#" data-action="lobby"><span>君</span>三国 · 君临</a><button class="button secondary" data-action="officer-editor">武将编辑器</button><button class="button secondary" data-action="battle-map-editor">地图编辑器</button><button class="button secondary" data-action="treasure-editor">宝物编辑器</button><button class="button secondary" data-action="lobby">返回</button></header>${resume?`<section class="lobby-resume"><b>${resume.name}</b><button class="button secondary" data-action="continue-history" ${resume.invalid?'disabled':''}>${resume.invalid?'重新开始':resume.finished?'查看战报':'继续战役'}</button></section>`:''}${historicalBattleLibrary()}${customBattleMarkup(customDraft,mapLibrary)}</main>`;
}
