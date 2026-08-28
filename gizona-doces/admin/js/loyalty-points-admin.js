/* GIZONA DOCES — visão administrativa do Clube Fidelidade por pontos */

async function loadLoyalty(main) {
  const [{ data: customers, error: customersError }, { data: cards, error: cardsError }] = await Promise.all([
    sb.from("customers").select("id, full_name, email, phone"),
    sb.from("loyalty_cards").select("*")
  ]);
  if (customersError) throw customersError;
  if (cardsError) throw cardsError;
  admin.data.customers = customers || [];
  admin.data.loyalty = cards || [];
  renderLoyaltyTable(main);
}

function renderLoyaltyTable(main) {
  const rows = admin.data.customers.map(c => {
    const card = admin.data.loyalty.find(l => l.customer_id === c.id);
    return {
      customer: c,
      points: card ? Number(card.points || 0) : 0,
      completed: card ? Number(card.completed_orders || 0) : 0,
      claimed: card ? Number(card.rewards_claimed || 0) : 0,
      hasCard: !!card
    };
  });

  main.innerHTML = `
    <div class="admin-topbar"><h1>Programa de Fidelidade</h1></div>
    <div class="admin-card">
      <p class="hint" style="margin-top:0">Regra atual: <strong>R$ 1,00 gasto = 1 ponto</strong>. Os pontos são creditados quando o pedido fica concluído ou entregue.</p>
      ${rows.length ? `
        <table><thead><tr><th>Cliente</th><th>E-mail</th><th>Telefone</th><th>Pontos</th><th>Pedidos concluídos</th><th>Resgates</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.customer.full_name}</td><td>${r.customer.email || "—"}</td><td>${r.customer.phone || "—"}</td><td><strong>${r.points}</strong></td><td>${r.completed}</td><td>${r.claimed}</td></tr>`).join("")}
        </tbody></table>
      ` : `<p class="center-msg">Nenhum cliente cadastrado.</p>`}
    </div>
  `;
}
