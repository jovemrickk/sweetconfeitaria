# CONFEITARIA SWEET

Painel PWA em Next.js para pedidos, produção, custos, NFC-e e financeiro.

## Rodar no PC

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Banco Supabase

1. Rode `supabase/schema.sql` no SQL Editor do Supabase.
2. Crie `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

3. Na Vercel, cadastre essas mesmas duas variáveis em Settings > Environment Variables.
4. Faça um novo deploy.

A mesma conta de login pode ser usada no PC e nos celulares para compartilhar os mesmos dados.

## PWA

O projeto inclui manifest, ícones e service worker. Depois de publicar em HTTPS pela Vercel:
- Android/Chrome: menu > Instalar app.
- iPhone/Safari: Compartilhar > Adicionar à Tela de Início.
