// Only server order responses may authorize fulfillment; route hints are not evidence.
export function isCouponGoods(goods) {
	return !!(goods && goods.coupon_template_id);
}

function objectValue(value) {
	if (typeof value === 'string') {
		try { return JSON.parse(value) || {}; } catch (e) { return {}; }
	}
	return value && typeof value === 'object' ? value : {};
}

export function goodsFulfillmentView(order) {
	order = order || {};
	var fulfillment = objectValue(order.goods_fulfillment);
	var goodsInfo = objectValue(order.goodsInfo || order.goods_info);
	var context = objectValue(goodsInfo.context || goodsInfo);
	var kind = ['pickup', 'coupon'].indexOf(fulfillment.kind) >= 0 ? fulfillment.kind : 'unknown';
	var view = {
		visible: Number(order.order_type) === 3 || Number(order.order_type) === 5 || kind !== 'unknown',
		kind: kind, status: 'unknown', title: '领取记录待店员确认',
		description: '历史订单或领取信息不完整，请在我的订单中出示订单号，由店员确认。',
		className: 'fulfillment-unknown', receivedAtText: '',
		action: 'orders', actionText: '去我的订单', canPickupPending: false,
	};
	var paid = Number(order.order_status) === 1;
	var closed = [2, 6, 8, 9, 10, 99].indexOf(Number(order.order_status)) >= 0 || fulfillment.status === 'closed';
	if (closed) {
		view.status = 'closed';
		view.title = Number(order.order_status) === 10 ? '订单退款处理中' : '订单已退款或关闭';
		view.description = '当前订单不可领取，请在我的订单查看订单及退款状态。';
	} else if (!paid || fulfillment.status === 'notpaid') {
		view.status = 'notpaid';
		view.title = '订单尚未确认支付';
		view.description = '支付状态以我的订单为准，确认支付前不可领取。';
	} else if (kind === 'coupon' && fulfillment.status === 'issued' && context.granted_coupon_id) {
		view.kind = 'coupon';
		view.status = 'issued';
		view.title = '优惠券已到账';
		view.description = '有效期、适用范围和门槛以实际到账券为准，适用时可在下次下单结算选择使用。';
		view.action = 'coupons';
		view.actionText = '我的优惠券';
	} else if (kind === 'coupon' && ['processing', 'issued'].indexOf(fulfillment.status) >= 0) {
		// An issued flag without the actual granted coupon id must not promise arrival.
		view.status = 'processing';
		view.title = '优惠券发放处理中';
		view.description = '尚未确认到账，请稍后刷新或在我的订单中联系店员；以实际到账券为准。';
	} else if (kind === 'pickup' && fulfillment.status === 'processing') {
		view.status = 'processing';
		view.title = '领取信息处理中';
		view.description = '尚未确认可以领取，请刷新订单或联系店员。门店领取，不配送。';
	} else if (kind === 'pickup' && fulfillment.status === 'pending') {
		view.status = 'pending';
		view.title = '待到店领取';
		view.description = '门店领取，不配送。请出示订单号，由店员确认领取；这是额外付费商品，不是门票包含的免费茶水。';
		view.canPickupPending = true;
	} else if (kind === 'pickup' && fulfillment.status === 'received' && fulfillment.received_at && !isNaN(Date.parse(fulfillment.received_at))) {
		view.status = 'received';
		view.title = '已领取';
		view.receivedAtText = String(fulfillment.received_at).replace('T', ' ');
		view.description = '店员已确认领取 · ' + view.receivedAtText;
	}
	view.className = 'fulfillment-' + view.status;
	return view;
}

export function decorateGoodsFulfillment(order) {
	return Object.assign({}, order, { goodsFulfillmentView: goodsFulfillmentView(order) });
}

export default { isCouponGoods, goodsFulfillmentView, decorateGoodsFulfillment };
