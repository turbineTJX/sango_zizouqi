import {isAIControlled} from '../player-faction.mjs';
import {residentOfficer} from '../city-personnel.mjs';
import {officerCommitments,currentFactionTask} from './faction-coordination.mjs';
const options=args=>args.at(-1)&&typeof args.at(-1)==='object'&&!Array.isArray(args.at(-1))?args.at(-1):{};
export function actionIntent(name,args){
 const [s,a,b,c]=args,o=options(args),city=id=>s.cities.find(x=>x.id===id),army=id=>s.armies.find(x=>x.id===id);
 let ids=[],cityId=null,target=null,kind=name,faction=o.faction;
 if(['assignDomestic','prepareCityUnits','disbandCityUnits','changeCityTroop','equipCityUnit','prepareDepartureUnits','dispatchScout','appointGovernor'].includes(name))cityId=a;
 if(name==='assignDomestic')ids=[args[3]];
 else if(['dismissDomestic','recallScout','assignDiplomat','dismissDiplomat','transferOfficer'].includes(name))ids=[a];
 else if(['prepareCityUnits','disbandCityUnits','prepareDepartureUnits'].includes(name))ids=b;
 else if(['changeCityTroop','equipCityUnit','dispatchScout','appointGovernor'].includes(name))ids=b?[b]:[];
 else if(name==='recruitLocalUnits'){cityId=a.id;ids=b;}
 else if(name==='launchExpedition'){ids=a.officerIds;cityId=a.cityId;target=a.target;kind='expedition';}
 else if(['orderCampaignArmy','holdCampaignArmy','setArmyMarchMode'].includes(name)){const x=army(a);ids=x?.units.map(u=>u.id)||[];faction=x?.faction;cityId=x?.location;target=b;kind=name==='orderCampaignArmy'?'march':name==='holdCampaignArmy'?'hold':'marchMode';}
 else if(name==='startDomesticAction'){ids=[a.officerId];cityId=a.cityId;faction=city(cityId)?.owner;}
 else if(name==='applyMilitaryFlow'){const x=army(a.armyId);ids=x?.units.map(u=>u.id)||[];faction=x?.faction;cityId=x?.location;}
 else if(name==='grantTreasure')ids=[b];else if(name==='equipTreasure')ids=[a];
 if(name==='transferOfficer'){kind='transfer';target=b;}
 if(name==='dispatchScout'){kind='scout';target=c;}
 if(name==='assignDomestic')kind='assign';if(name==='appointGovernor')kind='governor';
 if(name==='declareDiplomaticWar')faction=a;
 ids=[...new Set((ids||[]).filter(Boolean))];const resident=ids.length&&residentOfficer(s,ids[0]);
 faction??=city(cityId)?.owner||resident?.faction;cityId??=resident?.location||null;
 return {name,kind,officerIds:ids,faction:faction||null,cityId,target:typeof target==='string'?target:null,direction:name==='assignDomestic'?b:null};
}
export function ownershipError(s,intent){
 if(!intent.faction||!isAIControlled(s,intent.faction))return null;
 // Compatible maintenance does not acquire ownership. Actual payments and
 // quotas remain exclusively in the unchanged shared operation.
 if(['recruitLocalUnits','changeCityTroop','equipCityUnit','grantTreasure','equipTreasure','storeTreasure','setArmyMarchMode'].includes(intent.name))return null;
 const owner=currentFactionTask(s);
 for(const id of intent.officerIds)for(const row of officerCommitments(s,id)){
  if(row.faction!==intent.faction)continue;const p=row.owner;
  if(owner===p){
   if(row.kind==='capture'&&['expedition','march'].includes(intent.kind)&&[p.target,p.staging].includes(intent.target))continue;
   if(row.kind==='staffing'&&intent.kind==='assign'&&intent.cityId===p.cityId&&intent.direction===p.direction)continue;
   if(row.kind==='concentration'&&intent.kind==='transfer'&&intent.target===p.staging)continue;
   if(row.kind==='frontline'&&intent.name==='prepareCityUnits'&&intent.cityId===p.cityId)continue;
   if(row.kind==='support'&&intent.kind==='march'&&(intent.target===p.target||s.cities.some(c=>c.id===intent.target&&c.owner===p.faction)))continue;
  }
  if(row.kind==='staffing'&&intent.name==='startDomesticAction'&&intent.cityId===p.cityId)continue;
  return '执行人已有势力任务承诺，须由协调器明确交接后改派';
 }
 return null;
}
