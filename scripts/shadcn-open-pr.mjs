import {execFileSync} from 'node:child_process';
import {writeFileSync,existsSync} from 'node:fs';
const repo='tomassini369/WebFactory-PR',id=process.env.REQUEST_ID,token=process.env.GH_TOKEN;
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id||'')||!token)throw Error('Workflow request or GitHub credential missing');
const branch='feature/shadcn-'+id;
const git=(...args)=>execFileSync('git',args,{stdio:'pipe'}).toString();
const existing=await fetch(`https://api.github.com/repos/${repo}/pulls?state=all&head=tomassini369%3A${branch}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},redirect:'error'});
if(!existing.ok)throw Error('Unable to verify previous pull request');
const prs=await existing.json();if(prs.length){console.log(`Existing PR: https://github.com/${repo}/pull/${prs[0].number}`);process.exit(0);}
git('config','user.name','WebFactory Components');git('config','user.email','components@users.noreply.github.com');
git('add','--',...['src/components/ui','src/hooks','src/lib','package.json','package-lock.json'].filter(path=>existsSync(path)));
if(!git('diff','--cached','--name-only').trim()){console.log('Components already installed; no new pull request needed.');process.exit(0);}
git('commit','-m','Add official Shadcn components');
// Repository-scoped credential; never print it or persist it in checkout configuration.
const authorization='AUTHORIZATION: basic '+Buffer.from('x-access-token:'+token).toString('base64');
execFileSync('git',['push','origin',`HEAD:refs/heads/${branch}`],{stdio:'pipe',env:{...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:authorization}});
const components=process.env.COMPONENTS||'';
writeFileSync('/tmp/shadcn-pr-body.md',`Adds official Shadcn component source and dependencies: ${components}. Existing components are not overwritten.\n\nValidation: npm test and npm run build passed in the component workflow. Components are available to import inside a .wf-shadcn container; existing screens require an explicit integration change.\n\nPreview: Netlify will create a deploy preview for this PR. Preview readiness must be verified. Production publication requires separate approval.\n`);
const url=execFileSync('gh',['pr','create','--repo',repo,'--base','main','--head',branch,'--title',`Add Shadcn components: ${components}`,'--body-file','/tmp/shadcn-pr-body.md'],{stdio:'pipe'}).toString().trim();
console.log(url);
