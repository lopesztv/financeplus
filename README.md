# Finance+

Site estático de organização financeira, com HTML, CSS e JavaScript. Não precisa de etapa de build.

## Publicar na Vercel usando GitHub

1. Envie este repositório para o GitHub.
2. Na Vercel, escolha **Add New → Project** e importe o repositório.
3. Use **Other** como framework; deixe Build Command vazio e Output Directory como `.`.
4. Depois do primeiro deploy, copie o domínio `.vercel.app`.
5. No Supabase, em **Authentication → URL Configuration**, defina o domínio como **Site URL** e adicione `https://SEU-DOMINIO.vercel.app/**` em **Redirect URLs**.

O projeto Supabase já é configurado em `js/supabase-config.js` com a chave publicável do cliente. Essa chave pode aparecer no código publicado; nunca use uma chave `service_role` ou `secret` no navegador.

## Arquivos principais

- `index.html`, `css/style.css` e `js/script.js`: interface e funcionalidades.
- `assets/`: logo e ícones do site e da PWA.
- `js/supabase-config.js`: configuração pública do Supabase.
- `manifest.webmanifest` e `service-worker.js`: suporte PWA.
- `supabase/schema.sql`: esquema do banco e políticas RLS.
- `vercel.json`: cabeçalhos para a PWA na Vercel.
