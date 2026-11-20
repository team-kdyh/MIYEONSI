# AC 1 검증 기록

검증일: 2026-11-21. Windows PowerShell, Node v24.14.0, npm 11.9.0. 이 문서는 초기 셸의 이전 AC1 기록을 대체한다. 검증 위치는 현재 README가 있는 작업 트리이며 Desktop 폴더로 별도 복사한 실행은 하지 않았다.

## 실행 결과

- `npm install`: 성공, 174 패키지 감사, 취약점 0개.
- `npm run build`: 성공. 내부 `npm run typecheck` (`tsc --noEmit`) 및 Vite production build 모두 통과.
- `npm test`: 103개 통과, 실패·건너뜀 0개.
- `npx playwright test tests/play.spec.ts tests/office.spec.ts tests/romance.spec.ts`: 8개 통과 (18.1초). 테스트는 `npm start`로 실제 production 서버를 127.0.0.1:3017에서 시작하여 빌드된 화면에 접속한다. 일반 README 실행 주소는 127.0.0.1:3001이다.

## AC1 관찰

- 타이틀의 두 모드 선택 → 플레이 안내 → 공통 캐릭터 무대·대화 입력 → 엔딩을 브라우저 조작으로 완주했다. 직장 안내의 미션 8개와 로맨스의 공포 예고, 자동 저장 안내를 단언했다.
- 제안 답변 경로와 자유 입력 경로 모두 검증했다. 직장 휴가 협상과 로맨스 6장/커플/데이트/진실 엔딩은 모바일 크기의 실제 입력란으로 진행했다. 공개 HTTP 입력에서는 직장 24결말과 로맨스 4엔딩을 확인했다. 모든 결말을 화면 클릭으로 완주했다고 주장하지 않는다.
- 효과 감소·큰 글씨·음소거·음량 17%·즉시 표시 설정이 새로고침 뒤 유지됐다.
- 수동 저장과 불러오기, 새로고침 뒤 이어하기, 엔딩에서 타이틀로 돌아온 뒤 이어하기가 동작했다. 설정의 재시작은 플레이 안내를 다시 열고 새 게임을 시작했다.
- 두 모드 엔딩의 컬렉션 2/28 및 미해금 카드 26개를 확인했다. 저장 불러오기와 새 게임 이후에도 해금이 유지됐다.
- 대화 로그가 표시되고 HTML 입력은 실행되지 않고 텍스트로 렌더링됐다. 키가 없는 OpenAI 모드 오류와 OFFLINE DEMO 전환을 확인했다.
- 390×844에서 가로 넘침 없이 대화 입력과 엔딩 버튼에 접근했다. 최신 타이틀 데스크톱 및 로맨스 진실 엔딩 모바일 캡처를 직접 열어 원본 일러스트·한글·레이아웃을 확인했다.

## 재현과 근거

```powershell
npm install
npm run typecheck
npm run build
npm test
npx playwright install chromium
npx playwright test tests/play.spec.ts tests/office.spec.ts tests/romance.spec.ts
npm start
```

- 테스트: `tests/play.spec.ts`, `tests/office.spec.ts`, `tests/romance.spec.ts`.
- 캡처: `docs/qa-screenshots/ac1-title-desktop.png`, `docs/qa-screenshots/ac1-romance-truth-mobile.png`.
- 현재 공개 입력 경로의 상세 기록: `docs/ac2-api-evidence.json`, `docs/ac3-repair-evidence.json`.

## 범위와 남은 한계

디스패치된 AC1은 통과했다. 이번 검증은 offline 및 mock 기반이며 유료 API 호출을 추가하지 않았다. 누적 8/8 한도는 그대로다. AC4의 live 취향 주체 표현 품질 보류는 해결됐다고 주장하지 않는다(`docs/ac4-validation.md`). 실제 휴대폰 키보드, 다른 브라우저, 상업 출시 품질 전체는 이번 AC1 판정 범위가 아니다.
