원격 지역난방 조절기
===============

### 본 소스는 왁스형 구동기(상시열림)을 기준으로 작성되었습니다.
※ 난방 밸브 구동기는 가정마다 다를 수 있으며, 각 가정에 설치된 구동기에 맞게 소스 수정이 필요합니다.
<br/>

#### 준비물
* Thingplus와 연동 된 BBB(BBG) 
* [릴레이](http://bit.ly/1OYe8ka)
* 전선

#### 하드웨어 연결
![connection](https://raw.github.com/daliworks/openhardware/beaglebonegreen/boiler/doc/image/connection.png "connection")

1. 왁스형 구동기와 릴레이 연결
   * 왁스형 구동기에는 2개의 선이 있으며 하나는 전원 커넥터로 연결되어 있으며, 다른 하나는 방안의 온도 조절기와 연결되어 있습니다. 이 중 온도조절기와 연결되어 있는 선을 릴레이와 연결합니다.
* 온도조절기와 릴레이 연결
   * 온도조절기에서 오는 선도 릴레이와 연결합니다.   
* 릴레이 전원 및 신호선 연결
 
REALY | BBB
------|-----
VCC|VCC(P9 PIN7)
GND|GND(P9 PIN1)
IN2|GPIO20(P9 PIN41)
##### 주의 : 릴레이-왁스형 구동기-온도 조절기 사이에는 220V가 흐릅니다. 감전에 주의하세요.


#### 소프트웨어
* app.js
   * DeviceAgent부분으로 Thingplus Gateway에서 명령어를 받아 해석하고, 상황에 맞게 릴레이를 동작시킨다.
* boiler.js
   * Gpio에 값을 적어 릴레이를 켜고, 끄는 동작을 한다.

#### 참고자료
[왁스형 구동기 원리](http://blog.daum.net/_blog/BlogTypeView.do?blogid=09nW3&articleno=17441989&categoryId=770246&regdt=20121003090221)

[지역난방 원리](https://www.youtube.com/watch?v=ToyDYI35CiE)


