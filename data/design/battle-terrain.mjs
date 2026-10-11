// Formal terrain vocabulary; actual layouts live in battle-maps.mjs.
export const BATTLE_TERRAINS=Object.freeze({land:'平原',forest:'林地',hill:'丘陵',marsh:'湿地',river:'河流'});
export const TERRAIN_NAMES=Object.freeze({land:'平地',forest:'林地',hill:'高地',marsh:'湿地',water:'水面',bridge:'桥梁',rock:'山壁'});
export const TERRAIN_HELP=Object.freeze({
 land:'平地适合展开，林带与缓坡可掩护侧翼。',
 forest:'林中火攻与伏弩增强，射击和骑兵冲锋受限；溪流须经桥梁或携船通过。',
 hill:'高地射击与列阵增强，冲锋和行军减慢；山壁不能通行。',
 marsh:'湿地火攻、冲锋和列阵减弱，行军减慢；干堤便于通行，积水需要携船或绕行。',
 river:'携船部队可走水面，陆军沿岸地和桥面行进；水面火攻减弱，涡流增强。',
});
