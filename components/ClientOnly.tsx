"use client";
import { useEffect, useState } from "react";
export function ClientOnly({children}:{children:React.ReactNode}){const[ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);return ready?<>{children}</>:null}
