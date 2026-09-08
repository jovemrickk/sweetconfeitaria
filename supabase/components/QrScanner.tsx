'use client';

import { Camera, CameraOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function QrScanner({onResult}:{onResult:(value:string)=>void}) {
  const [active,setActive]=useState(false); const [error,setError]=useState(''); const scanner=useRef<any>(null);
  useEffect(()=>()=>{try{scanner.current?.stop?.()}catch{}},[]);
  const start=async()=>{setError('');try{
    const { Html5Qrcode } = await import('html5-qrcode');
    const s = new Html5Qrcode('qr-reader'); scanner.current=s; setActive(true);
    await s.start({facingMode:'environment'},{fps:10,qrbox:{width:240,height:240}},async(decoded)=>{onResult(decoded);try{await s.stop()}catch{}setActive(false)},()=>{});
  }catch(e:any){setError(e?.message||'Não foi possível abrir a câmera.');setActive(false)}};
  const stop=async()=>{try{await scanner.current?.stop?.()}catch{}setActive(false)};
  return <div className="scannerWrap"><div id="qr-reader" className={active?'active':''}/>{!active&&<button className="scannerPlaceholder" onClick={start}><div><Camera size={30}/></div><strong>Abrir câmera</strong><span>Aponte para o QR Code da NFC-e</span></button>}{active&&<button className="secondary full" onClick={stop}><CameraOff size={17}/> Fechar câmera</button>}{error&&<small className="dangerText">{error}</small>}</div>
}
