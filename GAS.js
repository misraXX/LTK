/**
 * Firestore接続設定をデバッグするための関数です。
 * これを実行してログを確認してください。
 */
function debugFirestoreProperties() {
  const properties = PropertiesService.getScriptProperties();
  const privateKey = properties.getProperty('PRIVATE_KEY');
  const clientEmail = properties.getProperty('CLIENT_EMAIL');
  const projectId = properties.getProperty('PROJECT_ID');

  console.log('--- Firestore Script Properties Debug ---');

  if (privateKey) {
    console.log('PRIVATE_KEY:');
    console.log('  - Length: ' + privateKey.length);
    console.log('  - Starts with: ' + privateKey.substring(0, 35));
    console.log('  - Ends with: ' + privateKey.substring(privateKey.length - 35));
  } else {
    console.log('PRIVATE_KEY が見つかりません。スクリプトプロパティでキーの名前が「PRIVATE_KEY」になっているか確認してください。');
  }

  if (clientEmail) {
    console.log('CLIENT_EMAIL: ' + clientEmail);
  } else {
    console.log('CLIENT_EMAIL が見つかりません。');
  }

  if (projectId) {
    console.log('PROJECT_ID: ' + projectId);
  } else {
    console.log('PROJECT_ID が見つかりません。');
  }
  
  console.log('--- Attempting to use the key ---');
  try {
    const keyToTest = properties.getProperty('PRIVATE_KEY').replace(/\\n/g, '\n');
    Utilities.computeRsaSha256Signature("test data", keyToTest);
    console.log('SUCCESS: The private key was used successfully to sign test data.');
  } catch (e) {
    console.error('FAILURE: The private key is invalid. The test signature failed.');
    console.error(e);
  }
  console.log('------------------------------------');
}

/**
 * このスクリプトで同期したいシートとFirestoreのコレクション設定
 */
const syncConfigs = [
  {
    sheetName: 'スクリム結果',
    collectionName: 'scrim_results',
    docIdHeader: 'matchId' // ドキュメントIDとして使用する列のヘッダー名
  },
  {
    sheetName: '配信者一覧',
    collectionName: 'streamers',
    docIdHeader: '配信者ID'
  },
  {
    sheetName: '大会スケジュール',
    collectionName: 'events',
    docIdHeader: 'イベントID'
  }
];


/**
 * メイン関数: この関数を実行すると、syncConfigsで定義されたすべてのシートのデータがFirestoreに同期されます。
 */
function syncAllSheetsToFirestore() {
  const firestore = getFirestoreInstance();
  if (!firestore) {
    console.error("Firestoreインスタンスの取得に失敗したため、処理を中断します。");
    return;
  }
  
  console.log(`全 ${syncConfigs.length} 件の同期処理を開始します...`);

  syncConfigs.forEach(config => {
    syncSheet(firestore, config.sheetName, config.collectionName, config.docIdHeader);
  });

  console.log("すべての同期処理が完了しました。");
}


/**
 * 1つのシートから対応するコレクションへデータを同期する汎用関数
 * @param {object} firestore - Firestoreのインスタンス
 * @param {string} sheetName - データを読み込むシート名
 * @param {string} collectionName - 書き込み先のコレクション名
 * @param {string} docIdHeader - ドキュメントIDとして使用する列のヘッダー名
 */
function syncSheet(firestore, sheetName, collectionName, docIdHeader) {
  console.log(`--- [開始] シート: "${sheetName}" -> コレクション: "${collectionName}" ---`);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    console.error(`  [エラー] シート「${sheetName}」が見つかりません。このシートの同期はスキップされます。`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    console.log(`  [情報] シート「${sheetName}」にはヘッダー以外のデータがないため、スキップします。`);
    return;
  }
  
  const headers = data.shift();
  const docIdIndex = headers.indexOf(docIdHeader);

  if (docIdIndex === -1) {
    console.error(`  [エラー] シート「${sheetName}」に、指定されたID列「${docIdHeader}」が見つかりません。このシートの同期はスキップされます。`);
    return;
  }

  console.log(`  ${data.length}件のデータを同期します...`);

  data.forEach((row, rowIndex) => {
    const docId = row[docIdIndex];
    if (!docId) {
      console.warn(`  [警告] ${rowIndex + 2}行目: IDが空のためスキップしました。`);
      return;
    }

    const docData = {};
    headers.forEach((header, index) => {
      if (header) {
        // 全ての値を文字列として登録（必要に応じて数値変換のロジックを後で追加）
        docData[header] = String(row[index]);
      }
    });

    try {
      firestore.set(collectionName, String(docId), docData);
    } catch (e) {
      console.error(`  [失敗] ${rowIndex + 2}行目 (${docId}) の書き込み中にエラー: ${e.toString()}`);
    }
  });

  console.log(`--- [完了] シート: "${sheetName}" -> コレクション: "${collectionName}" ---`);
}


// --- Firestore操作のためのヘルパー関数群 (ここから下は変更不要) ---

const getFirestoreInstance = () => {
  try {
    const properties = PropertiesService.getScriptProperties();
    const privateKey = properties.getProperty('PRIVATE_KEY').replace(/\\n/g, '\n');
    const clientEmail = properties.getProperty('CLIENT_EMAIL');
    const projectId = properties.getProperty('PROJECT_ID');
    
    if (!privateKey || !clientEmail || !projectId) {
      throw new Error('スクリプトプロパティ (PRIVATE_KEY, CLIENT_EMAIL, PROJECT_ID) が設定されていません。');
    }
    
    const firestore = new Firestore(projectId, privateKey, clientEmail);
    return firestore;
  } catch (e) {
    console.error('Firestoreインスタンスの取得に失敗しました。スクリプトプロパティを確認してください。', e);
    return null;
  }
};

class Firestore {
  constructor(projectId, privateKey, clientEmail) {
    this.projectId = projectId;
    this.token = this.getAccessToken(privateKey, clientEmail);
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  }
  
  getAccessToken(privateKey, clientEmail) {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = { iss: clientEmail, sub: clientEmail, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600, scope: 'https://www.googleapis.com/auth/datastore' };
    const signatureBase = Utilities.base64EncodeWebSafe(JSON.stringify(header)) + '.' + Utilities.base64EncodeWebSafe(JSON.stringify(claim));
    const signature = Utilities.computeRsaSha256Signature(signatureBase, privateKey);
    const jwt = signatureBase + '.' + Utilities.base64EncodeWebSafe(signature);
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', contentType: 'application/x-www-form-urlencoded', payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt } });
    return JSON.parse(response.getContentText()).access_token;
  }
  
  set(collectionName, docId, data) {
    const firestoreFields = {};
    for (const key in data) {
      const value = data[key];
      if (typeof value === 'number') {
        firestoreFields[key] = { doubleValue: value };
      } else if (typeof value === 'string') {
        firestoreFields[key] = { stringValue: value };
      } else {
        firestoreFields[key] = { stringValue: String(value) };
      }
    }
    
    const url = `${this.baseUrl}/${collectionName}/${docId}`;
    const options = {
      method: 'patch',
      headers: { 'Authorization': `Bearer ${this.token}` },
      contentType: 'application/json',
      payload: JSON.stringify({ fields: firestoreFields })
    };
    
    UrlFetchApp.fetch(url, options);
  }
}