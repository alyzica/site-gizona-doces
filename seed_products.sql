-- ============================================================
-- Migra os sabores de Brigadeiro e Geladinho pra tabela do banco,
-- já com as DUAS fotos (inteira + mordida) de cada sabor.
-- Rode isso no SQL Editor do Supabase (pode rodar de novo com
-- segurança, ele limpa e recria a tabela toda vez).
-- ============================================================

delete from public.products;

insert into public.products (name, category, price, description, image_url, image_url_2, sort_order) values
-- Brigadeiro Gourmet
('Brigadeiro Tradicional', 'brigadeiro', 1.80, 'Brigadeiro de chocolate finalizado com granulado de chocolate nobre ao leite.', 'images/brig-tradicional.png', 'images/brig-tradicional-mordida.png', 1),
('Ninho', 'brigadeiro', 1.80, 'Brigadeiro cremoso de leite ninho finalizado em leite em pó.', 'images/brig-ninho.png', 'images/brig-ninho-mordida.png', 2),
('Casadinho', 'brigadeiro', 1.80, 'Brigadeiro de chocolate e leite ninho finalizado em leite em pó.', 'images/brig-casadinho.png', 'images/brig-casadinho-mordida.png', 3),
('Beijinho', 'brigadeiro', 1.80, 'Brigadeiro de coco finalizado com coco em flocos.', 'images/brig-beijinho.png', 'images/brig-beijinho-mordida.png', 4),
('Prestígio', 'brigadeiro', 2.10, 'Brigadeiro de coco envolto em brigadeiro de chocolate, finalizado com coco em flocos.', 'images/brig-prestigio.png', 'images/brig-prestigio-mordida.png', 5),
('Surpresa de Uva', 'brigadeiro', 2.50, 'Brigadeiro de leite ninho envolto em uva verde sem semente, finalizado em leite em pó.', 'images/brig-uva.png', 'images/brig-uva-mordida.png', 6),
('Churros', 'brigadeiro', 2.50, 'Brigadeiro de doce de leite finalizado em açúcar e canela, com pitanga de doce de leite.', 'images/brig-churros.png', 'images/brig-churros-mordida.png', 7),
('Tipo Ferrero', 'brigadeiro', 2.90, 'Brigadeiro de chocolate finalizado com amendoim e roseta de Nutella.', 'images/brig-ferrero.png', 'images/brig-ferrero-mordida.png', 8),
('Ninho com Nutella', 'brigadeiro', 2.90, 'Brigadeiro de leite ninho finalizado em leite em pó e pitanga de Nutella.', 'images/brig-ninho-nutella.png', 'images/brig-ninho-nutella-mordida.png', 9),
-- Geladinho Gourmet
('Ninho com Nutella', 'geladinho', 5.00, 'Base super cremosa de leite ninho com uma generosa camada de Nutella.', 'images/gel-ninho-nutella.png', 'images/gel-ninho-nutella-mordida.png', 1),
('Maracujá com Nutella', 'geladinho', 5.00, 'A escolha ideal para quem gosta da combinação do azedinho do maracujá com o doce marcante da Nutella.', 'images/gel-maracuja-nutella.png', 'images/gel-maracuja-nutella-mordida.png', 2),
('Pudim Tradicional', 'geladinho', 5.00, 'Base de pudim super cremosa, com calda de caramelo. Clássico que nunca erra.', 'images/gel-pudim.png', 'images/gel-pudim-mordida.png', 3),
('Morango com Nutella', 'geladinho', 5.00, 'Base feita 100% com morango, preservando o sabor natural da fruta. O encontro perfeito entre o frutado e o doce.', 'images/gel-morango-nutella.png', 'images/gel-morango-nutella-mordida.png', 4),
('Bombom de Prestígio', 'geladinho', 5.00, 'Base feita com coco em flocos. Finalizado com casquinha de chocolate nobre blend, no estilo Prestígio.', 'images/gel-prestigio.png', 'images/gel-prestigio-mordida.png', 5),
('Ninho com Morango', 'geladinho', 5.00, 'Base super cremosa de leite ninho com geleia artesanal de morango.', 'images/gel-ninho-morango.png', 'images/gel-ninho-morango-mordida.png', 6),
('Bombom de Doce de Leite', 'geladinho', 5.00, 'Base feita com doce de leite super cremoso e casquinha de chocolate nobre blend.', 'images/gel-doce-leite.png', 'images/gel-doce-leite-mordida.png', 7),
('Morango Supremo', 'geladinho', 5.80, 'Base feita 100% com morango, geleia artesanal e casquinha de chocolate nobre branco.', 'images/gel-morango-supremo.png', 'images/gel-morango-supremo-mordida.png', 8);
