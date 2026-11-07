export async function openAppearanceDetails(page,scope){
 for(let i=0;i<12;i++){
  const summaries=page.locator(scope+' details:not([open]) > summary');let opened=false;
  for(const summary of await summaries.all())if(await summary.isVisible()){await summary.click();opened=true;break}
  if(!opened)break;
 }
}
