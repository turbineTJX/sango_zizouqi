import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';
import {stepBattle} from '../engine.mjs';
import {hasStatus} from '../tactics.mjs';
function fire(hp=3000){const x=currentBattle('fire','archer');x.target.x=6;x.rear.x=13;x.u.hp=hp;x.u.battleDamage=3000-hp;readyCurrent(x,'fire');stepBattle(x.b);x.u.cooldown=0;stepBattle(x.b);x.u.cooldown=999;return x;}

test('actual fixed Guo Jia exclusive drains stored intent and saves suppression without a passive denial bonus',()=>{const x=currentBattle('undermine','crossbow');x.target.intent=100;x.rear.intent=0;readyCurrent(x,'undermine');const hp=x.target.hp;stepBattle(x.b);assert.equal(x.u.tacticCasts.undermine,1);assert.ok(x.target.intent<100);assert.equal(x.target.hp,hp);assert.ok(hasStatus(x.b,x.target,'intentSuppression'));resumeCurrent(x);});

test('real curse orb applies bounded despair through an actual basic hit',()=>{const x=currentBattle('curse','halberd');x.target.intent=80;x.rear.x=13;readyCurrent(x,'curse');stepBattle(x.b);assert.equal(x.u.tacticCasts.curse,1);x.u.cooldown=0;stepBattle(x.b);assert.ok(hasStatus(x.b,x.target,'despair'));const intent=x.target.intent;x.u.cooldown=999;stepBattle(x.b);assert.equal(x.target.intent,Math.max(0,intent-5));resumeCurrent(x);});

test('current fire snapshots troop-scaled burn and ticks do not generate intent',()=>{const full=fire(),weak=fire(300);assert.ok(full.target.statuses.burn.amount>weak.target.statuses.burn.amount);const amount=full.target.statuses.burn.amount,own=full.u.intent,enemy=full.target.intent,hp=full.target.hp;full.u.hp=1500;full.u.battleDamage=1500;stepBattle(full.b);assert.equal(full.target.statuses.burn.amount,amount);assert.equal(full.target.hp,hp-amount);assert.equal(full.u.intent,own);assert.equal(full.target.intent,enemy);resumeCurrent(full);});

test('zero-threshold gallop grants current movement and ZOC statuses',()=>{const x=currentBattle('gallop','cavalry');x.target.x=9;x.rear.x=12;x.u.skillReady.gallop=0;stepBattle(x.b);assert.equal(x.u.intent,0);assert.equal(x.u.tacticCasts.gallop,1);assert.ok(hasStatus(x.b,x.u,'haste'));assert.ok(hasStatus(x.b,x.u,'phase'));resumeCurrent(x);});
