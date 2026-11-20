# AC 1 검증 기록

검증일: 2026-11-21. 환경: Windows PowerShell, Node 24.14.0, npm 11.9.0, Chromium 159 (Playwright). 외부 AI 호출: 0회.

## 결과

- `npm install`: 성공, 감사 결과 취약점 0개.
- `npm run typecheck`: 성공. strict TypeScript로 React와 서버를 검사.
- `npm run build`: 성공. Vite 프로덕션 정적 파일 생성.
- `npm test`: 9개 테스트 성공. 두 모드의 729개씩 총 1,458개 경로 모두 종료, 엔딩 6개 도달, 유효하지 않은 선택 거부, 완료 후 진행 거부, 텍스트로 즉시 승리 불가.
- `npx playwright test`: 2개 통합 테스트 성공 (3.9초). 실제 프로덕션 서버에서 아래 항목 확인.
  - 타이틀에서 각각 모드 선택 → 안내 → 6장면 → 엔딩.
  - 설정 변경 후 페이지 재로드로 효과 감소/큰 글씨 유지.
  - 수동 저장, 엔딩 이후 불러오기, 자동 저장 이어하기.
  - 서로 다른 모드의 엔딩을 컬렉션에 누적 보존.
  - 자유 대사에 HTML 문자열을 넣어도 로그에 텍스트로 표시.
  - 390×844 모바일 화면에서 가로 넘침 없음, 대화 입력 접근 가능.
  - 잘못된 선택, 501자 입력, 중복 차례 요청은 HTTP 400으로 거부.
  - 전송 본문에 ending/scores를 삽입해도 서버 진행에 영향을 주지 않음.
- 데스크톱 타이틀 및 모바일 로맨스 화면 스크린샷을 열어 원본 일러스트, 한국어 표시, 대화 입력과 버튼 배치를 직접 확인.

## 재현

```powershell
npm install
npm run build
npm test
npx playwright install chromium
npx playwright test
```

Playwright는 서버가 없으면 자동 시작합니다. 테스트 과정에서 별도 쿠키 프로필의 로컬 저장 파일이 생성됩니다. 화면 캡처는 `test-results/title-desktop.png`, `test-results/office-mobile.png`, `test-results/romance-mobile.png`에 생성됩니다. 테스트 산출물과 사용자 저장 데이터는 Git에서 제외합니다.

## 범위

이 기록은 디스패치된 **AC 1 (설치·실행, 두 모드, 공통 셸, 튜토리얼, 이어하기, 설정, 컬렉션, 타입 검사·빌드)**의 증거입니다. OpenAI 실연동, 공식 자료 연구, 전체 Seed의 출시 후보 품질 판정 완료를 주장하지 않습니다. 현재 플레이는 오프라인 시나리오 기반이며 화면과 README에 명시했습니다.
