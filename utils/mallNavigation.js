const INTENT_KEY = 'mall_card_intent';
const MAX_AGE = 30 * 60 * 1000;
const CHECKOUT_ROUTES = {
  ticket_checkout: '/pages/ticket/buy',
  room_checkout: '/pages/order/createOrder',
};
let checkoutDraft = null;

function returnIdFromUrl(url) {
  const match = String(url || '').match(/[?&]mall_return_id=([a-zA-Z0-9-]+)(?:&|$)/);
  return match ? match[1] : '';
}

function normalizeIntent(options) {
  const value = options || {};
  const source = String(value.source || 'mall');
  const targetType = Number(value.targetType || value.target_type);
  const amount = Number(value.amount);
  const checkout = Object.prototype.hasOwnProperty.call(CHECKOUT_ROUTES, source) ? CHECKOUT_ROUTES[source] : '';
  const returnToCheckout = !!checkout && value.returnToCheckout === true;
  const suppliedUrl = String(value.returnUrl || '');
  const returnUrl = returnToCheckout && suppliedUrl.split('?')[0] === checkout ? suppliedUrl : returnToCheckout ? checkout : '';
  return {
    source,
    targetType: targetType === 1 || targetType === 2 ? targetType : 0,
    amount: isFinite(amount) && amount > 0 ? amount : 0,
    returnToCheckout,
    returnUrl,
    returnId: returnIdFromUrl(returnUrl),
    createdAt: Date.now(),
  };
}

function openCardMall(options) {
  const intent = normalizeIntent(options);
  if (intent.returnToCheckout) {
    const value = options && options.returnDraft;
    if (value && typeof value === 'object') {
      const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      const parts = intent.returnUrl.split('?');
      const query = (parts[1] || '').split('&').filter(item => item && !/^mall_return_id=/.test(item));
      query.push('mall_return_id=' + id);
      intent.returnUrl = parts[0] + '?' + query.join('&');
      intent.returnId = id;
      checkoutDraft = { source: intent.source, returnId: id, createdAt: intent.createdAt, value };
    } else if (!checkoutDraft || checkoutDraft.source !== intent.source || checkoutDraft.returnId !== intent.returnId || Date.now() - checkoutDraft.createdAt > MAX_AGE) {
      checkoutDraft = null;
    }
  } else checkoutDraft = null;
  uni.setStorageSync(INTENT_KEY, intent);
  uni.switchTab({ url: '/pages/voucher/voucher' });
  return intent;
}

function takeCardIntent() {
  const value = uni.getStorageSync(INTENT_KEY);
  uni.removeStorageSync(INTENT_KEY);
  if (!value || typeof value !== 'object' || !value.createdAt) return null;
  const age = Date.now() - Number(value.createdAt);
  if (!isFinite(age) || age < 0 || age > MAX_AGE) return null;
  return normalizeIntent(value);
}

function confirmationUrl(cardId, intent) {
  const value = normalizeIntent(intent);
  let url = '/pages/user/subscription/buy?card_id=' + encodeURIComponent(String(cardId || ''))
    + '&source=' + encodeURIComponent(value.source);
  if (value.targetType) url += '&target_type=' + value.targetType;
  if (value.returnToCheckout) {
    url += '&return_to_checkout=1&return_url=' + encodeURIComponent(value.returnUrl);
  }
  return url;
}

function resumeCheckout(options) {
  const intent = normalizeIntent(Object.assign({}, options, { returnToCheckout: true }));
  if (!intent.returnToCheckout) return false;
  uni.redirectTo({ url: intent.returnUrl });
  return true;
}

function takeCheckoutDraft(source, returnId) {
  if (!checkoutDraft || checkoutDraft.source !== source) return null;
  if (Date.now() - checkoutDraft.createdAt > MAX_AGE) {
    checkoutDraft = null;
    return null;
  }
  if (!returnId || String(returnId) !== checkoutDraft.returnId) return null;
  const saved = checkoutDraft;
  checkoutDraft = null;
  return saved.value;
}

export default { openCardMall, takeCardIntent, confirmationUrl, resumeCheckout, takeCheckoutDraft };
