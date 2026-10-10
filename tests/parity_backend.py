# -*- coding: utf-8 -*-
"""闲时定价前后端一致性验证 —— 后端侧（生成用例）。

用途
----
闲时价（分时定价 + 周二半价）在前后端各有一份实现：
  后端  moyu/user/services/room_pricing.py   —— 真正扣钱的
  前端  myhsb/utils/offpeak.js               —— 页面上展示的
两份逻辑一旦不一致，就会出现"页面显示一个价、实际收另一个价"。
本脚本直接 import 真实的后端文件（顶层只依赖标准库），按下面 CASES
跑出"后端会收多少钱"，连同 Room.to_dict() 会下发给小程序的合并规则
一起写成 parity_cases.json，供 parity_frontend.js 用真实前端代码对拍。

运行
----
    python tests/parity_backend.py && node tests/parity_frontend.js

后端仓库默认取同级目录 ../moyu，不在该位置时用环境变量覆盖：
    MOYU_DIR=d:/path/to/moyu python tests/parity_backend.py

新增场景
--------
往 CASES 里加一行 (名称, FakeRoom(...), 日期, 时段) 即可，
前后端两边都会跑到同一条数据。
"""
import importlib.util
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
MOYU_DIR = os.environ.get(
    'MOYU_DIR',
    os.path.abspath(os.path.join(HERE, '..', '..', 'moyu')),
)
ROOM_PRICING = os.path.join(MOYU_DIR, 'user', 'services', 'room_pricing.py')
if not os.path.exists(ROOM_PRICING):
    sys.exit('找不到后端 %s，请用 MOYU_DIR 环境变量指定 moyu 仓库路径' % ROOM_PRICING)

spec = importlib.util.spec_from_file_location('room_pricing', ROOM_PRICING)
rp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rp)

# 模拟 Constance「工作日包间费折扣」：周二 50%，10-23 点（与生产默认一致）
GLOBAL = {
    'enabled': True, 'weekdays': [2], 'percent': 50,
    'hour_start': 10, 'hour_end': 23, 'label': '周二包间费半价',
}
rp.get_weekday_discount_settings = lambda: dict(GLOBAL)


class FakeRoom(object):
    """最小化的 Room 替身：room_pricing 只读这三个属性。"""

    def __init__(self, base, rules=None, exempt=False):
        self.price_per_hour = base
        self.offpeak_rules = rules or []
        if exempt:
            self.weekday_discount_exempt = True


# ---- 房间样板：覆盖重叠 / 豁免 / 自有价更低 / 纯全局 四类风险 ----
ROOM_A = FakeRoom(3000, [  # 全局半价 + 自有白天/夜场价并存
    {'label': '工作日白天', 'weekdays': [1, 2, 3, 4, 5], 'hour_start': 10, 'hour_end': 17, 'price_per_hour': 1800},
    {'label': '工作日夜场', 'weekdays': [1, 2, 3, 4, 5], 'hour_start': 19, 'hour_end': 22, 'price_per_hour': 2100},
])
ROOM_B = FakeRoom(3000, [  # 勾选「不参与全局半价」的豁免房
    {'label': '周二夜场特批', 'weekdays': [2], 'hour_start': 19, 'hour_end': 22, 'price_per_hour': 1200},
], exempt=True)
ROOM_C = FakeRoom(2500, [  # 自有价低于半价：必须取更便宜的自有价
    {'label': '比半价更便宜的白天价', 'weekdays': [2], 'hour_start': 12, 'hour_end': 14, 'price_per_hour': 1200},
])
ROOM_D = FakeRoom(4000)  # 无自有规则，仅全局半价

TUE = date(2026, 10, 13)  # 周二
MON = date(2026, 10, 12)  # 周一
SAT = date(2026, 10, 17)  # 周六

CASES = [
    ('A 周二10-13 半价vs白天1800', ROOM_A, TUE, [[10, 13]]),
    ('A 周二19-22 半价vs夜场2100', ROOM_A, TUE, [[19, 22]]),
    ('A 周二16-19 跨白天窗口→逐时取最低', ROOM_A, TUE, [[16, 19]]),
    ('A 周一14-20 跨白天+门市', ROOM_A, MON, [[14, 20]]),
    ('A 周一16-21 白天+门市+夜场', ROOM_A, MON, [[16, 21]]),
    ('A 周一10-13 自有白天价', ROOM_A, MON, [[10, 13]]),
    ('A 周六 全价', ROOM_A, SAT, [[10, 13]]),
    ('B(豁免) 周二10-13 无折扣', ROOM_B, TUE, [[10, 13]]),
    ('B(豁免) 周二19-22 自有夜场价', ROOM_B, TUE, [[19, 22]]),
    ('C 周二12-14 自有1200<半价1250', ROOM_C, TUE, [[12, 14]]),
    ('C 周二10-12 半价', ROOM_C, TUE, [[10, 12]]),
    ('D 周二11-16 仅全局半价', ROOM_D, TUE, [[11, 16]]),
    ('D 周二22-24 22点半价23点门市', ROOM_D, TUE, [[22, 24]]),
    ('D 周二9-12 早于窗口→9点门市其余半价', ROOM_D, TUE, [[9, 12]]),
    ('D 周二21-24 部分半价', ROOM_D, TUE, [[21, 24]]),
]

out = []
for name, room, day, time_list in CASES:
    price, rule = rp.resolve_appointment_price(room, day, time_list)
    quote = rp.price_appointment(room, day, time_list)
    out.append({
        'name': name,
        'date': day.isoformat(),
        'time_list': time_list,
        'base': room.price_per_hour,
        # to_dict() 下发给前端的合并规则（含全局半价与豁免处理）
        'offpeak_rules': rp.normalize_rules(room),
        'expect_price': price,
        'expect_room_fee': quote['room_fee'],
        'expect_segments': [[seg['start'], seg['end'], seg['price']] for seg in quote['segments']],
        'expect_source': (rule or {}).get('source') or '',
    })

with open(os.path.join(HERE, 'parity_cases.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('backend cases: %d (moyu: %s)' % (len(out), MOYU_DIR))
