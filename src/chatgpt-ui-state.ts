type Lang = 'en' | 'es'

export function canApproveInWebFactory(proposal: {status:string;expiresAt:number;requiresChatConfirmation?:boolean}, now=Date.now()) {
  return proposal.status === 'pending' && proposal.expiresAt > now && !Object.hasOwn(proposal, 'requiresChatConfirmation')
}

export function chatgptError(status:number, message:string | undefined, lang:Lang) {
  if (status === 401) return lang === 'es'
    ? 'Inicia sesión y completa la verificación de seguridad en tu portal; después regresa a esta página.'
    : 'Sign in and complete security verification in your portal, then return to this page.'
  return message || (lang === 'es' ? 'No se pudo completar la solicitud. Intenta de nuevo.' : 'The request could not be completed. Try again.')
}

export function proposalStatus(status:string, lang:Lang) {
  const labels:Record<string,[string,string]> = {
    pending:['Pendiente','Pending'], confirmed:['Confirmada','Confirmed'], processing:['Procesando','Processing'],
    completed:['Completada','Completed'], rejected:['Rechazada','Rejected'], cancelled:['Cancelada','Cancelled'],
    expired:['Expirada','Expired'], failed:['Fallida','Failed'], review_required:['Requiere revisión','Review required'],
  }
  return labels[status]?.[lang === 'es' ? 0 : 1] || status
}
