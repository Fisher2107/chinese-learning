# To do

Left over from the map work on branch `map-explore` (2026-11-21).

## Photos

- [ ] **Finish downloading.** Run `npm run images`. It picks up where it stopped and skips what's already there.
  - So far: 68 of about 430 photos are in, all provinces done except 黑龙江, 福建, 山东 and 台湾.
  - Order: provinces, written cities, feed and stories first, then each remaining city's own Wikidata photo.
  - Commons throttles bulk downloads, so it's slow. The script waits between files, and skips any file Commons refuses so a later run can retry it.
- [ ] **Retry the refusals.** Commons refused the thumbnails for `place/fujian`, `city/guangzhou`, `city/lasa` and `city/zhenjiang`. If they keep failing, give them a different subject or a `File:` in `content/images.yml`.
- [ ] **Re-fetch the changed subjects.** The next run handles these automatically:
  - `place/shandong` and `feed/taishan` are now `Mount Tai`. The old match was a mythological figure called 泰山.
  - `place/heilongjiang` is now the 扎龙 crane reserve (`Zhalong National Nature Reserve`). 镜泊湖 was hazy and 五大连池 matched nothing. If this misses too, use a `Q…` id or a `File:`.
  - `place/taiwan` is now 阿里山. The 日月潭 file was a satellite image under a licence we don't accept.
- [ ] **Review every photo once downloaded.** Ambiguous names can match the wrong thing, as 泰山 did.
  - Check the label and description of each entry in `content/images.lock.json`, or look at them on the place and city pages.
  - Fix any wrong match in `content/images.yml` and run `npm run images` again.
- [ ] **Teach the daily updater about photos.** For each new 刷一刷 card, `zhongguotong-daily-update` should add a `feed/<id>: <subject>` line to `content/images.yml` and run `npm run images` before building. This changes the scheduled task, so it needs an OK first.

## City pages

- [ ] **Write more city pages.** 138 of 359 cities have a written page in `content/cities/<id>.md` with an intro and 聊天彩蛋. The rest show only basic facts (province, population).
  - Write the most-visited ones next, e.g. 汕尾, 惠州, 中山, 江门, 湛江, 绵阳, 南充, 曲靖, 大庆, 包头.
  - Run `npm run content` after adding pages and check the "several readings" warnings it prints.

## Ship it

- [ ] **Commit and open a PR for `map-explore`.** It contains:
  - the explorable map, city pages and 认地图 test;
  - 学会了 marks;
  - photos with credits.
- [ ] **Check on a real iPhone.** Pinch-zoom and flick on the map, photo loading on a slow connection, and the photo cache when offline.

## Dropped

- 听口音 (regional accent listening): dropped. AI-imitated accents are too hard to verify.
