---
id: warring
name: 战国
dates: 约公元前475—前221年
book: 1
song: 春秋和战国，一统秦两汉。
seal: 战国
color: "#B5523B"
image: 曾侯乙编钟
hook: 一位诗人跳进了江里，两千年后我们还在为他划龙舟
stories: [ libing, dujiangyan-gongcheng ]
map:
  box: [ 102, 25, 126, 43 ]
  capitals:
    - { name: 咸阳, at: [ 108.7, 34.33 ], of: 秦 }
    - { name: 邯郸, at: [ 114.49, 36.6 ], of: 赵 }
    - { name: 大梁, at: [ 114.31, 34.8 ], of: 魏 }
    - { name: 新郑, at: [ 113.73, 34.4 ], of: 韩 }
    - { name: 临淄, at: [ 118.3, 36.85 ], of: 齐 }
    - { name: 陈, at: [ 114.88, 33.73 ], of: 楚 }
    - { name: 蓟, at: [ 116.4, 39.9 ], of: 燕 }
  states:
    - { name: 秦, provinces: [ shaanxi, chongqing ], cities: [ tianshui, pingliang, qingyang, longnan, dingxi, chengdu, nanchong, dazhou, yibin, mianyang, luzhou, guangan, deyang, neijiang, bazhong, suining, leshan, meishan, zigong, ziyang, guangyuan, yaan, shiyan, xiangyang, yichang, jingzhou, jingmen, enshi, sanmenxia, nanyang ] }
    - { name: 赵, cities: [ handan, xingtai, shijiazhuang, hengshui, taiyuan, jinzhong, xinzhou, datong, shuozhou, yangquan, lvliang, huhehaote, baotou ] }
    - { name: 魏, cities: [ kaifeng, xinxiang, hebi, puyang, anyang, shangqiu ] }
    - { name: 韩, cities: [ zhengzhou, xuchang, pingdingshan, luohe, jincheng, changzhi ] }
    - { name: 齐, cities: [ zibo, weifang, qingdao, yantai, weihai, dongying, binzhou, jinan, dezhou, liaocheng, taian, rizhao, heze, jining, linyi, zaozhuang ] }
    - { name: 楚, provinces: [ hunan, anhui, jiangsu, shanghai ], cities: [ wuhan, huanggang, xiaogan, suizhou, xianning, huangshi, ezhou, xinyang, zhumadian, zhoukou, jiujiang, nanchang, shangrao, jingdezhen, yingtan, yichun, fuzhou-jiangxi, xinyu, pingxiang, hangzhou, huzhou, jiaxing, shaoxing, ningbo, jinhua, quzhou ] }
    - { name: 燕, provinces: [ beijing, tianjin, liaoning ], cities: [ baoding, langfang, tangshan, cangzhou, zhangjiakou, chengde, qinhuangdao ] }
    - { name: 周, cities: [ luoyang ] }
  pins:
    - { name: 汨罗江（屈原投江的地方）, at: [ 113.1, 28.8 ] }
people:
  sunbin:
    name: 孙膑
    role: 帮助齐军打败魏军的军事顾问
  baiqi:
    name: 白起
    role: 在长平之战后期指挥秦军的将领
  first-emperor:
    name: 秦王嬴政
    role: 在位时兼并六国，后来称秦始皇
timeline:
  - date: 约公元前341年
    title: 马陵之战
    place: 马陵（具体位置有争议）
    at: [ 115.5, 35.85 ]
    figures: [ sunbin ]
    story: 魏国攻打韩国，韩国向齐国求援。孙膑为齐军出谋划策，魏军在马陵大败。魏在中原的影响受到打击，齐在东方的地位上升。
    sources:
      - { title: 《史记·孙子吴起列传》, url: https://www.shidianguji.com/book/CADAL01027342/chapter/1mbbmryj6pjca }
      - { title: 山东地情档案｜马陵古战场的不同说法, url: https://shandong-chorography.org/database/zzmj/section/16/article/13/ }
  - date: 公元前260年
    title: 长平之战
    place: 长平（今山西高平一带）
    at: [ 112.92, 35.8 ]
    figures: [ baiqi ]
    story: 秦、赵两国为争夺上党发生大战。白起指挥秦军打败赵军，大量赵兵在投降后被杀，具体人数仍有争议。赵国元气大伤，秦与其他各国的实力差距随之扩大。
    sources:
      - { title: 悉尼科技大学研究库｜长平之战研究, url: https://opus.lib.uts.edu.au/bitstream/10453/183828/3/A%20Study%20on%20the%20Battle%20of%20Changping.pdf }
      - { title: 山东大学历史文化学院｜长平之战纪念馆, url: https://www.history.sdu.edu.cn/history/info/1308/20051.htm }
    rank: 3
    hook: 为什么一次大战，就让一个能和秦对抗的强国失去了优势？
  - date: 公元前230—前221年
    title: 秦灭六国
    place: 自关中向东、向南，最后到齐国
    figures: [ first-emperor ]
    story: 秦先灭韩国，再陆续灭掉赵、魏、楚、燕，最后接受齐国投降。秦王嬴政称皇帝，把原来各国的土地纳入同一套行政体系，战国也随之结束。
    sources:
      - { title: 中国国家博物馆｜秦汉时期, url: https://www.chnmuseum.cn/portals/0/web/zt/gudai/detail4.html }
      - { title: 美国国家美术馆｜中国考古与早期帝国, url: https://www.nga.gov/sites/default/files/migrate_images/content/dam/ngaweb/education/learning-resources/teaching-packets/pdfs/chinese-archaeology-tp.pdf }
    rank: 4
    hook: 把七国地图和秦朝地图放在一起看，为什么最后留下的是西边的秦？
---
几百年间，许多小国被兼并，秦、楚、齐、燕、韩、赵、魏成为主要强国。各国不只争影响力，也争对土地和人口的直接控制。
