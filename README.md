# 🏆 포켓몬 챔피언스 M-B 팀 빌더 (Pokemon Team Builder)

포켓몬 챔피언스 M-B 시즌에 최적화된 **실시간 통계 기반 포켓몬 파티 구성 및 분석 웹 애플리케이션**입니다. 현재 랭크 배틀에서 유행하는 통계(채용률 높은 기술, 도구, 특성)를 직관적으로 확인하고, 나와 상대방의 파티를 비교하여 전략을 세울 수 있습니다.

![App Screenshot](./preview.png) *(스크린샷 추가 예정)*

## ✨ 주요 기능 (Features)

* **파티 구성 및 실시간 데이터 조회**
  * 내 파티 6마리와 상대 파티 6마리를 직접 구성할 수 있습니다.
  * `championsbattledata` API를 활용하여 포켓몬의 랭크 배틀 통계(채용률 순위 등)를 실시간으로 가져옵니다.
* **메가진화 완벽 지원 (Mega Evolution)**
  * 메가리자몽X/Y, 메가이상해꽃 등 메가진화 폼 체인지를 지원합니다.
  * 고유 메가스톤 UI 클릭 시 타입, 종족값(스피드 등)이 폼에 맞춰 실시간으로 변경 및 적용됩니다.
* **스피드 타임라인 뷰 (Speed Dashboard)**
  * 중앙 패널에서 내 파티와 상대 파티 총 12마리의 스피드 종족값을 타임라인 형태로 한눈에 비교할 수 있습니다.
  * 동속(스피드 동점) 체크 및 속도 추월 계산에 매우 유용합니다.
* **속성 기반 다이내믹 UI**
  * 포켓몬의 타입(단일/이중)에 따라 카드 배경과 아이콘에 고유한 컬러 그라데이션이 적용되어 직관적인 시인성을 제공합니다.

## 🚀 기술 스택 (Tech Stack)

* **Frontend:** React, Vite, Vanilla CSS
* **Data Sources:** 
  * [Pokemon Champions Battle Data API](https://championsbattledata.com/) (랭크 배틀 통계)
  * [PokeAPI](https://pokeapi.co/) (기본 종족값, 메가진화 폼 데이터, 아이템 이미지 등)

## 🛠️ 설치 및 실행 (Installation & Setup)

1. 저장소를 클론합니다.
```bash
git clone https://github.com/bargoLoft/poketeam.git
cd poketeam
```

2. 의존성 패키지를 설치합니다.
```bash
npm install
```

3. 로컬 개발 서버를 실행합니다.
```bash
npm run dev
```

4. 브라우저에서 `http://localhost:5173`에 접속하여 앱을 확인합니다.

## 🤝 기여 (Contributing)
이슈(Issue)와 풀 리퀘스트(Pull Request)는 언제나 환영입니다! 

## 📝 라이선스 (License)
이 프로젝트는 MIT 라이선스를 따릅니다.
