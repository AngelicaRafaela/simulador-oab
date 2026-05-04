import type { Question, Simulation } from "@/lib/types";
const QUESTIONS_KEY="simulador-oab:questions"; const SIMULATIONS_KEY="simulador-oab:simulations";
function safeParse<T>(raw:string|null,fallback:T):T{ if(!raw)return fallback; try{return JSON.parse(raw) as T}catch{return fallback}}
export function getQuestions():Question[]{ if(typeof window==="undefined")return[]; return safeParse<Question[]>(localStorage.getItem(QUESTIONS_KEY),[]) }
export function saveQuestions(questions:Question[]){ localStorage.setItem(QUESTIONS_KEY,JSON.stringify(questions)); window.dispatchEvent(new Event("oab-storage-change"))}
export function getSimulations():Simulation[]{ if(typeof window==="undefined")return[]; return safeParse<Simulation[]>(localStorage.getItem(SIMULATIONS_KEY),[]) }
export function saveSimulations(simulations:Simulation[]){ localStorage.setItem(SIMULATIONS_KEY,JSON.stringify(simulations)); window.dispatchEvent(new Event("oab-storage-change"))}
export function clearAllData(){ localStorage.removeItem(QUESTIONS_KEY); localStorage.removeItem(SIMULATIONS_KEY); window.dispatchEvent(new Event("oab-storage-change"))}
