export default function PortalLoginProgress({label}:{label:string}) {
  return <span className="portal-login-progress" role="status" aria-live="polite"><span className="portal-login-pulse" aria-hidden="true"><i/><i/><i/></span><span>{label}</span></span>
}
