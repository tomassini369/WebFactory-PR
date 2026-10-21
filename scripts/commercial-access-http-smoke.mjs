import assert from 'node:assert/strict'
const root=process.env.PREVIEW_URL
assert(root&&/^https:\/\/deploy-preview-\d+--webfactorypr\.netlify\.app$/.test(root),'Only a PR preview is authorized')
for(const name of ['client-admin','client-commerce-admin','client-professional','client-workforce','client-pos-status']){
 const response=await fetch(`${root}/.netlify/functions/${name}?siteId=isolated-unauthenticated-qa`)
 assert.equal(response.status,401,name)
 assert.match(response.headers.get('content-type')||'',/json/)
 assert.equal((await response.json()).ok,false)
 console.log('PASS preview unauthenticated boundary',name)
}
for(const name of ['client-member-access','client-professional','client-commerce-admin','client-workforce']){
 const response=await fetch(`${root}/.netlify/functions/${name}`,{method:'POST',headers:{origin:'https://foreign.example.invalid','Content-Type':'application/json'},body:JSON.stringify({siteId:'isolated-unauthenticated-qa',action:'invite',email:'never-sent@example.invalid'})})
 assert.equal(response.status,403,name)
 console.log('PASS preview CSRF boundary',name)
}
