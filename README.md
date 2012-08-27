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
* cvlc

### Supported browsers ###

* Google Chrome 21 and higher
* Apple Safari 5 and higher
* Mozilla Firefox 10 and higher
* Internet Explorer 9 and higher
* Opera 11 and higher

### alpha版からの変更点 ###

* ジョブの管理にAtdを利用していましたが、独自管理にしました。
* Node.js環境が別途必要でしたが、インストーラーが専用にビルドするようになりました。
* epgdumpが別途必要でしたが、インストーラーが専用にビルドするようになりました。
* LSBInitScriptが作成できるようになりました。
* 複数チューナー(上限なし)に対応し、多チャンネル同時録画できるようになりました。
* 地上波以外のコマンドフォーマットにも対応しました。
* 録画ファイル名のフォーマットが変更できるようになりました。
* WUI上でのライブストリーミング再生に対応しました。
* WUI上で録画済みの番組が確認できるようになりました。
* WUI上でルールや設定が変更できるようになりました。
* CLIを追加しました。

### 注意 ###

Chinachuは学術研究目的で開発された試験的なシステムです。全ての動作において無保証です。
このシステムによる全ての結果に対して当プロジェクトは一切の責任を持ちません。

このオープンソースソフトウェアは主にデジタル放送受信装置開発者を対象にしているものです。
ライセンスに従う限り誰でも自由にソースコードを利用・改変し組込開発することができます。

ドキュメント
-------------

Visit the Chinachu website for more information: <http://akkar.in/projects/chinachu/>