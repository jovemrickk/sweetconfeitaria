'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Cloud, LockKeyhole, Mail, LogIn, UserPlus } from 'lucide-react';

export default function CloudLogin({
  signIn,
  signUp,
  error,
}: {
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  error: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (mode: 'login' | 'signup') => {
    if (!email || password.length < 6) {
      setMessage('Informe um e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setBusy(true);
    setMessage('');
    const ok = mode === 'login' ? await signIn(email, password) : await signUp(email, password);
    if (mode === 'signup' && ok) {
      setMessage('Conta criada. Se o Supabase pedir confirmação por e-mail, confirme e depois entre.');
    }
    setBusy(false);
  };

  return (
    <main className="cloudLoginPage">
      <section className="cloudLoginCard">
        <div className="cloudLoginBrand">
          <Image src="/logo.png" width={112} height={112} alt="Confeitaria Sweet" priority />
          <div>
            <span className="softTag"><Cloud size={14}/> Nuvem Sweet</span>
            <h1>CONFEITARIA SWEET</h1>
            <p>Entre para sincronizar pedidos, estoque, compras e financeiro em todos os aparelhos.</p>
          </div>
        </div>

        <label className="cloudField">
          <span><Mail size={16}/> E-mail</span>
          <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sweet@exemplo.com" />
        </label>
        <label className="cloudField">
          <span><LockKeyhole size={16}/> Senha</span>
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </label>

        {(error || message) && <div className={`cloudMessage ${error ? 'error' : ''}`}>{error || message}</div>}

        <button className="primary full" disabled={busy} onClick={() => submit('login')}>
          <LogIn size={18}/> {busy ? 'Entrando...' : 'Entrar'}
        </button>
        <button className="secondary full" disabled={busy} onClick={() => submit('signup')}>
          <UserPlus size={18}/> Criar conta da confeitaria
        </button>

        <small className="cloudHint">Para usar os mesmos dados no seu celular e no celular da confeiteira, entrem com a mesma conta nesta primeira versão.</small>
      </section>
    </main>
  );
}
