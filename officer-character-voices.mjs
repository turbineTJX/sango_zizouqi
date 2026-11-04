// Original short dialogue for stable named-officer voice packs.
// Keys follow actual events; ruler replies remain valid if a custom scenario
// makes any of these officers a sovereign.
export const OFFICER_CHARACTER_VOICES={
 cao:{name:'曹操',lines:{
  start:'诸军随我，共定天下！',tactic:'兵贵神速，出击！',order:'诸将听令，依计而行！',heal:'整军再战！',rout:'稳住，休乱军心！',retreat:'收兵，另图良策。',victory:'诸将用命，大事可期！',defeat:'胜败乃常事，再战！',draw:'且收兵，来日再议。',acknowledge:'此事交予我。',march:'兵发敌境！',complete:'此事已成。',discovered:'访得贤才，当以礼迎。',recruit:'愿与诸公共图大事。',scout:'敌情已明，请看此处。'
 },ruler:{acknowledge:'传令，即刻办理。',complete:'办得好，诸位有劳。',discovered:'贤才既至，速请！',scout:'军情已明，传诸将议事。'}},
 'person-636':{name:'刘备',lines:{
  start:'诸位同心，护佑百姓！',tactic:'诸军协力，进兵！',order:'众将各守其位。',heal:'救护伤卒，勿弃一人。',rout:'众将莫慌，有我在！',retreat:'收兵，护住伤卒。',victory:'此胜全赖诸位。',defeat:'整顿兵马，再图大事。',draw:'暂且休兵。',acknowledge:'必不负所托。',march:'将士们，出发！',complete:'所托之事已毕。',discovered:'访得贤士，当诚心相请。',recruit:'愿尽绵力。',scout:'军情已探明。'
 },ruler:{acknowledge:'此事有劳诸位。',complete:'诸位辛苦了。',discovered:'贤士来投，当亲自相迎。',scout:'请诸位共议。'}},
 'person-99':{name:'关羽',lines:{
  start:'关某在此，谁敢阻挡！',tactic:'看刀！',order:'诸军听令，随我破阵！',heal:'休整，再战。',rout:'稳住阵脚！',retreat:'鸣金，收兵！',victory:'敌军已退，整军。',defeat:'此仇，来日必报。',draw:'且待来日。',acknowledge:'关某领命。',march:'随关某进军！',complete:'幸不辱命。',discovered:'访得贤才，请主公定夺。',recruit:'关某愿效此力。',scout:'敌情已明。'
 },ruler:{acknowledge:'即刻办理。',complete:'诸事已毕，有劳。',discovered:'贤士既至，以礼相迎。',scout:'召诸将议事。'}},
 'person-433':{name:'张飞',lines:{
  start:'燕人张飞在此！',tactic:'吃俺一矛！',order:'都随俺冲！',heal:'护住伤兵！',rout:'怕什么，俺在这！',retreat:'都跟俺撤！',victory:'痛快！再来！',defeat:'回头再战！',draw:'先收兵！',acknowledge:'交给俺！',march:'弟兄们，走！',complete:'俺办妥了！',discovered:'俺寻着贤才了！',recruit:'俺便助你一臂之力！',scout:'敌情探明了！'
 },ruler:{acknowledge:'快去办！',complete:'好！办得痛快！',discovered:'贤才来了？快请！',scout:'叫诸将来议事！'}},
 'person-396':{name:'赵云',lines:{
  start:'常山赵子龙在此！',tactic:'随我突阵！',order:'护住两翼，进兵！',heal:'伤卒先退，我来断后！',rout:'有我在，莫慌！',retreat:'诸军先撤，我来断后！',victory:'敌军已退，诸位休整。',defeat:'整军，再战。',draw:'暂且收兵。',acknowledge:'云，领命！',march:'随我出发！',complete:'所托之事已成。',discovered:'访得贤士，请主公相见。',recruit:'愿效犬马之劳。',scout:'军情已探明，请过目。'
 },ruler:{acknowledge:'即刻办理。',complete:'诸位有劳。',discovered:'请贤士入内一叙。',scout:'军情已明，诸将来议。'}},
 'person-290':{name:'诸葛亮',lines:{
  start:'诸军听令，依计进军。',tactic:'东风已至，进兵！',order:'各依所授方略行事。',heal:'休整伤卒，勿乱阵势。',rout:'守住阵脚，勿失方寸。',retreat:'依次退兵，切勿争先。',victory:'诸军用命，方有此胜。',defeat:'暂避其锋，再作筹谋。',draw:'暂且收兵。',acknowledge:'亮，谨领命。',march:'粮秣已备，可以进军。',complete:'主公，此事已成。',discovered:'访得贤才，宜以礼相请。',recruit:'愿尽绵力，以成大业。',scout:'军情在此，请主公过目。'
 },ruler:{acknowledge:'依此方略办理。',complete:'诸事已毕，有劳诸位。',discovered:'贤才既至，请来一叙。',scout:'请诸位共议军情。'}},
 'person-246':{name:'周瑜',lines:{
  start:'江东将士，随我破敌！',tactic:'火攻，就在此时！',order:'诸军听令，合力进击！',heal:'整军待战。',rout:'稳住，我军阵势未乱！',retreat:'收兵，依次退却。',victory:'敌军已破，壮我江东！',defeat:'此战之失，来日必雪。',draw:'今日收兵。',acknowledge:'瑜，自当尽力。',march:'诸军进发！',complete:'此事已成，请主公宽心。',discovered:'访得贤士，可助大业。',recruit:'愿与诸公共成大事。',scout:'敌情已悉。'
 },ruler:{acknowledge:'诸位依计办理。',complete:'诸事已成。',discovered:'请贤士入席。',scout:'敌情既明，即刻议事。'}},
 'person-226':{name:'司马懿',lines:{
  start:'沉住气，待机而动。',tactic:'时机已到。',order:'守住阵势，莫要轻进。',heal:'保存兵力。',rout:'稳住，不可自乱。',retreat:'收兵，不必争此一时。',victory:'此胜尚不足喜。',defeat:'来日，再论胜负。',draw:'暂且收兵。',acknowledge:'此事，我来筹办。',march:'诸军依次进发。',complete:'此事已办妥。',discovered:'得此贤士，宜善加延揽。',recruit:'愿为筹谋。',scout:'敌情如此，容我细察。'
 },ruler:{acknowledge:'依计办理，切莫轻进。',complete:'诸事已毕。',discovered:'将贤士请来。',scout:'诸将来议。'}},
 'person-368':{name:'孙权',lines:{
  start:'江东儿郎，随我出战！',tactic:'乘势进击！',order:'众将协力，守住江东！',heal:'护住伤卒。',rout:'众将莫慌，稳住！',retreat:'收兵，保存实力。',victory:'此胜，当与诸公共贺！',defeat:'整军再战！',draw:'暂且退兵。',acknowledge:'此事自当尽力。',march:'全军进发！',complete:'所托之事已毕。',discovered:'访得贤才，可助江东。',recruit:'愿与诸位同心。',scout:'军情已明。'
 },ruler:{acknowledge:'诸位即刻着手。',complete:'诸位有劳了。',discovered:'速请贤才来见。',scout:'召诸将来议。'}},
 'person-661':{name:'吕布',lines:{
  start:'谁敢与我一战！',tactic:'看我破阵！',order:'诸军随我，杀！',heal:'整军，再战！',rout:'有我在，怕什么！',retreat:'都跟我撤！',victory:'谁能挡我！',defeat:'来日定要雪耻！',draw:'收兵！',acknowledge:'交给我便是！',march:'随我出战！',complete:'这便办妥了！',discovered:'访得贤才了。',recruit:'愿助你破敌！',scout:'敌情探明了！'
 },ruler:{acknowledge:'速去办妥！',complete:'好，诸事已成！',discovered:'贤才既至，快请！',scout:'召诸将来！'}},
 'person-425':{name:'貂蝉',lines:{
  start:'诸位齐心，自可破敌。',tactic:'此计可行。',order:'依计而行，切莫迟疑。',heal:'请先照料伤卒。',rout:'诸位莫慌，稳住阵脚。',retreat:'暂且退兵。',victory:'诸位辛苦了。',defeat:'莫灰心，尚可再图。',draw:'暂且收兵吧。',acknowledge:'妾身领命。',march:'此行当多加谨慎。',complete:'所托之事已成。',discovered:'访得贤士，请以礼相迎。',recruit:'愿尽绵薄之力。',scout:'军情已明，请过目。'
 },ruler:{acknowledge:'此事有劳诸位。',complete:'诸事已毕，辛苦了。',discovered:'请贤士来见。',scout:'请诸位共议。'}},
 'person-376':{name:'孙尚香',lines:{
  start:'众将随我，冲阵！',tactic:'看箭！',order:'莫落后，都随我来！',heal:'先护住伤卒！',rout:'站稳了，不许乱！',retreat:'众将随我撤！',victory:'痛快！此战大胜！',defeat:'来日再较高下！',draw:'今日收兵！',acknowledge:'得令，这便去办！',march:'出发！',complete:'事情办妥了！',discovered:'访得贤才，快请来见！',recruit:'我愿随军效力！',scout:'敌情已明，速作定夺！'
 },ruler:{acknowledge:'即刻去办！',complete:'好，诸位有劳！',discovered:'快请贤才来见！',scout:'诸将即刻来议！'}}
};
