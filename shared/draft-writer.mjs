export function createDraftWriter(write,{delay=350,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let timer,latest,pending=false;
 const flush=()=>{clearTimer(timer);timer=undefined;if(!pending)return;pending=false;write(latest);};
 return {schedule(value){latest=value;pending=true;clearTimer(timer);timer=setTimer(flush,delay);},flush,cancel(){clearTimer(timer);timer=undefined;pending=false;}};
}
