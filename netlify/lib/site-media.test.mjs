import assert from 'node:assert/strict';
import test from 'node:test';
import {businessSocialLinks, normalizeSocialLinks} from '../../shared/social-links.mjs';
import {normalizeSiteMusic, publicSiteMusic} from '../../shared/site-music.mjs';
import {musicResponse} from '../functions/client-asset.mjs';

test('social links retain legacy handles, explicit removal and verified HTTPS destinations', () => {
  const legacy={instagram:'@artist',x:'https://twitter.com/artist',whatsapp:'1 (787) 555-0199'};
  assert.deepEqual(businessSocialLinks(legacy).map(link=>link.id),['instagram','x','whatsapp']);
  assert.deepEqual(businessSocialLinks({...legacy,socialLinks:[]}),[]);
  assert.deepEqual(normalizeSocialLinks([
    {id:'instagram',url:'https://instagram.com.evil.invalid/artist'},
    {id:'x',url:'javascript:alert(1)'},
    {id:'youtube',url:'https://user@youtube.com/artist'},
    {id:'youtube',url:'https://youtu.be/example'},
  ]),[{id:'youtube',url:'https://youtu.be/example'}]);
});

test('music settings cannot attach another tenant asset and publish only for eligible templates', () => {
  const key='sites/one/music/12345678-1234-1234-1234-123456789012.mp3';
  const music={autoplay:true,welcomeId:'foreign',tracks:[
    {id:'foreign',title:'Foreign',audioKey:key.replace('/one/','/two/')},
    {id:'song',title:'  Original  ',audioKey:key,coverKey:'sites/two/cover.png'},
    {id:'duplicate',title:'Duplicate',audioKey:key},
  ]};
  assert.deepEqual(normalizeSiteMusic(music,'one'),{autoplay:true,welcomeId:'song',tracks:[{id:'song',title:'Original',audioKey:key,coverKey:''}]});
  const site={siteId:'one',music};
  assert.equal(publicSiteMusic({...site,design:{templateSlug:'northline-barber'}}).tracks.length,0);
  for(const templateSlug of ['sonido-vivo-artist','pulse-dj-services']){
    const published=publicSiteMusic({...site,design:{templateSlug}});
    assert.equal(published.tracks[0].coverUrl,'');
    assert.match(published.tracks[0].audioUrl,/client-asset\?siteId=one/);
  }
});

test('audio supports iPhone range probes, seeking and private caching',async()=>{
  const bytes=new Uint8Array([0,1,2,3,4,5]).buffer;
  const probe=musicResponse(bytes,'bytes=0-1',false);
  assert.equal(probe.status,206);
  assert.equal(probe.headers.get('content-range'),'bytes 0-1/6');
  assert.equal(probe.headers.get('cache-control'),'private, no-store');
  assert.deepEqual([...new Uint8Array(await probe.arrayBuffer())],[0,1]);
  assert.equal(musicResponse(bytes,'bytes=6-',true).status,416);
  assert.equal(musicResponse(bytes,'bytes=-2',true).headers.get('content-range'),'bytes 4-5/6');
});

test('team photos accept only uploaded images from the same business and expose active profiles', async () => {
  const { validateTeamPhotos } = await import('../functions/client-admin.mjs');
  const { publicClientSite } = await import('./client-store.mjs');
  const key = 'sites/one/team/01234567-0123-4567-89ab-0123456789ab.webp';
  const site = {siteId:'one',settings:{teamBookingEnabled:true},employees:[]};
  const member = {id:'artist',name:'Artist',photoAssetKey:key};
  await validateTeamPhotos(site,[member],async () => ({metadata:{contentType:'image/webp'}}));
  await assert.rejects(validateTeamPhotos(site,[member],async () => null),{status:400});
  await assert.rejects(validateTeamPhotos(site,[{...member,photoAssetKey:key.replace('/one/','/two/')}]),{status:403});
  const view = publicClientSite({...site,employees:[member,{...member,id:'inactive',active:false}]});
  assert.equal(view.employees.length,1);
  assert.match(view.employees[0].photoUrl,/client-asset\?siteId=one/);
  assert.equal(view.employees[0].photoAssetKey,undefined);
  assert.equal(publicClientSite({...site,employees:[{...member,photoAssetKey:''}]}).employees[0].photoUrl,'');
});
