import {test} from 'node:test'
import assert from 'node:assert/strict'
import {colorPalettes,findColorPalette} from '../../shared/color-palettes.mjs'
import {normalizeAppearance} from '../../shared/dashboard-appearance.mjs'

test('every unified palette provides exactly six safe CSS colors',()=>{
 assert.equal(colorPalettes.length,23)
 assert.equal(new Set(colorPalettes.map(p=>p.id)).size,23)
 for(const p of colorPalettes){
  assert.match(p.id,/^[a-z0-9-]+$/)
  assert.equal(p.swatches.length,6,p.name)
  for(const color of p.swatches)assert.match(color,/^#[0-9a-f]{6}$/i)
  for(const color of [p.primary,p.secondary,p.from,p.to])assert.match(color,/^#[0-9a-f]{6}$/i)
  assert.equal(findColorPalette(p.id),p)
  assert.equal(normalizeAppearance({paletteId:p.id}).paletteId,p.id)
 }
 assert.equal(normalizeAppearance({paletteId:'fake-palette'}).paletteId,'')
})

test('original palettes remain compatible with saved kiosk appearances',()=>{
 const old=['navy','sand','forest','berry','copper','mono']
 assert.deepEqual(colorPalettes.slice(0,6).map(p=>p.id),old)
 for(const id of old){
  const p=findColorPalette(id)
  assert.equal(typeof p.primary,'string')
  assert.equal(typeof p.from,'string')
  assert.equal(typeof p.to,'string')
 }
})
