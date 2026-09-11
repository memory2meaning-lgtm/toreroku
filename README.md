# お家トレ（公開版・製作中）

自宅でやったトレーニングを、その場で残しておくための記録帳です。
**スマホのブラウザで開いて、ホーム画面に追加すれば、それがインストールです。**
アカウント登録はありません。サーバーもありません。記録はその端末の中だけに残ります。

> 状態：**まだ公開していません。** 画面はひととおり動いていて、手元の端末で確かめている最中です。
> 決まっていること（見た目・言葉づかい）は `design/SETTLED.md`、このリポジトリの決まりは `CLAUDE.md`。

---

## できること

- 動画つきのメニューを作って、やった日に1タップで記録する
- 一部だけやった日は、やった種目だけ選んで記録する
- 過去の日をあとから直す。時刻も直せる
- 今週やった日数が、開いた最初の画面に出る
- 記録を JSON ファイルに書き出す／読み込む（機種変更のときはこれで移す）
- 動画の URL を貼ると、YouTube からタイトルを拾ってくる
- 相棒（動物の絵）を1体選ぶ。選ばなくてもいい。画面の隅で、ときどきまばたきする
- 呼び名を決めると、アプリを開いたときのあいさつで一度だけ呼ぶ（そのあとは呼ばない）

## しないこと

- 記録をどこかへ送ること（送り先がありません）
- 動画を保存すること。動画は YouTube で開きます
- 点数をつけたり、ランキングにしたりすること

---

## 大事な一点：ホーム画面に追加してください

iPhone の Safari には、**7日間使わないとブラウザに保存したデータを消す**という決まりがあります。
ただし **ホーム画面に追加したアプリは、その対象外**です（[WebKit の説明](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)）。

記録を続けたい人は、必ずホーム画面に追加してください。見た目の話ではなく、消えないための手順です。
念のため、ときどき書き出して手元にファイルを残しておくのが確実です。

---

## ファイル

| ファイル | 中身 |
|---|---|
| `store.js` | 記録の保存・読み出し・検証のすべて。画面はここだけを呼ぶ |
| `index.html` | 画面の入れ物。読むスクリプトに `?v=NN` が付いていて、中身が変わるたびに数字が上がる |
| `app.js` | 全画面の描画と操作 |
| `companions/frames/` | 相棒の絵。1体3コマ（立ち姿・目を閉じる・小さく動く）を 256px に落としたもの |
| `tools/` | テスト・絵を配るサイズに落とす道具・手元で配るスクリプト |
| `sw.js` | 圏外でも開けるようにする係。自分のファイルだけを持つ |
| `manifest.webmanifest` | ホーム画面に追加したときの名前と色 |
| `selftest.html` | この端末で本当に保存できるかを確かめるページ |

`store.js` は、作者が自分用に使っている PC 版と同じ道筋・同じ検証・同じ答えを返します。
画面のコードもその PC 版と共通で、呼ぶ相手が変わるだけです。

## 確かめ方

```
node tools/test_store.js
```

55 件。ブラウザ側は `selftest.html` を開くと 7 件走ります（実際の記録には触れません）。

絵を作り直したときは、配るサイズに落とし直します（原画は1枚1MBあり、そのままでは配れません）。

```
python tools/build_frames.py
```

12人分の使い方を数週間ぶん流して、データの辻褄を確かめることもできます（実時間では出ない種類のズレが出ます）。

12 people, 56 days each, seed 20260911

  one video, most mornings                        43 records | 43 x recorded a menu
  three exercises, weekdays                       24 records | 24 x recorded a menu
  does part of it and says so                     20 records | 20 x recorded part of a menu
  forgets for a fortnight                          4 records | 4 x recorded a menu
  writes it down by hand                          20 records | 20 x wrote one down by hand
  corrects yesterday                              33 records | 19 x corrected an earlier day, 33 x recorded a menu
  deletes what they did not do                    17 records | 5 x deleted a record, 22 x recorded a menu
  keeps changing the menu                         24 records | 18 x rearranged a menu, 24 x recorded a menu
  moves to a new phone now and then               23 records | 3 x moved to a new phone, 23 x recorded a menu
  keeps changing their mind about the companion   29 records | 14 x changed a setting, 29 x recorded a menu
  was handed records from elsewhere               14 records | 33 x recorded a menu, 1 x took over a document from elsewhere
  barely uses it                                   6 records | 6 x recorded a menu

257 records in all. Nothing lost, nothing counted twice, and every
document still the same after being carried to another phone.

コマごとに「基準の絵からどれだけ動いたか」を出します。まばたきは 0.1% 前後、小さな動きで数%。二桁になっていたら、それは同じ絵の別コマではなく別のポーズなので、描き直します。

---

## 入れ方（配る相手に見せる想定の手順）

サーバーに置いたあと、**スマホのブラウザでその URL を開く**だけです。

- **iPhone（Safari）**：画面下の 共有 → ホーム画面に追加 → 追加
- **Android（Chrome）**：右上の ⋮ → アプリをインストール（またはホーム画面に追加）

初めて開いたときに、三つだけ聞かれます（この端末に記録が残ること・呼び名・相棒）。どれも飛ばせますし、あとから設定で変えられます。

ホーム画面に追加すると、Android では YouTube の共有先に「お家トレ」が出るようになり、動画から直接メニューを作れます。

## 残っていること

1. **実機での確認**。手元の Android で一通り触るところまで。
2. **公開の場所**（GitHub Pages）と、そこへ置く手順。

---

## ライセンス

MIT（`LICENSE`）。動画のサムネイルは YouTube 側から利用者のブラウザが直接読みます。このリポジトリはサムネイル画像を持ちません。
