---
id: republic
name: 民国
dates: 1912—1949年
book: 2
seal: 民国
color: "#4C5866"
image: =wiki/zhongshanling
hook: 十三个人开会，最后一天搬到了一条船上
stories: [ sunzhongshan, yuanshikai, wusi-yundong, luxun, zhonggong-yida, jiangjieshi, changzheng, xian-shibian, kangri-zhanzheng, nanjing-datusha, guogong-neizhan, zhongshanling, maoyisheng, qiantangjiang-daqiao ]
series: [ maozedong-shaoshan ]
quiz:
  - q: 中华民国是哪一年建立的？
    options: [ 1912年, 1911年, 1919年, 1949年 ]
    answer: 0
    why: 1911年10月武昌起义，1912年1月1日孙中山在南京就任临时大总统，中华民国成立；同年2月清朝皇帝退位。
  - q: 1919年5月4日，北京的学生为什么走上街头？
    options: [ 巴黎和会要把德国在山东的权益交给日本, 清朝皇帝退位, 日本占领了东北, 袁世凯去世了 ]
    answer: 0
    why: 中国在第一次世界大战里站在战胜国一边，可是巴黎和会却把德国在山东的权益交给了日本。北京的学生上街抗议，这就是五四运动。
  - q: 1936年西安事变里，是谁扣押了蒋介石？
    options: [ 张学良和杨虎城, 毛泽东和周恩来, 袁世凯, 日本军队 ]
    answer: 0
    why: 东北军的张学良和西北军的杨虎城扣押了蒋介石，要他停止内战、联合抗日。事变和平解决，国共两党第二次合作。
  - q: 今天中国大陆的课本里，抗日战争一共打了几年？
    options: [ 十四年, 八年, 三年, 二十年 ]
    answer: 0
    why: 过去常说“八年抗战”，从1937年卢沟桥事变算起；2017年起，课本统一用“十四年抗战”，从1931年九一八事变算起。
map:
  box: [ 95, 18, 130, 48 ]
  capitals:
    - { name: 南京, at: [ 118.78, 32.06 ], of: 国民政府 }
    - { name: 重庆（陪都）, at: [ 106.55, 29.56 ], of: 国民政府 }
    - { name: 延安, at: [ 109.49, 36.6 ], of: 中共中央 }
  states:
    - name: 伪满洲国
      kind: occupied
      note: 1932年日本在东北扶植的政权，1945年垮台
      provinces: [ heilongjiang, jilin, liaoning ]
      cities: [ hulunbeier, xingan, tongliao, chifeng ]
    - name: 日本占领区
      kind: occupied
      note: 1940年前后日军占领的地方（大致）
      provinces: [ beijing, tianjin, hebei, shandong, jiangsu, shanghai, hainan ]
      cities: [ taiyuan, datong, shuozhou, xinzhou, yangquan, jinzhong, changzhi, linfen, yuncheng, jincheng, anyang, hebi, xinxiang, jiaozuo, puyang, kaifeng, shangqiu, bengbu, huainan, hefei, wuhu, maanshan, chuzhou, suzhou-anhui, huaibei, tongling, anqing, hangzhou, jiaxing, huzhou, wuhan, xiaogan, ezhou, huangshi, yichang, jingzhou, jingmen, xianning, nanchang, jiujiang, guangzhou, foshan, dongguan, zhongshan, jiangmen, shantou, chaozhou, shenzhen, huhehaote, baotou, xilinguole, wulanchabu ]
    - name: 台湾
      kind: occupied
      note: 1895—1945年是日本的殖民地
      provinces: [ taiwan ]
    - { name: 陕甘宁边区, note: 中共中央所在的地方，首府延安, cities: [ yanan, qingyang ] }
  routes:
    - { name: 北伐（1926—1928年）, line: [ [ 113.26, 23.13 ], [ 113.6, 24.8 ], [ 112.94, 28.23 ], [ 114.3, 30.55 ], [ 115.86, 28.68 ], [ 118.78, 32.06 ], [ 117.2, 34.26 ], [ 117, 36.65 ], [ 116.4, 39.9 ] ] }
    - { name: 中央红军长征（1934—1935年）, line: [ [ 116.03, 25.89 ], [ 115.41, 25.95 ], [ 111.07, 25.93 ], [ 109.13, 26.23 ], [ 106.93, 27.73 ], [ 105.7, 28.59 ], [ 102.4, 26 ], [ 102.25, 26.65 ], [ 102.23, 29.91 ], [ 102.7, 30.8 ], [ 102.36, 31 ], [ 103.3, 32.4 ], [ 103.85, 34.1 ], [ 104.24, 34.2 ], [ 108.17, 36.92 ] ] }
  pins:
    - { name: 嘉兴南湖（中共一大最后一天）, at: [ 120.76, 30.75 ] }
