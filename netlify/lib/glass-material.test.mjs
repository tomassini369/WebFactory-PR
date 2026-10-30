import test from 'node:test';
import assert from 'node:assert/strict';
import {readableGlassMaterial} from '../../shared/glass-material.mjs';
import {colorPalettes} from '../../shared/color-palettes.mjs';
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const lum=c=>c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('all palette glass colors retain their original RGB and readable ink over arbitrary photo brightness',()=>{
 for(const palette of colorPalettes)for(const requested of [.2,.4,.66,.8,.96]){
  const color=palette.swatches[2],m=readableGlassMaterial(color,requested);
  assert.equal(m.color,color);assert(m.alpha>=requested&&m.alpha<=1);
  assert(m.fill.startsWith(`rgba(${rgb(color).join(',')},`),'Glass must not be diluted with a fixed charcoal RGB');
  for(const bg of [0,64,128,192,255])assert(ratio(rgb(m.ink),rgb(color).map(x=>x*m.alpha+bg*(1-m.alpha)))>=4.5,`${palette.name} opacity ${m.alpha}`);
 }
});
test('light and dark presets choose their own ink instead of forcing white on every glass',()=>{
 assert.equal(readableGlassMaterial('#FFFFFF',.2).ink,'#000000');
 assert.equal(readableGlassMaterial('#021024',.2).ink,'#FFFFFF');
});
