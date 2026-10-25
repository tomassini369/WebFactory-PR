export const getUser=async()=>({id:'preview-user',email:'preview@example.invalid'});
export const handleAuthCallback=async()=>null;
export const onAuthChange=()=>()=>{};
export const login=getUser,updateUser=getUser,acceptInvite=getUser;
export const logout=async()=>{},requestPasswordRecovery=async()=>{};
// Visual-review adapters never enable signup or contact the real Identity API.
export const getSettings=async()=>({autoconfirm:false,disableSignup:true,providers:{email:false}});
