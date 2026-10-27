/** Exercise the same disclosures and controls a portal user sees. */
export async function selectPortalSection(page,name){
 if(await page.locator('.gd-root').count()){
  if(!await page.locator('.gd-navigation').isVisible())await page.locator('.gd-menu-toggle').click();
  const drawer=page.locator('.gd-navigation');await drawer.waitFor({state:'visible'});
  await drawer.getByRole('button',{name,exact:true}).click();return;
 }
 const sidebar=page.locator('.gd-navigation');
 const toggle=page.locator('.ca-mobile-menu-toggle,.wfa-menu-toggle');
 if(!await sidebar.isVisible())await toggle.click();
 const button=sidebar.getByRole('button',{name,exact:true,includeHidden:true});
 if(!await button.isVisible()){
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  const disclosure=button.locator('xpath=ancestor::details[1]');
  if(await disclosure.count()&&!await disclosure.evaluate(el=>el.open))await disclosure.locator(':scope>summary').click();
 }
 await button.click();
}
export async function openPanelTools(panel){
 const menu=panel.locator(':scope>.wf-panel-tools');
 if(!await menu.evaluate(el=>el.open))await menu.locator(':scope>summary').click();
}
export async function showBuilderPreview(page){
 const switcher=page.locator('.wf-builder-view-switch');
 if(await switcher.isVisible()){
  const preview=switcher.getByRole('button',{name:/^(Preview|Vista previa)$/});
  if(await preview.getAttribute('aria-pressed')!=='true')await preview.click();
 }
}
