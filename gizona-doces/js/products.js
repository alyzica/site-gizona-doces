/*
  DADOS DA GIZONA DOCES
  ===========================================
  Edite aqui nomes, preços, sabores e descrições.
  Sempre que possível, mantenha os "id" sem espaço e sem acento.
*/

// Opções de caixa de Brigadeiro Gourmet
const BRIGADEIRO_BOXES = [
  {
    id: "50",
    title: "Caixa com 50 unidades",
    subtitle: "Escolha 1 ou 2 sabores",
    fixedPrice: null,
    badge: "Valores conforme o cardápio",
    flavorsOptions: [
      { id: "1s", label: "1 sabor (50 unidades)", count: 1, qty: 50 },
      { id: "2s", label: "2 sabores (25 de cada)", count: 2, qty: 25 },
    ],
  },
  {
    id: "100",
    title: "Caixa com 100 unidades",
    subtitle: "Escolha 1, 2 ou 4 sabores",
    fixedPrice: null,
    badge: "Valores conforme o cardápio",
    flavorsOptions: [
      { id: "1s", label: "1 sabor (100 unidades)", count: 1, qty: 100 },
      { id: "2s", label: "2 sabores (50 de cada)", count: 2, qty: 50 },
      { id: "4s", label: "4 sabores (25 de cada)", count: 4, qty: 25 },
    ],
  },
];

// Sabores de Brigadeiro Gourmet (usados quando a caixa NÃO tem preço fixo)
const BRIGADEIRO_PRODUCTS = [
  { id: "brig-tradicional", name: "Brigadeiro Tradicional", price: 1.80, desc: "Brigadeiro de chocolate finalizado com granulado de chocolate nobre ao leite.", image: "images/brig-tradicional.png", image2: "images/brig-tradicional-mordida.png" },
  { id: "brig-ninho", name: "Ninho", price: 1.80, desc: "Brigadeiro cremoso de leite ninho finalizado em leite em pó.", image: "images/brig-ninho.png", image2: "images/brig-ninho-mordida.png" },
  { id: "brig-casadinho", name: "Casadinho", price: 1.80, desc: "Brigadeiro de chocolate e leite ninho finalizado em leite em pó.", image: "images/brig-casadinho.png", image2: "images/brig-casadinho-mordida.png" },
  { id: "brig-beijinho", name: "Beijinho", price: 1.80, desc: "Brigadeiro de coco finalizado com coco em flocos.", image: "images/brig-beijinho.png", image2: "images/brig-beijinho-mordida.png" },
  { id: "brig-prestigio", name: "Prestígio", price: 2.10, desc: "Brigadeiro de coco envolto em brigadeiro de chocolate, finalizado com coco em flocos.", image: "images/brig-prestigio.png", image2: "images/brig-prestigio-mordida.png" },
  { id: "brig-uva", name: "Surpresa de Uva", price: 2.50, desc: "Brigadeiro de leite ninho envolto em uva verde sem semente, finalizado em leite em pó.", image: "images/brig-uva.png", image2: "images/brig-uva-mordida.png" },
  { id: "brig-churros", name: "Churros", price: 2.50, desc: "Brigadeiro de doce de leite finalizado em açúcar e canela, com pitanga de doce de leite.", image: "images/brig-churros.png", image2: "images/brig-churros-mordida.png" },
  { id: "brig-ferrero", name: "Tipo Ferrero", price: 2.90, desc: "Brigadeiro de chocolate finalizado com amendoim e roseta de Nutella.", image: "images/brig-ferrero.png", image2: "images/brig-ferrero-mordida.png" },
  { id: "brig-ninho-nutella", name: "Ninho com Nutella", price: 2.90, desc: "Brigadeiro de leite ninho finalizado em leite em pó e pitanga de Nutella.", image: "images/brig-ninho-nutella.png", image2: "images/brig-ninho-nutella-mordida.png" },
];

// Sabores de Geladinho Gourmet
const GELADINHO_PRODUCTS = [
  { id: "gel-ninho-nutella", name: "Ninho com Nutella", price: 5.00, desc: "Base super cremosa de leite ninho com uma generosa camada de Nutella.", image: "images/gel-ninho-nutella.png", image2: "images/gel-ninho-nutella-mordida.png" },
  { id: "gel-maracuja-nutella", name: "Maracujá com Nutella", price: 5.00, desc: "A escolha ideal para quem gosta da combinação do azedinho do maracujá com o doce marcante da Nutella.", image: "images/gel-maracuja-nutella.png", image2: "images/gel-maracuja-nutella-mordida.png" },
  { id: "gel-pudim", name: "Pudim Tradicional", price: 5.00, desc: "Base de pudim super cremosa, com calda de caramelo. Clássico que nunca erra.", image: "images/gel-pudim.png", image2: "images/gel-pudim-mordida.png" },
  { id: "gel-morango-nutella", name: "Morango com Nutella", price: 5.00, desc: "Base feita 100% com morango, preservando o sabor natural da fruta. O encontro perfeito entre o frutado e o doce.", image: "images/gel-morango-nutella.png", image2: "images/gel-morango-nutella-mordida.png" },
  { id: "gel-prestigio", name: "Bombom de Prestígio", price: 5.00, desc: "Base feita com coco em flocos. Finalizado com casquinha de chocolate nobre blend, no estilo Prestígio.", image: "images/gel-prestigio.png", image2: "images/gel-prestigio-mordida.png" },
  { id: "gel-ninho-morango", name: "Ninho com Morango", price: 5.00, desc: "Base super cremosa de leite ninho com geleia artesanal de morango.", image: "images/gel-ninho-morango.png", image2: "images/gel-ninho-morango-mordida.png" },
  { id: "gel-doce-leite", name: "Bombom de Doce de Leite", price: 5.00, desc: "Base feita com doce de leite super cremoso e casquinha de chocolate nobre blend.", image: "images/gel-doce-leite.png", image2: "images/gel-doce-leite-mordida.png" },
  { id: "gel-morango-supremo", name: "Morango Supremo", price: 5.80, desc: "Base feita 100% com morango, geleia artesanal e casquinha de chocolate nobre branco.", image: "images/gel-morango-supremo.png", image2: "images/gel-morango-supremo-mordida.png" },
];

// Regras do geladinho: mínimo 10 por sabor.
// De 10 até 15, aumenta de 1 em 1. A partir de 15, de 5 em 5.
const GELADINHO_RULES = {
  minPerFlavor: 10,
  minTotal: 30,
  smallStepLimit: 15, // até esse valor, o passo é de 1 em 1
};

