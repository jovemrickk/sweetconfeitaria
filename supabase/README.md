# Sweet Dreams • Gestão

MVP web para administrar a confeitaria: pedidos, lotes de produção, produtos/fichas técnicas, ingredientes, compras, NFC-e, despesas e indicadores.

## O que já funciona

- Dashboard com faturamento, lucro estimado, ticket médio, CMV, despesas e Meta Ads.
- Pedidos com cliente, produto, frete, pagamento, origem e status.
- Calculadora de lote: custo da receita, extras, perdas e custo real por unidade.
- Produtos + ficha técnica por ingrediente.
- Ingredientes com custo unitário, estoque e alerta mínimo.
- Compras manuais.
- Leitor de QR Code de NFC-e pela câmera.
- Importação server-side da página da NFC-e com parser inicial para DANFE HTML e fallback genérico.
- Financeiro e análise simples de CPA/ROAS usando a origem do pedido.
- Configuração de DAS/MEI, custos fixos, taxa de entrega e cartão.
- Backup/importação dos dados em JSON.
- Responsivo para celular e instalável como web app.

## Rodar no VS Code

1. Extraia o ZIP.
2. Abra a pasta no VS Code.
3. Abra o terminal integrado.
4. Rode:

```bash
npm install
npm run dev
```

5. Abra `http://localhost:3000`.

A V1 salva tudo no `localStorage` do navegador para você testar imediatamente.

## NFC-e

A aba **Compras / NFC-e** pode abrir a câmera, ler o QR Code e mandar a URL para `/api/nfce/import`. Essa rota consulta o portal oficial e tenta extrair estabelecimento, data, chave, total e itens.

Portais de NFC-e variam entre os estados e alguns usam bloqueios/HTML dinâmico. Por isso existe fallback de compra manual. O parser pode ser ampliado conforme vocês testarem notas reais de São Paulo e de outros estados.

Por segurança, a rota automática aceita somente URLs HTTPS em domínio `.gov.br`.

## GitHub

Depois de testar:

```bash
git init
git add .
git commit -m "MVP Sweet Dreams Gestão"
git branch -M main
git remote add origin SEU_REPOSITORIO_GITHUB
git push -u origin main
```

## Colocar online

A opção mais simples para este projeto é a Vercel:

1. Importe o repositório GitHub na Vercel.
2. Framework: Next.js (detecção automática).
3. Build: padrão (`next build`).
4. Deploy.

A rota `/api/nfce/import` roda como função server-side, então não precisa de servidor separado.

## Sincronização entre PC e celular

O MVP está propositalmente em modo local para você conseguir testar sem configurar banco.

O arquivo `supabase/schema.sql` já prepara uma tabela JSONB protegida por RLS para a etapa cloud. Na próxima evolução, conecte:

- Supabase Auth;
- `sweet_app_state` para sincronizar os dados;
- variáveis de `.env.example`;
- login da Sweet Dreams.

Assim PC e celular passam a enxergar o mesmo caixa, pedidos e estoque.

## Próximas etapas sugeridas

1. Supabase + login e sincronização em nuvem.
2. Parser específico das NFC-e que vocês realmente usam (principalmente SP).
3. Vincular itens importados da NFC-e aos ingredientes cadastrados e atualizar estoque/preço automaticamente.
4. Edição de pedidos, produtos e ingredientes.
5. Agenda de entrega agrupada por dia.
6. Relatórios por período e exportação CSV/PDF.
7. Rateio de custo fixo por unidade vendida.
8. Controle de estoque por movimentação real de lote/compra.

## Estrutura

- `app/` — Next.js App Router.
- `components/AppShell.tsx` — telas do painel.
- `components/QrScanner.tsx` — câmera/QR.
- `app/api/nfce/import/route.ts` — consulta e parser NFC-e.
- `lib/` — tipos, cálculos, dados e persistência local.
- `supabase/schema.sql` — base para sincronização cloud.

## Instalar como PWA

Este projeto já vem preparado como PWA com o nome **CONFEITARIA SWEET**.

Depois de publicar na Vercel em HTTPS:

- Android/Chrome: abra o site e toque em **Instalar app** no topo, ou Menu → Instalar app.
- iPhone/Safari: abra no Safari → Compartilhar → **Adicionar à Tela de Início**.
- PC/Chrome/Edge: use o ícone de instalação na barra de endereço ou o botão **Instalar app**.

Arquivos PWA incluídos:

- `app/manifest.ts`
- `public/sw.js`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/icon-maskable-512.png`
- `public/apple-touch-icon.png`
- `components/PwaRegister.tsx`
- `components/PwaInstallButton.tsx`

> Observação: PWA e sincronização entre dispositivos são coisas diferentes. A instalação funciona com este pacote; para os mesmos dados aparecerem no seu celular e no celular da confeiteira, é necessário ativar o Supabase/banco na nuvem.

## Ativar banco em nuvem (Supabase)

A versão Cloud mantém um backup local e, quando o Supabase está configurado, sincroniza o mesmo estado entre PC e celulares.

1. Crie um projeto no Supabase.
2. Abra **SQL Editor** e rode `supabase/schema.sql`.
3. Copie a **Project URL** e a chave **anon/publishable** do projeto.
4. No desenvolvimento, crie `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE
```

5. Na Vercel, adicione as mesmas duas variáveis em **Settings > Environment Variables** e faça um Redeploy.
6. Abra o app, crie a conta da confeitaria e entre.
7. Na segunda pessoa/aparelho, use o mesmo e-mail e senha nesta primeira versão.

Quando um aparelho altera um pedido, compra, lote ou custo, o outro recebe a atualização pela Realtime do Supabase.

> Não use `service_role` no navegador. O app usa somente a chave pública e protege os dados com RLS.
