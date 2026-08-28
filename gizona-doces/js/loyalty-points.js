/* GIZONA DOCES — Clube Fidelidade por pontos
   Regra: R$ 1,00 gasto = 1 ponto. A concessão é feita no banco quando o pedido
   passa para concluído/entregue. Este arquivo atualiza apenas a interface cliente.
*/

async function loadLoyaltyData() {
  if (!sb || !auth.customer) return;
  try {
    const [{ data: card, error: cardError }, { data: rewards, error: rewardsError }] = await Promise.all([
      sb.from("loyalty_cards").select("*").eq("customer_id", auth.customer.id).maybeSingle(),
      sb.from("rewards").select("*").eq("active", true).order("points_required")
    ]);
    if (cardError) throw cardError;
    if (rewardsError) throw rewardsError;
    state.loyaltyCard = card || { points: 0, completed_orders: 0, rewards_claimed: 0 };
    state.rewardsList = rewards || [];
  } catch (e) {
    console.error("Erro ao carregar fidelidade:", e);
    state.loyaltyCard = state.loyaltyCard || { points: 0, completed_orders: 0, rewards_claimed: 0 };
    state.rewardsList = state.rewardsList || [];
  }
}

function renderLoyaltyClub() {
  const points = Number(state.loyaltyCard?.points || 0);
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Clube Fidelidade</h2><p>Quanto mais você compra, mais pontos acumula.</p></div>
      <div class="cart-summary center-text">
        <div style="font-size:14px;color:var(--muted);margin-bottom:4px">Seu saldo</div>
        <div style="font-size:42px;font-weight:800;color:var(--pink)">${points}</div>
        <div style="font-weight:700">pontos</div>
        <p class="hint" style="margin-top:8px">A cada R$ 1,00 em pedidos concluídos, você ganha 1 ponto.</p>
      </div>
      <p class="cart-section-title" style="margin-top:6px">Mimos disponíveis</p>
      ${state.rewardsList && state.rewardsList.length ? state.rewardsList.map(r => {
        const required = Number(r.points_required || 0);
        const missing = Math.max(0, required - points);
        return `
          <div class="cart-summary reward-row">
            ${r.image_url ? `<img class="reward-thumb" src="${r.image_url}" onerror="this.remove()">` : ""}
            <div style="flex:1">
              <p class="cart-section-title" style="margin:0">${r.name}</p>
              <p class="small-line">${r.description || ""}</p>
              <p class="small-line"><strong>${required} pontos</strong></p>
              ${missing ? `<p class="small-line">Faltam ${missing} ponto${missing === 1 ? "" : "s"}.</p>` : `<p class="small-line"><strong>Disponível para resgate!</strong></p>`}
            </div>
            <button class="btn btn-small btn-primary" ${points >= required ? "" : "disabled"} onclick="redeemReward('${r.id}')">Resgatar</button>
          </div>
        `;
      }).join("") : `<p class="hint center">Nenhum mimo disponível no momento.</p>`}
      ${navButtons({ back: "dashboard" })}
    </section>
  `;
}

async function redeemReward(rewardId) {
  const reward = state.rewardsList.find(r => r.id === rewardId);
  if (!reward || !auth.customer) return;
  const required = Number(reward.points_required || 0);
  const current = Number(state.loyaltyCard?.points || 0);
  if (current < required) {
    alert(`Você precisa de ${required} pontos para resgatar este mimo.`);
    return;
  }

  try {
    const { data, error } = await sb.rpc("redeem_reward", { p_reward_id: rewardId });
    if (error) throw error;
    const remaining = Number(data?.remaining_points ?? (current - required));
    const msg = `Olá! Gostaria de resgatar meu mimo no Clube Fidelidade: "${reward.name}". Meu saldo após o resgate é ${remaining} pontos.`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    await loadLoyaltyData();
    render();
  } catch (e) {
    console.error(e);
    alert(e.message || "Não foi possível realizar o resgate.");
  }
}
