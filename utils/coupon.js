// Shared coupon helpers for order, ticket, and payment pages.

function parseRules(rules) {
  if (!rules) return {};
  if (typeof rules === 'object') return rules;
  if (typeof rules === 'string') {
    try {
      return JSON.parse(rules);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function toFen(value) {
  var n = Number(value || 0);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function formatYuan(fen) {
  var yuan = toFen(fen) / 100;
  if (Math.abs(yuan - Math.round(yuan)) < 0.000001) {
    return String(Math.round(yuan));
  }
  return yuan.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function normalizeStatus(status) {
  if (status === 'unused' || status === 'used' || status === 'expired') {
    return status;
  }
  var n = Number(status);
  if (n === 0) return 'unused';
  if (n === 1) return 'used';
  if (n === 2) return 'expired';
  return 'expired';
}

function getCouponValue(coupon, rules) {
  var type = coupon && coupon.coupon_type;
  if (type === 'rebate') {
    return {
      discount: toFen(rules.discount || coupon.discount),
      displayPrefix: '¥',
      displayValue: formatYuan(rules.discount || coupon.discount),
    };
  }
  if (type === 'discount') {
    var rate = normalizeDiscountRate(rules.discount_rate || coupon.discount_rate || 1);
    return {
      discount: 0,
      displayPrefix: '',
      displayValue: (Math.round(rate * 100) / 10) + '折',
    };
  }
  if (type === 'gift') {
    return {
      discount: 0,
      displayPrefix: '',
      displayValue: String(rules.gift_value || '-') + '积分',
    };
  }
  return {
    discount: 0,
    displayPrefix: '',
    displayValue: '-',
  };
}

function normalizeCoupon(coupon) {
  var c = coupon || {};
  var rules = parseRules(c.rules);
  var minConsume = toFen(c.min_consume || rules.min_consume || rules.min_amount);
  var value = getCouponValue(c, rules);
  return {
    object_id: c.object_id,
    name: c.name,
    description: c.description,
    discount: value.discount,
    coupon_type: c.coupon_type,
    rules: rules,
    min_consume: minConsume,
    expire_time: c.expire_time,
    status: normalizeStatus(c.status),
    is_valid: c.is_valid,
    displayPrefix: value.displayPrefix,
    displayValue: value.displayValue,
    limitText: minConsume > 0 ? '满' + formatYuan(minConsume) + '元可用' : '无门槛',
  };
}

function normalizeCoupons(coupons) {
  if (!Array.isArray(coupons)) return [];
  return coupons.map(function(coupon) {
    return normalizeCoupon(coupon);
  });
}

function calcCouponDiscount(coupon, baseAmountFen) {
  if (!coupon) return 0;
  var rules = parseRules(coupon.rules);
  if (coupon.coupon_type === 'rebate') {
    return Math.min(toFen(coupon.discount || rules.discount), toFen(baseAmountFen));
  }
  if (coupon.coupon_type === 'discount') {
    var rate = normalizeDiscountRate(rules.discount_rate || coupon.discount_rate || 1);
    var maxDiscount = toFen(rules.max_discount);
    var discount = Math.round(toFen(baseAmountFen) * (1 - rate));
    if (maxDiscount > 0 && discount > maxDiscount) {
      discount = maxDiscount;
    }
    return Math.max(0, discount);
  }
  return 0;
}

function isCouponAvailable(coupon, baseAmountFen) {
  if (!coupon) return false;
  if (coupon.status !== 'unused') return false;
  if (coupon.is_valid === false) return false;
  if (toFen(coupon.min_consume) > 0 && toFen(baseAmountFen) < toFen(coupon.min_consume)) {
    return false;
  }
  return true;
}

function getCouponDisableReason(coupon, baseAmountFen) {
  if (!coupon) return '不可用';
  if (coupon.status === 'used') return '已使用';
  if (coupon.status === 'expired' || coupon.is_valid === false) return '已过期';
  if (toFen(coupon.min_consume) > 0 && toFen(baseAmountFen) < toFen(coupon.min_consume)) {
    return '需满' + formatYuan(coupon.min_consume) + '元';
  }
  return '不可用';
}

function getAvailableCoupons(coupons, baseAmountFen) {
  if (!Array.isArray(coupons)) return [];
  return coupons.filter(function(coupon) {
    return isCouponAvailable(coupon, baseAmountFen);
  }).map(function(coupon) {
    return Object.assign({}, coupon, {
      discount: calcCouponDiscount(coupon, baseAmountFen),
    });
  });
}

function getUnavailableCoupons(coupons, baseAmountFen) {
  if (!Array.isArray(coupons)) return [];
  return coupons.filter(function(coupon) {
    return !isCouponAvailable(coupon, baseAmountFen);
  }).map(function(coupon) {
    return Object.assign({}, coupon, {
      disable_reason: getCouponDisableReason(coupon, baseAmountFen),
    });
  });
}

function getBestCoupon(coupons, baseAmountFen) {
  var list = getAvailableCoupons(coupons, baseAmountFen);
  var best = null;
  var bestDiscount = 0;
  for (var i = 0; i < list.length; i++) {
    var discount = calcCouponDiscount(list[i], baseAmountFen);
    if (discount > bestDiscount) {
      best = list[i];
      bestDiscount = discount;
    }
  }
  return best;
}

function normalizeDiscountRate(rate) {
  var n = Number(rate);
  if (!isFinite(n) || n <= 0) return 1;
  if (n > 10) return n / 100;
  if (n > 1) return n / 10;
  return n;
}

function findSameCoupon(coupons, coupon) {
  if (!coupon || !Array.isArray(coupons)) return null;
  for (var i = 0; i < coupons.length; i++) {
    if (coupons[i] && coupons[i].object_id === coupon.object_id) {
      return coupons[i];
    }
  }
  return null;
}

function resolveCouponSelection(coupons, selectedCoupon, baseAmountFen, manuallySelected) {
  var list = Array.isArray(coupons) ? coupons : [];
  var selected = selectedCoupon || null;
  var manual = !!manuallySelected;
  var current = findSameCoupon(list, selected) || selected;
  var available = !selected || isCouponAvailable(current, baseAmountFen);

  if (selected && !available) {
    selected = null;
    manual = false;
  }

  if (!manual) {
    var best = getBestCoupon(list, baseAmountFen);
    if (best) {
      var currentDiscount = calcCouponDiscount(selected, baseAmountFen);
      var bestDiscount = calcCouponDiscount(best, baseAmountFen);
      if (!selected || bestDiscount > currentDiscount) {
        selected = best;
      }
    }
  }

  current = findSameCoupon(list, selected) || selected;
  return {
    selectedCoupon: selected,
    manuallySelected: manual,
    selectedAvailable: available,
  };
}

export default {
  calcCouponDiscount: calcCouponDiscount,
  formatYuan: formatYuan,
  getAvailableCoupons: getAvailableCoupons,
  getBestCoupon: getBestCoupon,
  getCouponDisableReason: getCouponDisableReason,
  getUnavailableCoupons: getUnavailableCoupons,
  isCouponAvailable: isCouponAvailable,
  normalizeCoupon: normalizeCoupon,
  normalizeCoupons: normalizeCoupons,
  normalizeDiscountRate: normalizeDiscountRate,
  resolveCouponSelection: resolveCouponSelection,
};
