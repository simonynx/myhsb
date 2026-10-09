# tests/ —— 前端本地测试脚本

存放不参与小程序打包的测试/校验脚本。**本目录已通过
`project.config.json` 的 `packOptions.ignore` 显式排除，且 uni-app
编译只收录被引用的页面/组件/静态资源，这里的文件不会进入小程序包。**

## 闲时定价前后端对拍

闲时价（分时定价 + 周二半价）在前后端各有一份实现，本组脚本用
**双方的真实代码**跑同一批场景，防止"页面显示一个价、实际收另一个价"：

- 后端 `moyu/user/services/room_pricing.py`（真正扣钱）
- 前端 `utils/offpeak.js`（页面展示）

```bash
python tests/parity_backend.py && node tests/parity_frontend.js
```

- `parity_backend.py` —— import 真实后端文件算出期望价，生成 `parity_cases.json`
  （后端仓库默认取同级 `../moyu`，不在该位置时 `MOYU_DIR=... python tests/parity_backend.py`）
- `parity_frontend.js` —— 用真实前端 `offpeak.js` 重算并逐条比对价格与规则来源
- `parity_cases.json` / `offpeak_cjs.js` —— 运行时生成的中间产物，已 gitignore

**什么时候要跑**：改动 `room_pricing.py`、`offpeak.js`，或调整优惠规则逻辑之后。
新增场景：在 `parity_backend.py` 的 `CASES` 里加一行即可，两边自动对上。
