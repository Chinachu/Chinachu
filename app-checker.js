/*!
 *  Chinachu SubCLI (chinachu-checker)
 * TODO: write Copyright information.
**/

var CONFIG_FILE         = __dirname + '/config.json';
var RULES_FILE          = __dirname + '/rules.json';
var CONFIG_SCHEMA       = __dirname + '/schema/schema_config.json';
var RULES_SCHEMA        = __dirname + '/schema/schema_rules.json';

// ajvのオプション
var options = {
	allErrors: true,
	verbose: true
};


// 標準モジュール
var fs = require('fs');

// npmモジュール
var jsonparse = require('json-parse-helpfulerror');
var ajv = require('ajv')(options);

// 拡張フォーマット1：ディレクトリが書き込み可能か
function check_exists_dir(dirname) {
	try {
		if(!fs.statSync(dirname).isDirectory()) {
			return false;
		}
		fs.accessSync(dirname, fs.W_OK);
		return true;
	}
	catch (e) {
		return false;
	}
}

// 拡張フォーマット2：実行可能なファイルか
function check_execute(filename) {
	try {
		fs.accessSync(filename, fs.X_OK);
		return true;
	}
	catch (e) {
		return false;
	}
}

// 拡張フォーマット3：読み込み可能なファイルか
function check_readable(filename) {
	try {
		fs.accessSync(filename, fs.R_OK);
		return true;
	}
	catch (e) {
		return false;
	}
}

// フォーマットの拡張
ajv.addFormat("directory", check_exists_dir);
ajv.addFormat("executable", check_execute);
ajv.addFormat("readable", check_readable);


// JSONファイルをスキーマでチェックする
function check_json(jsonfilename, schemafile) {
	var schema = JSON.parse(fs.readFileSync(schemafile));

	// スキーマの確認
	// if (!ajv.validateSchema(schema)) {
	// 	console.error(ajv.errors);
	// 	return;
	// }

	var validate = ajv.compile(schema);
	
	// ファイルの存在チェック
	if (!fs.existsSync(jsonfilename)) {
		console.error(jsonfilename + ": not found.");
		return false;
	}

	// JSON読み込み時のパースチェック
	try {
		var obj = jsonparse.parse(fs.readFileSync(jsonfilename));
	}
	catch (e) {
		console.error("JSON parse error.");
		console.error(e.message);
		return false;
	}

	// JSONの内容がスキーマに一致しているかチェック
	var result = validate(obj);
	if (!result) {
		// エラーメッセージの出力
		validate.errors.forEach(function(err, idx) {
			switch (err.keyword) {
				case 'type':
				case 'format':
					console.error("ERROR: " + err.dataPath + ": " + err.message + " value: " + JSON.stringify(err.data));
					break;
				case 'enum':
					console.error("ERROR: " + err.dataPath + ": " + err.message + ": [" + err.schema + "] value: " + err.data);
					break;
				case 'oneOf':
					console.error("ERROR: " + err.dataPath + ": " + err.message + err.schema);
					break;
				case 'additionalProperties':
				case 'required':
					// dataは長くなるので出力しない
					console.error("ERROR: " + err.dataPath + ": " + err.message);
					break;
				default:
					console.error("ERROR: " + err.dataPath + ": " + err.message);
			}
		});
		return false;
	}
	return true;
}

console.log("Checking " + CONFIG_FILE);
var ret_config = check_json(CONFIG_FILE, CONFIG_SCHEMA);

console.log("Checking " + RULES_FILE);
var ret_rules = check_json(RULES_FILE, RULES_SCHEMA);

var ret = ret_config && ret_rules;

if (ret) {
	console.log("Check OK.");
	process.exit(0);
}
else {
	console.log("Check NG.");
	process.exit(1);
}

