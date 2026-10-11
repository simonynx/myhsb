function money(fen) {
  return (Math.max(0, Number(fen) || 0) / 100).toFixed(2).replace(/\.?0+$/, '');
}

function decorateGoods(goods, user, hasLogin) {
  const value = goods || {};
  const account = user || {};
  const points = Math.max(0, Number(account.points) || 0);
  const type = Number(value.exchange_type);
  const cost = Math.max(0, Number(value.points_price) || 0);
  const requiredLevel = Math.max(0, Number(value.member_level_required) || 0);
  const locked = requiredLevel > (Number(account.member_level) || 0);
  const soldOut = value.stock !== null && value.stock !== undefined && Number(value.stock) === 0;
  const limitReached = Number(value.max_buy_per_user) > 0 && Number(value.user_bought_count || 0) >= Number(value.max_buy_per_user);
  const shortfall = Math.max(0, cost - points);
  const cash = Math.max(0, Number(value.price) || 0);
  const canExchange = !!hasLogin && !locked && !soldOut && !limitReached && shortfall === 0;
  let stateText = !hasLogin ? '登录后查看兑换资格' : shortfall ? '还差' + shortfall + '积分' : type === 3 && cash > 0 ? '积分足够，仍需支付现金' : '当前积分可兑换';
  if (soldOut) stateText = '暂时兑完了';
  else if (limitReached) stateText = '已达到本期限购上限';
  else if (locked) stateText = hasLogin ? '需会员等级' + requiredLevel + '及以上' : '登录后确认会员资格';
  const coupon = !!value.coupon_template_id;
  return Object.assign({}, value, {
    canExchange,
    locked,
    soldOut,
    limitReached,
    pointsShortfall: shortfall,
    stateText,
    priceText: type === 1 ? '¥' + money(cash) : cost + '积分' + (type === 3 ? ' + ¥' + money(cash) : ''),
    deliveryText: coupon ? '到账后在我的优惠券查看适用范围' : '门店领取，不配送；领取方式见商品详情',
    actionText: soldOut ? '查看商品' : limitReached || locked ? '查看条件' : !hasLogin ? '登录后兑换' : shortfall ? '查看兑换条件' : type === 3 && cash > 0 ? '查看积分＋现金价' : '查看兑换',
    itemClass: 'benefit-item' + (soldOut || limitReached ? ' unavailable' : ''),
    categoryText: coupon ? '下次消费券' : '到店小福利',
  });
}

function benefits(goods, user, hasLogin) {
  return (Array.isArray(goods) ? goods : []).filter(item => item && Number(item.goods_type) !== 1 && (Number(item.exchange_type) === 2 || Number(item.exchange_type) === 3))
    .map(item => decorateGoods(item, user, hasLogin))
    .sort((a, b) => {
      if (a.soldOut !== b.soldOut) return a.soldOut ? 1 : -1;
      if (a.limitReached !== b.limitReached) return a.limitReached ? 1 : -1;
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      if (Number(a.exchange_type) !== Number(b.exchange_type)) return Number(a.exchange_type) === 2 ? -1 : 1;
      if (a.canExchange !== b.canExchange) return a.canExchange ? -1 : 1;
      return Number(a.points_price || 0) - Number(b.points_price || 0);
    });
}

function pointsView(user, hasLogin) {
  if (!hasLogin) return { points: 0, valueText: '', usageText: '登录后查看积分，兑换福利或按订单规则抵扣消费' };
  const account = user || {};
  const points = Math.max(0, Number(account.points) || 0);
  const config = account.points_config || {};
  const rate = Number(config.points_to_fen);
  const min = Number(config.points_min_use);
  const step = Number(config.points_step);
  const max = Number(config.points_max_use);
  const configured = [rate, min, step, max].every(value => isFinite(value) && value > 0 && Math.floor(value) === value) && max >= min;
  const eligiblePoints = configured ? Math.floor(Math.min(points, max) / step) * step : 0;
  const valueText = configured && eligiblePoints >= min ? '按当前规则，最多可抵¥' + money(eligiblePoints * rate) : '';
  return {
    points,
    valueText,
    usageText: configured ? min + '积分起用，每' + step + '积分一档；以订单应付金额和适用规则为准' : '结算时可按订单规则抵扣；具体额度以结算页为准',
  };
}

export default { money, decorateGoods, benefits, pointsView };
