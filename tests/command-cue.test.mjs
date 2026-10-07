import test from 'node:test';
import assert from 'node:assert/strict';
import {CommandCue} from '../command-cue.mjs';

test('full gauge announces once, stays quiet while held, and re-arms after spending',()=>{
  const cue=new CommandCue(),battle={};
  assert.equal(cue.update(battle,false),false);
  assert.equal(cue.update(battle,true),true);
  for(let i=0;i<10;i++)assert.equal(cue.update(battle,true),false);
  assert.equal(cue.update(battle,false),false);
  assert.equal(cue.update(battle,true),true);
});

test('restored ready battle and a new battle each get their own announcement',()=>{
  const cue=new CommandCue(),first={id:'same-id'},retry={id:'same-id'};
  assert.equal(cue.update(first,true),true);
  assert.equal(cue.update(retry,true),true);
  assert.equal(cue.update(retry,true),false);
});