people:
  sunyat:
    name: 孙中山
    role: 长期推动反清革命，民国建立时任临时大总统
  chiang:
    name: 蒋介石
    role: 领导国民党方面，内战后前往台湾
  mao:
    name: 毛泽东
    role: 领导中共，并在北京宣告中华人民共和国成立
timeline:
  - date: 公元1911—1912年
    title: 辛亥革命与民国建立
    place: 武昌（今湖北武汉）、南京与北京
    at: [ 114.3, 30.55 ]
    figures: [ sunyat ]
    story: 武昌起义后，多个省宣布脱离清朝。孙中山在南京就任临时大总统。1912年，清帝退位，原先由清朝统治的大部分地区开始由民国政府接管。
    sources:
      - { title: 辛亥革命博物院｜武昌起义军政府旧址, url: https://www.1911museum.cn/view_2910.html }
      - { title: 南京中国近代史遗址博物馆｜孙中山就职处, url: https://www.njztf.cn/west/detail/697.html }
      - { title: 中国国家博物馆｜清帝退位诏书, url: https://www.chnmuseum.cn/zp/zpml/gmww/202008/t20200824_247195.shtml }
  - date: 公元1919年
    title: 五四运动
    place: 北京
    at: [ 116.4, 39.92 ]
    story: 巴黎和会要把德国在山东的权益交给日本，5月4日北京的学生上街抗议，后来上海等地的工人罢工、商人罢市。中国代表最后没有在和约上签字。今天的5月4日是青年节。
    sources:
      - { title: 维基百科：五四运动, url: https://zh.wikipedia.org/wiki/五四运动 }
  - date: 公元1921年7月
    title: 中国共产党成立
    place: 上海与浙江嘉兴南湖
    at: [ 121.47, 31.22 ]
    figures: [ mao ]
    story: 十三个代表在上海开中共第一次全国代表大会，会议被法国巡捕发现以后，最后一天搬到嘉兴南湖的一条游船上开完。长沙来的代表里有毛泽东。
    sources:
      - { title: 共产党员网：中国共产党第一次全国代表大会, url: https://www.12371.cn/special/lcdh/1d/ }
      - { title: 维基百科：中国共产党第一次全国代表大会, url: https://zh.wikipedia.org/wiki/中国共产党第一次全国代表大会 }
  - date: 公元1926—1928年
    title: 北伐
    place: 从广州经长江流域向华北推进
    at: [ 113.26, 23.13 ]
    figures: [ chiang ]
    story: 国民革命军从广州出发，打败多支地方军队。国共合作在途中破裂，北伐仍然继续。1928年，南京国民政府获得东北方面的承认，名义上统一了大陆多数地区，各地实际控制仍有差别。
    sources:
      - { title: 牛津大学出版社｜国民党与北伐, url: https://academic.oup.com/reference/62338/reference-article/571461167 }
      - { title: 美国国务院历史办公室｜第一次国共合作, url: https://history.state.gov/milestones/1945-1952/chinese-rev }
  - date: 公元1934—1936年
    title: 长征
    place: 从江西于都到陕北吴起
    at: [ 106.93, 27.73 ]
    figures: [ mao ]
    story: 红军在第五次反“围剿”中失败，1934年10月离开中央苏区往西走。1935年1月的遵义会议确立了毛泽东的军事领导地位。10月，中央红军到达陕北的吴起镇；1936年10月，三个方面军在甘肃会宁会师。
    sources:
      - { title: 维基百科：长征, url: https://zh.wikipedia.org/wiki/长征 }
      - { title: 维基百科：遵义会议, url: https://zh.wikipedia.org/wiki/遵义会议 }
  - date: 公元1936年12月
    title: 西安事变
    place: 陕西西安临潼的华清池
    at: [ 109.21, 34.36 ]
    figures: [ chiang ]
    story: 张学良和杨虎城扣押了来西安督战的蒋介石，要他停止内战、联合抗日。12月25日，蒋介石回到南京，事变和平解决。
    sources:
      - { title: 维基百科：西安事变, url: https://zh.wikipedia.org/wiki/西安事变 }
  - date: 公元1937—1945年
    title: 抗日战争进入全面阶段
    place: 卢沟桥、华北、沿海与西南
    at: [ 116.22, 39.85 ]
    figures: [ chiang, mao ]
    story: 日本从1931年起逐步占领中国东北。1937年，卢沟桥事变后全面战争爆发，日军陆续占领多个重要城市，国民政府迁往重庆，国共各自组织抗战。1945年日本投降，占领结束。
    sources:
      - { title: 牛津大学历史系｜中国的抗日战争, url: https://www.history.ox.ac.uk/chinas-war-japan }
      - { title: 牛津书目｜1937—1945年的中日战争, url: https://doi.org/10.1093/obo/9780199743292-0141 }
    rank: 6
    hook: 沿海多座城市失守后，为什么重庆成了中国继续抗战的政治中心？
  - date: 公元1946—1949年
    title: 国共全面内战与1949年政局
    place: 东北、华北、长江流域与台湾
    at: [ 117.2, 34.26 ]
    figures: [ mao, chiang ]
    story: 日本投降后，国共之间的争夺再次扩大。到1949年，中国共产党控制了大陆大部分地区，中华人民共和国在北京宣告成立。国民党领导的中华民国政府迁往台湾。
    sources:
      - { title: 英国国家档案馆｜中国内战档案, url: https://www.nationalarchives.gov.uk/education/resources/the-chinese-civil-war/ }
      - { title: 美国国务院历史办公室｜1949年的中国政局, url: https://history.state.gov/milestones/1945-1952/chinese-rev }
---
1912年，清朝最后一个皇帝退位，中华民国成立了。可是民国的三十多年里，中国几乎没有真正太平过：[[袁世凯]]想当皇帝，各地的军阀互相打仗；国民党北伐统一了中国，又和共产党打了十年；日本从东北一路打进中国，[[抗日战争]]打了十四年；日本投降以后，国共两党又打了一场[[国共内战]]。1949年，共产党赢了，国民党政府退到了台湾。今天海峡两岸的样子，就是从这里来的。
---more---
民国开始的时候很热闹。[[孙中山]]当了临时大总统，可是手里没有兵，几个月后就把位子让给了握着北洋军的[[袁世凯]]。1915年底袁世凯称帝，只做了一百来天皇帝梦，就病死了。之后十几年，北京的政府换来换去，各省的军阀各管各的。

年轻人在找新的路。1919年，巴黎和会要把德国在山东的权益交给日本，北京的学生走上了街头，这就是[[五四运动]]。[[鲁迅]]用白话写小说，批评旧的礼教。两年以后，十三个年轻人在上海和嘉兴开会，成立了中国共产党（见[[中共一大]]）。

1924年，国民党和共产党第一次合作，在广州办了黄埔军校，校长是[[蒋介石]]。1926年北伐开始，两年就打到了北京。可是半路上，国共两党翻了脸。共产党上了山，在江西建立根据地；1934年，红军被迫开始[[长征]]，一年后到了陕北。

1931年，日本占了东北。1936年底的[[西安事变]]让国共两党又一次合作。1937年7月7日，卢沟桥的枪声让全面战争开始了；这一年12月，日军攻进南京，屠杀了大量平民和放下武器的士兵（见[[南京大屠杀]]）。国民政府搬到重庆，一直坚持到1945年8月日本投降。

和平只维持了不到一年。三年多的内战里，共产党从陕北的窑洞一路打到了南京。1949年10月1日，毛泽东在北京宣布中华人民共和国中央人民政府成立；年底，国民党政府退到了台湾。

## 聊天提示
- 骄傲：抗战胜利是很多中国人心里的骄傲。[[孙中山]]两岸都尊敬，大陆叫他“革命先行者”，台湾叫他“国父”。[[长征]]、飞夺泸定桥，是课本里的英雄故事。
- 经历过：亲身经历过抗战的人今天已经很少了，可是很多家庭都有爷爷奶奶逃难的故事。[[南京大屠杀]]是南京人心里的痛。
- 少提：别拿[[南京大屠杀]]的人数开玩笑，也别轻松地说“日本人也是受害者”。[[蒋介石]]和国民党在抗战里的作用，大陆过去讲得少，现在讲得多了一些，先听对方怎么说。在大陆，别把台湾当成一个国家来说。

## 聊天彩蛋
- 5月4日是“五四青年节”，十四岁到二十八岁的年轻人可以放半天假。它纪念的就是1919年的[[五四运动]]。
  问：五四青年节谁可以放半天假？
  标：节日
- 共产党的生日是7月1日，可是[[中共一大]]是7月23日开幕的。1938年在延安要纪念建党，参加过一大的毛泽东和董必武只记得是7月，就定了7月1日。
  问：为什么党的生日是7月1日？
  标：节日
- 每年的9月3日是抗战胜利纪念日，12月13日是南京大屠杀死难者国家公祭日，都是2014年全国人大常委会定下来的。
  问：12月13日是什么日子？
  标：节日
- [[孙中山]]的家乡香山县，在他死后改名叫中山县，就是今天的广东中山市。全国很多城市都有“中山路”和“中山公园”。
  问：为什么很多城市都有“中山路”？
  标：还在说
- 中国的运载火箭叫“长征”系列。人们说一件很难、很长的事，也会说“这是一次新的长征”。
  问：中国的运载火箭叫什么名字？
  标：还在说
- 西安事变以后，张学良先在大陆、后在台湾被软禁了五十多年，2001年在美国夏威夷去世，活到了一百岁。
  问：张学良后来怎么样了？
  标：还在说
- [[蒋介石]]1975年在台北去世，灵柩到今天还暂时放在桃园的慈湖，没有正式下葬。
  问：蒋介石葬在哪里？
  标：还在说
