import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ISLANDS,LESSONS,TOPICS} from '../src/content.js';
import {GUIDES} from '../src/teaching-content.js';

test('public subject metadata contains only skill descriptions',()=>{
 assert.deepEqual(Object.keys(TOPICS).sort(),['python','sets','web']);
 for(const topic of Object.values(TOPICS)){
  assert.deepEqual(Object.keys(topic).sort(),['focus','note','title']);
  assert.ok(topic.title&&topic.focus&&topic.note);
 }
 for(const island of ISLANDS){
  assert.ok(island.subject);
  assert.equal(Object.hasOwn(island,'course'),false);
  assert.equal(Object.hasOwn(island,'source'),false);
 }
 for(const lesson of LESSONS)assert.equal(Object.hasOwn(lesson,'source'),false);
 for(const guide of Object.values(GUIDES)){
  assert.deepEqual(Object.keys(guide).sort(),['focus','steps']);
  assert.ok(guide.focus.length>20);
 }
});

test('chapter notes are visible descriptions, not hidden bibliography payloads',()=>{
 const html=readFileSync(new URL('../expedition.html',import.meta.url),'utf8');
 assert.match(html,/id="topic-details"/);
 assert.match(html,/Skills in this chapter/);
 assert.doesNotMatch(html,/id="source-details"|id="source-detail"/);
 const renderer=readFileSync(new URL('../src/teaching.js',import.meta.url),'utf8');
 assert.match(renderer,/this\.guide\.focus/);
 assert.doesNotMatch(renderer,/this\.guide\.source/);
});
