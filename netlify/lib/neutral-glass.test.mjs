import {test} from 'node:test';
import assert from 'node:assert/strict';
import {neutralGlassOpacity,neutralContrast,protectedZoneFill} from '../../shared/neutral-glass.mjs';
test('neutral surfaces enforce a reading floor without mutating legacy stored values',()=>{
 for(const value of [null,undefined,NaN,Infinity,'0.5',-.1,.2,.66,.76])assert.equal(neutralGlassOpacity(value),.82);
 assert.equal(neutralGlassOpacity(.9),.9);assert.equal(neutralGlassOpacity(.96),.96);assert.equal(neutralGlassOpacity(8),1);
});
test('neutral primary and secondary ink meet 4.5 over every gray backdrop at minimum opacity',()=>{
 for(const [base,inks] of [[246,[32,73,81]],[32,[245,222,200]]])for(const ink of inks)for(let bg=0;bg<=255;bg++){
  const surface=base*.82+bg*.18;assert(neutralContrast([ink,ink,ink],[surface,surface,surface])>=4.5,`${base}/${ink}/${bg}`);
 }
});
test('explicit business colors retain their hue and safe ink at both backdrop extremes',()=>{
 for(const color of ['#000000','#ffffff','#112233','#777777','#285fa6','#ffff00','#ff00ff','#00ff00','#808080']){
 const base=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),ink=neutralContrast(base,[255,255,255])>=4.5?'#ffffff':'#000000',text=ink==='#ffffff'?[255,255,255]:[0,0,0];
 const fill=protectedZoneFill(color,ink,.25),values=fill.match(/[\d.]+/g).map(Number),alpha=values[3];assert.deepEqual(values.slice(0,3),base);
 for(const bg of [0,255])assert(neutralContrast(text,base.map(v=>v*alpha+bg*(1-alpha)))>=4.5);
 }
 assert.equal(protectedZoneFill('url(https://bad.invalid)','#fff',.9),'');
});
