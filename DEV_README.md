# 開発者向けドキュメント

## chinachu check 用JSON Schemaの書き方について

config.jsonに項目を追加した場合は、schema/schema_config.json に項目を追加する必要があります。

詳しくは http://spacetelescope.github.io/understanding-json-schema/index.html を見るのが良いのですが、簡単な例を書いておきます。

基本的にはpropertiesの中に、
```
"項目名": {
  "type": "string"
}
```
みたいな項目を追加すればOKです。数値の場合は type を "number" にすればOK。真偽値の場合は "boolean"に。

wuiHostとかみたいに、string または null の場合は oneOf を使って書きます。既存の項目を参考にして書いてください。

### いくつかの中から選択する場合
"enum": ["OPTION1", "OPTION2", "OPTION3"] のようにしてやると、選択肢に無い値が設定された場合エラーになります。


### 拡張フォーマットの使用方法

directory, executable, readable の3つの "format" 指定を用意してあります。
"type": "string" に対して、"format": "directory" などとすると書き込み可能なディレクトリであるかどうかチェックしてくれます。

executable は実行可能なファイルか、readable は読み込み可能なファイルかをチェックします。

