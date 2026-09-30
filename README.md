# 言霊の卓

剣と魔法と、残酷な神々の見世物の大陸「ヴェルド」を旅する、一人用の TRPG 風ブラウザゲーム。
能力値が行動の成功率を決め、使った能力値は伸びる。死ねば年表と墓碑が残り、トロフィーは冒険をまたいで残る。
普段の遊びで Claude（トークン）は使わない。自由入力で「GM に任せる」を選んだときだけ使う。

- 遊ぶ：`node tools/build.mjs` で `dist/kotodama.html` ができる。claude.ai の Artifact として公開して遊ぶ（ブラウザで直接開いても、GM 以外は動く）
- テスト：`node tests/run.mjs`
- 開発の決まり：[CLAUDE.md](CLAUDE.md)
- ゲームの方向性：[docs/VISION.md](docs/VISION.md)
- ロードマップと並行作業：[docs/ROADMAP.md](docs/ROADMAP.md)
- 配り役（子セッションに作業を配って進める）：`.claude/skills/dispatcher/`（下準備は `references/setup.md`）
