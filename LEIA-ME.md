# Gizona Doces — Site de Encomendas

Site com o fluxo real da Gizona: escolher Brigadeiro Gourmet (caixa de 25/50/100,
sabores) ou Geladinho Gourmet (sabores com mínimo por sabor), personalização de
arte opcional, carrinho e finalização direto no WhatsApp.

Não depende de nenhuma plataforma paga — é HTML, CSS e JavaScript puro, então
funciona pra sempre, em qualquer lugar que você hospedar.

## 1. Como adicionar as fotos dos sabores

Abra `js/products.js`. Cada sabor tem um campo `image`, por exemplo:

```js
{ id: "brig-ninho-nutella", name: "Ninho com Nutella", price: 4.00, ..., image: "images/brig-ninho-nutella.jpg" }
```

Salve a foto na pasta `images` com esse nome exato. (Nesta primeira versão as
fotos ainda não aparecem visualmente nos cards — se quiser que apareçam, me
avise que eu ligo o campo `image` ao card.)

## 2. Como editar sabores, preços e regras das caixas

Tudo fica em `js/products.js`:
- `BRIGADEIRO_BOXES`: as 3 opções de caixa (25/50/100) e quantos sabores cada uma permite
- `BRIGADEIRO_PRODUCTS`: lista de sabores de brigadeiro
- `GELADINHO_PRODUCTS`: lista de sabores de geladinho
- `GELADINHO_RULES`: mínimo por sabor, mínimo total e o incremento (+5)

Copie um bloco `{ }`, cole antes do `]` e edite os dados pra adicionar um sabor novo.

## 3. Como trocar o número de WhatsApp

Abra `js/app.js` e mude a primeira linha:

```js
const WHATSAPP_NUMBER = "5519997489773";
```

## 4. Como trocar o endereço de retirada

Também no topo de `js/app.js`:

```js
const ADDRESS = "Rua das Oliveiras, 74 – Vale das Nogueiras, Americana/SP";
```

## 5. Como testar no computador antes de publicar

Só dar dois cliques no arquivo `index.html` — ele abre no navegador e já funciona.

## 6. Como colocar o site no ar (grátis)

1. Acesse **https://app.netlify.com/drop**
2. Arraste a pasta inteira `gizona-doces` pra dentro da página.
3. Pronto — em segundos o Netlify gera um link tipo `https://gizona-doces-123.netlify.app`.
4. Em **Site settings > Change site name**, troque por algo como `gizonadoces.netlify.app`.
5. Se quiser um domínio próprio (ex: `gizonadoces.com.br`), dá pra comprar no
   Registro.br (~R$40/ano) e apontar pro Netlify — te ajudo nessa parte quando
   chegar a hora.

## 7. Próxima etapa: login, clube de fidelidade e painel admin

Essas três coisas precisam de um banco de dados por trás. O próximo passo é
conectar o site a uma conta gratuita do **Supabase**, que continua sendo 100%
seu, sem depender de plataforma fechada. Quando quiser seguir pra essa etapa,
é só falar comigo.

## 8. O que ficou de fora por enquanto

- Bolo por encomenda (você pediu pra deixar fora desta versão)
- Fotos reais dos sabores (ainda não temos as fotos)
- Upload de imagem de referência na personalização — por ora, a cliente pode
  mandar a foto de referência direto no WhatsApp depois de enviar o pedido
 
