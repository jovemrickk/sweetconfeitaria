'use client';

import { Camera, CameraOff, ImagePlus, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

function cameraErrorMessage(error: any) {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');

  if (name === 'NotAllowedError' || /permission|notallowed/i.test(message)) {
    return 'A câmera está bloqueada para este site. No iPhone, abra no Safari e permita Câmera nas configurações do site.';
  }
  if (name === 'NotFoundError' || /not found|no camera/i.test(message)) {
    return 'Não encontrei uma câmera disponível neste aparelho.';
  }
  if (name === 'NotReadableError' || /could not start video|notreadable/i.test(message)) {
    return 'A câmera está sendo usada por outro app. Feche a câmera/Instagram/WhatsApp e tente novamente.';
  }
  if (/secure|https|insecure/i.test(message)) {
    return 'O leitor de câmera só funciona em HTTPS. Abra o site publicado na Vercel, não uma URL HTTP da rede local.';
  }
  return message || 'Não foi possível abrir a câmera.';
}

export default function QrScanner({onResult}:{onResult:(value:string)=>void}) {
  const [active,setActive]=useState(false);
  const [starting,setStarting]=useState(false);
  const [error,setError]=useState('');
  const scanner=useRef<any>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const readerId='sweet-nfce-qr-reader';

  const dispose=async()=>{
    const current=scanner.current;
    scanner.current=null;
    if(!current)return;
    try{await current.stop?.()}catch{}
    try{await current.clear?.()}catch{}
  };

  useEffect(()=>()=>{void dispose()},[]);

  const start=async()=>{
    if(starting||active)return;
    setError('');

    if(typeof window!=='undefined'&&!window.isSecureContext&&window.location.hostname!=='localhost'){
      setError('O leitor de câmera precisa de HTTPS. Abra a versão publicada do site.');
      return;
    }
    if(typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia){
      setError('Este navegador não liberou acesso à câmera. Tente abrir o site diretamente no Safari ou Chrome.');
      return;
    }

    setStarting(true);
    setActive(true);

    try{
      // O leitor precisa estar VISÍVEL antes de medir o tamanho do vídeo/qrbox.
      // Sem este frame, no mobile o React ainda deixava #qr-reader com display:none.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));

      const { Html5Qrcode } = await import('html5-qrcode');
      await dispose();
      const s = new Html5Qrcode(readerId, {verbose:false});
      scanner.current=s;

      const config:any={
        fps:12,
        aspectRatio:1.333334,
        qrbox:(viewfinderWidth:number,viewfinderHeight:number)=>{
          const edge=Math.max(180,Math.min(280,Math.floor(Math.min(viewfinderWidth,viewfinderHeight)*0.72)));
          return {width:edge,height:edge};
        },
      };

      const success=async(decoded:string)=>{
        if(!decoded)return;
        onResult(decoded);
        await dispose();
        setActive(false);
      };

      // Não usamos facingMode aqui. Em algumas combinações de Safari/iOS +
      // html5-qrcode 2.3.8 ele pode chegar à biblioteca como um objeto inválido.
      // getCameras() pede a permissão e nos dá um deviceId real; iniciar pelo id
      // é o caminho recomendado e elimina de vez o erro de facingMode.
      const cameras=await Html5Qrcode.getCameras();
      if(!cameras.length)throw new Error('Nenhuma câmera disponível neste aparelho.');
      const preferred=[...cameras].reverse().find(c=>/back|rear|traseira|environment|wide|0\.5x|1x/i.test(c.label||''))
        || cameras[cameras.length-1];
      await s.start(preferred.id,config,success,()=>{});
    }catch(e:any){
      await dispose();
      setActive(false);
      setError(cameraErrorMessage(e));
    }finally{
      setStarting(false);
    }
  };

  const stop=async()=>{
    await dispose();
    setStarting(false);
    setActive(false);
  };

  const scanImage=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setError('');
    await dispose();
    setActive(false);
    setStarting(true);
    try{
      const { Html5Qrcode }=await import('html5-qrcode');
      const s=new Html5Qrcode(readerId,{verbose:false});
      scanner.current=s;
      // O elemento também precisa estar renderizado para leitura de arquivo.
      setActive(true);
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      const decoded=await s.scanFile(file,true);
      onResult(decoded);
      await dispose();
      setActive(false);
    }catch(e:any){
      await dispose();
      setActive(false);
      setError(e?.message?'Não consegui encontrar um QR Code nessa imagem. Tente uma foto mais nítida.':'Não consegui ler o QR Code da imagem.');
    }finally{
      setStarting(false);
    }
  };

  return <div className="scannerWrap">
    <div id={readerId} className={active?'active':''}/>
    {!active&&<div className="scannerActions">
      <button className="scannerPlaceholder" onClick={start} disabled={starting}>
        <div>{starting?<LoaderCircle className="spinIcon" size={30}/>:<Camera size={30}/>}</div>
        <strong>{starting?'Abrindo câmera...':'Abrir câmera'}</strong>
        <span>Aponte para o QR Code da NFC-e</span>
      </button>
      <button className="secondary full" type="button" onClick={()=>fileInput.current?.click()} disabled={starting}>
        <ImagePlus size={17}/> Ler QR de uma foto
      </button>
      <input ref={fileInput} hidden type="file" accept="image/*" onChange={scanImage}/>
    </div>}
    {active&&<button className="secondary full" type="button" onClick={stop}><CameraOff size={17}/> Fechar câmera</button>}
    {error&&<small className="dangerText scannerError">{error}</small>}
  </div>
}
