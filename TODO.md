# To do

Left over from the map work on branch `map-explore` (2026-11-21).

## Photos

- [ ] **Finish downloading.** Run `npm run images`. It picks up where it stopped and skips what's already there.
  - So far: 76 of about 430 photos are in. The four remaining provincial photos named below have now been added; other photos are still pending.
  - Order: provinces, written cities, feed and stories first, then each remaining city's own Wikidata photo.
  - Commons throttles bulk downloads, so it's slow. The script waits between files, and skips any file Commons refuses so a later run can retry it.
- [x] **Retry the refusals.** Replaced the subjects for `place/fujian`, `city/guangzhou`, `city/lasa` and `city/zhenjiang` with explicit Commons files in `content/images.yml`. All four downloaded successfully; attribution and accepted CC BY-SA licences are recorded in `content/images.lock.json`.
- [x] **Re-fetch the changed subjects.** Updated and fetched the named replacements with credits in `content/images.lock.json`:
  - `place/shandong` and `feed/taishan` use the same verified `File:Mount Tai.jpg` photo, depicting the summit (玉皇顶).
  - `place/heilongjiang` uses `File:Zhalong.jpg`, depicting the Zhalong Nature Reserve entrance.
  - `place/taiwan` uses `File:Alishan.jpg`, a trail in Alishan National Forest Recreation Area.
- [ ] **Review every photo once downloaded.** Ambiguous names can match the wrong thing, as 泰山 did.
  - Check the label and description of each entry in `content/images.lock.json`, or look at them on the place and city pages.
  - Fix any wrong match in `content/images.yml` and run `npm run images` again.
- [ ] **Teach the daily updater about photos.** For each new 刷一刷 card, `zhongguotong-daily-update` should add a `feed/<id>: <subject>` line to `content/images.yml` and run `npm run images` before building. This changes the scheduled task, so it needs an OK first.

## City pages

- [x] **Write more city pages.** 148 of 359 cities now have a written page in `content/cities/<id>.md` with an intro and 聊天彩蛋. Added 汕尾, 惠州, 中山, 江门, 湛江, 绵阳, 南充, 曲靖, 大庆 and 包头.
  - `npm run content` completed; reviewed its several-readings warnings for these additions.

## Ship it

- [x] **Commit and open a PR for `map-explore`.** PR #6 was merged into `main` (2026-11-21). It contains:
  - the explorable map, city pages and 认地图 test;
  - 学会了 marks;
  - photos with credits.
- [ ] **Check on a real iPhone.** Pinch-zoom and flick on the map, photo loading on a slow connection, and the photo cache when offline.

## Dropped

- 听口音 (regional accent listening): dropped. AI-imitated accents are too hard to verify.
