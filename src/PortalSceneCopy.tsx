export default function PortalSceneCopy({ lang }: { lang: 'es' | 'en' }) {
  return <aside className="wf-portal-scene-copy"><small>WEBFACTORY PR</small><h2>{lang === 'es' ? <>Tu negocio.<br />En tus manos.</> : <>Your business.<br />In your hands.</>}</h2><p>{lang === 'es' ? 'Un espacio para administrar, crear y seguir creciendo.' : 'A space to manage, create and keep growing.'}</p></aside>
}
