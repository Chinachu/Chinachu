Chinachu
========

Chinachuは、Linux向けに作られた、テレビ番組をEPG情報を元に自動で録画予約するためのシステムです。
`Node.js`、`epgdump`等を利用して録画予約の完全自動化及びリアルタイムWUIを実現しています。
Node.jsを利用するリアルタイムWUIは、ウェブサーバーとして独立していますので、Apache等は不要です。
尚、Node.jsはChinachuのインストーラーが自身専用にビルドするので、環境準備は不要です。

### Require ###

* build-essential
* libssl-dev
* bash
* curl
* git
* ffmpeg

### Supported browsers ###

* Google Chrome 21 and higher
* Apple Safari 5 and higher
* Mozilla Firefox 10 and higher
* Internet Explorer 9 and higher
* Opera 11 and higher

### alpha版からの変更点 ###

要素          |alpha      |beta
--------------|-----------|---------------------------
ジョブ管理    |Atd        |独自実装 (chinachu-operator)
Node.js       |構築が必要 |専用に自動構築
epgdump       |構築が必要 |専用に自動構築 ([stz2012/epgdump](https://github.com/stz2012/epgdump))
LSBInitScript |n/a        |自動生成機能◎
チューナー数  |シングル   |マルチ (上限なし)
放送波タイプ  |地上波のみ |地上波/衛星波/ケーブルその他
録画ファイル名|固定       |フォーマット変更◎
ストリーミング|cvlc:HTTP  |ffmpeg:HTTP,HLS (ライブトランスコード対応: m2ts,f4v,webm)
録画済管理    |n/a        |はい
ルール変更    |json編集   |json編集,WUI,CLI
設定変更      |json編集   |json編集,WUI
CLI           |n/a        |はい
API           |n/a        |WUI REST API
ツイート      |n/a        |はい

### 注意 ###

Chinachuは学術研究目的で開発された試験的なシステムです。全ての動作において無保証です。
このシステムによる全ての結果に対して当プロジェクトは一切の責任を持ちません。

このオープンソースソフトウェアは主にデジタル放送受信装置開発者を対象にしているものです。
ライセンスに従う限り誰でも自由にソースコードを利用・改変し組込開発することができます。

ドキュメント
-------------

Visit the Chinachu website for more information: <http://akkar.in/projects/chinachu/>