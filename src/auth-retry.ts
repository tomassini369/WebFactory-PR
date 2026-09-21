const delay=(milliseconds:number)=>new Promise(resolve=>window.setTimeout(resolve,milliseconds))

function retryable(error:unknown){
  const message=error instanceof Error?error.message:String(error||'')
  return error instanceof TypeError||/load failed|failed to fetch|network|timeout|authentication required/i.test(message)
}

export async function withAuthRetry<T>(operation:()=>Promise<T>,attempts=3){
  let lastError:unknown
  for(let attempt=0;attempt<attempts;attempt+=1){
    try{return await operation()}catch(error){
      lastError=error
      if(!retryable(error)||attempt===attempts-1)throw error
      await delay(350*(attempt+1))
    }
  }
  throw lastError
}
