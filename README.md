Chinachu
========

Visit the Chinachu website for more information: <http://chinachu.akkar.in/>

### alpha版からの変更点 ###

要素          |alpha      |beta
--------------|-----------|---------------------------
ジョブ管理    |Atd        |独自実装 (chinachu-operator)
Node.js       |構築が必要 |専用に自動構築
epgdump       |構築が必要 |専用に自動構築 ([stz2012/epgdump](https://github.com/stz2012/epgdump))
LSBInitScript |n/a        |自動生成機能◎
チューナー数  |シングル   |マルチ (上限なし)
放送波タイプ  |地上波のみ |ISDB / DVB ほとんどに対応
録画ファイル名|固定       |フォーマット変更◎
ストリーミング|cvlc:HTTP  |ffmpeg:HTTP,HLS (ライブトランスコード対応: m2ts,f4v,webm)
録画済管理    |n/a        |はい
ルール変更    |json編集   |json編集,WUI,CLI
設定変更      |json編集   |json編集,WUI
CLI           |n/a        |はい
API           |n/a        |WUI REST API
ツイート      |n/a        |はい