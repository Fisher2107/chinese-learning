---
id: republic
name: 民国
dates: 1912—1949年
book: 2
seal: 民国
color: "#4C5866"
image: =wiki/zhongshanling
hook: 十三个人开会，最后一天搬到了一条船上
stories: [ luxun, zhongshanling, maoyisheng, qiantangjiang-daqiao ]
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
  - date: 公元1926—1928年
    title: 北伐
    place: 从广州经长江流域向华北推进
    at: [ 113.26, 23.13 ]
    figures: [ chiang ]
    story: 国民革命军从广州出发，打败多支地方军队。国共合作在途中破裂，北伐仍然继续。1928年，南京国民政府获得东北方面的承认，名义上统一了大陆多数地区，各地实际控制仍有差别。
    sources:
      - { title: 牛津大学出版社｜国民党与北伐, url: https://academic.oup.com/reference/62338/reference-article/571461167 }
      - { title: 美国国务院历史办公室｜第一次国共合作, url: https://history.state.gov/milestones/1945-1952/chinese-rev }
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
中华民国在1912年建立，清帝同年退位。大陆先后经历地方军阀分治、北伐、抗日战争和国共内战。1949年，中华人民共和国成立，中华民国政府迁往台湾。
