import assert from 'node:assert/strict';

// Delivery recovery reuses the same conversation. It is intentionally separate
// from the optional workflow that edits a picture the user has already received.
export function assertDeliveryRetry(text,originalPrompt='',label='delivery retry'){
 assert.equal(typeof text,'string',label+' must be copyable text');
 assert(text.length>50&&text.length<=300,label+' must stay short enough to resend directly');
 assert.match(text,/同じチャット.*添付画像.*先ほどの作画条件/,label+' lost the existing inputs');
 assert.match(text,/画像作成機能.*実行/,label+' does not request the actual image operation');
 assert.match(text,/完成画像.*1枚.*この返信.*通常の生成画像.*表示/,label+' can finish with prose alone');
 assert.match(text,/画像が実際に返るまでは.*完成しました.*表示しました.*伝えない/,label+' permits an unverified success claim');
 assert.match(text,/参照不足.*利用不可.*上限.*生成失敗.*確認できた状態/,label+' hides a real image failure');
 assert.doesNotMatch(text,/元の制作仕様|【短い統合制作指示】|再アップロード|ファイルを.*(?:編集|探)|実ファイル|新しく描き直さず/,label+' restarts the long prompt or file workflow');
 if(originalPrompt)assert(!text.includes(originalPrompt),label+' repeats the full original prompt');
}

export function assertImmediateImageDelivery(text,label='image delivery'){
 assert.match(text,/完成画像(?:を)?1枚|完成画像を1枚|完成した画像そのものを1枚/,label+' lost the one-image output');
 assert.match(text,/通常(?:の生成画像として表示|表示)|画像作成機能の通常表示/,label+' lost the native image result');
 assert.match(text,/サイズ.*(?:縦横比|比率)|(?:縦横比|比率).*サイズ/,label+' lost requested image framing');
 assert.match(text,/画像.*表示.*(?:先|優先)|(?:先|優先).*画像.*表示/,label+' lets inspection block image delivery');
 assert.doesNotMatch(text,/実ファイルで照合|実際の生成寸法が不足なら|不足があればその生成画像を編集/,label+' adds an inspection or edit loop before delivery');
}
