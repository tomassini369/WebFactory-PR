import {availableCourses,type TrainingScope} from './curriculum'
export type TrainingProgress = {version:1;completed:string[];attempts?:Record<string,{step:number;snapshot?:any}|undefined>;active?:{courseId:string;step:number;snapshot?:any};updatedAt?:string}
export const progressKey=(scope:TrainingScope)=>`wf-training:v1:${encodeURIComponent(scope.siteId)}:${encodeURIComponent(scope.userId)}:${encodeURIComponent(scope.role)}`
export function loadProgress(scope:TrainingScope):TrainingProgress{
 try{
  const raw=localStorage.getItem(progressKey(scope))
  if(!raw||raw.length>400000)return {version:1,completed:[]}
  const saved=JSON.parse(raw),courses=availableCourses(scope)
  if(saved.version!==1||!Array.isArray(saved.completed))return {version:1,completed:[]}
  const completed=courses.filter(course=>saved.completed.includes(course.id)).map(course=>course.id)
  const course=courses.find(course=>course.id===saved.active?.courseId)
  const active=course&&Number.isInteger(saved.active.step)&&saved.active.step>=0&&saved.active.step<=course.steps.length?{courseId:course.id,step:saved.active.step,snapshot:saved.active.snapshot}:undefined
  const attempts=Object.fromEntries(courses.flatMap(course=>{const attempt=saved.attempts?.[course.id];return attempt&&Number.isInteger(attempt.step)&&attempt.step>=0&&attempt.step<=course.steps.length?[[course.id,{step:attempt.step,snapshot:attempt.snapshot}]]:[]}))
  return {version:1,completed,active,attempts,updatedAt:typeof saved.updatedAt==='string'?saved.updatedAt:undefined}
 }catch{return {version:1,completed:[]}}
}
export function saveProgress(scope:TrainingScope,progress:TrainingProgress):boolean{
 try{localStorage.setItem(progressKey(scope),JSON.stringify({...progress,version:1,updatedAt:new Date().toISOString()}));return true}catch{return false}
}
