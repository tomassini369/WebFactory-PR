import test from 'node:test'
import assert from 'node:assert/strict'
import QRCode from 'qrcode'
import sharp from 'sharp'
import {renderBusinessQr} from './business-qr-image.mjs'
import {createBusinessQrHandler} from '../functions/business-qr.mjs'

test('private business QR renders the exact URL locally with a white quiet zone and optional logo',async()=>{
 const target='https://example.invalid/sites/business-a'
 const png=await renderBusinessQr({target})
 const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true})
 assert.equal(info.width,900);assert.equal(info.height,900)
 const matrix=QRCode.create(target,{errorCorrectionLevel:'Q'}).modules,size=matrix.size,scale=900/(size+8)
 for(let y=0;y<size+8;y++)for(let x=0;x<size+8;x++){
  const pixel=(Math.floor((y+.5)*scale)*900+Math.floor((x+.5)*scale))*info.channels
  const dark=x>=4&&y>=4&&x<size+4&&y<size+4&&matrix.get(y-4,x-4)
  assert.equal(data[pixel],dark?11:255,`QR module ${x},${y}`)
 }
 const logo=await sharp({create:{width:40,height:40,channels:3,background:'#2468a0'}}).png().toBuffer()
 assert.equal((await sharp(await renderBusinessQr({target,logo:'data:image/png;base64,'+logo.toString('base64')})).metadata()).width,900)
 assert.equal((await sharp(await renderBusinessQr({target,logo:'data:image/png;base64,broken'})).metadata()).width,900)
})

test('business QR keeps authentication, tenant lookup and private image responses',async()=>{
 let calls=0,payload
 const handler=createBusinessQrHandler({getSite:async id=>({siteId:id,slug:'tenant-a',business:{},design:{}}),siteAccess:async id=>{assert.equal(id,'a')},render:async value=>{calls++;payload=value;return Buffer.from('png')}})
 const result=await handler(new Request('https://example.invalid/api?siteId=a'))
 assert.equal(result.status,200);assert.match(payload.target,/\/sites\/tenant-a$/);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(result.headers.get('content-type'),'image/png')
 const denied=createBusinessQrHandler({getSite:async()=>({siteId:'a'}),siteAccess:async()=>{throw Object.assign(new Error('Denied'),{status:401})},render:async()=>{calls++}})
 assert.equal((await denied(new Request('https://example.invalid/api?siteId=a'))).status,401);assert.equal(calls,1)
})
