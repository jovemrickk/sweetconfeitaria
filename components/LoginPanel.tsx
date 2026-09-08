'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Cloud, LogIn, UserPlus } from 'lucide-react';

type Props = {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
};

export default function LoginPanel({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setBusy(false);
      setError('Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    if (mode === 'login') {
      const result = await onSignIn(email.trim(), password);
      if (result.error) setError(result.error);
    } else {
      const result = await onSignUp(email.trim(), password);
      if (result.error) setError(result.error);
      else if (result.needsConfirmation) {
        setMessage('Conta criada. Confirme o e-mail e depois volte para entrar.');
        setMode('login');
      }
    }

    setBusy(false);
  };

  return (
    <main className="authScreen">
      <section className="authCard">
        <Image src="/icon-192.png" alt="Confeitaria Sweet" width={92} height={92} priority />
        <div className="authHeading">
          <span className="softTag"><Cloud size={14}/> Nuvem da confeitaria</span>
          <h1>CONFEITARIA SWEET</h1>
          <p>Entre com a mesma conta no seu celular, no celular dela e no PC para ver os mesmos dados.</p>
        </div>

        <div className="segmented authSegmented">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Criar conta</button>
        </div>

        <form className="authForm" onSubmit={submit}>
          <label className="field"><span>E-mail</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" /></label>
          <label className="field"><span>Senha</span><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" /></label>
          {error && <div className="authError">{error}</div>}
          {message && <div className="authSuccess">{message}</div>}
          <button className="primary full" type="submit" disabled={busy}>
            {mode === 'login' ? <LogIn size={18}/> : <UserPlus size={18}/>} {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar no app' : 'Criar conta'}
          </button>
        </form>
      </section>
    </main>
  );
}
