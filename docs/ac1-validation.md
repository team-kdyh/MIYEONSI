# AC1 최종 검증 기록

2026-11-21 · Windows PowerShell · Node v24.14.0 · npm 11.9.0.
현재 작업 트리의 AC1 판정은 **통과**다. 이전 기록은 `ac1-initial-validation.md`에 보존했다. 실행 코드와 원본 에셋은 변경하지 않았다.

## 실행 및 빌드

- README의 `npm install`을 `--no-fund` 옵션으로 실행: 설치 성공, 174개 패키지 감사, 취약점 0개. lockfile 내용 변경 없음.
- `npm run build`: 내부 `npm run typecheck` (`tsc --noEmit`) 및 Vite production build 모두 통과. `ac1-final-build-run.txt` 참조.
- `npx playwright test --config playwright.ac1-final.config.ts`: 4개 통과, 실패 0 (6.7초). `ac1-final-browser-run.txt` 참조.
- 위 구성은 README의 `npm start`로 production 서버를 실제 시작하고 빌드된 화면을 제공한다. 3031 포트와 별도 저장 디렉터리를 사용하고 API 키 환경변수를 빈 값으로 고정했다.
- `scripts/start-local.ps1 -NoBrowser`도 실행했다. 기본 포트 3001은 Desktop 원본 프로젝트의 기존 서버가 사용 중이므로 작업 트리 런처가 다른 프로젝트의 프로세스로 정확히 판별하고 실행을 거부했다. 기존 게임은 종료하지 않았다. `ac1-final-launch-run.txt` 참조. 이번 실행에서 런처의 신규 서버 기동/종료까지 재현했다는 뜻은 아니다. 해당 선행 검증은 `final-verification.md`에 있다.
- README는 `play.cmd` / `stop.cmd`, 설치·빌드·실행 명령, 기본 주소와 포트 충돌 처리, 라이선스 원문 68개와 재생성 명령을 이미 설명한다.

## 화면에서 확인한 동작

`tests/play.spec.ts`의 실제 Chromium 화면 조작으로 다음을 확인했다.

- 타이틀에서 직장/로맨스 선택 → 플레이 안내 → 대화 → 엔딩까지 두 모드 완주.
- 직장 8미션 선택, 로맨스 공포 예고, 자동 저장 안내 표시.
- 두 모드가 같은 캐릭터 무대·대화 입력·메뉴·엔딩 동작을 공유함.
- 효과 감소, 큰 글씨, 음소거, 음량 17%, 즉시 읽기 설정이 새로고침 후 유지됨.
- 수동 저장/불러오기, 새로고침 뒤 이어하기, 엔딩에서 타이틀 복귀 후 이어하기, 설정을 통한 재시작.
- 두 엔딩 해금 후 컬렉션 2/28, 미해금 26개. 불러오기와 새 게임 후에도 해금 유지.
- 대화 로그, 자유 입력, HTML 문자열의 안전한 텍스트 표시, 키 없는 OpenAI 오류와 offline 복귀.
- 390×844 화면에서 가로 넘침 없이 입력과 엔딩 버튼 접근 가능.

타이틀 1280×720 viewport(full-page 캡처)와 두 모드 390×844 full-page 캡처를 직접 열어 원본 일러스트, 한국어, 공통 셸과 입력 배치를 확인했다:
`qa-screenshots/ac1-final-title-desktop.png`, `qa-screenshots/ac1-final-office-mobile.png`, `qa-screenshots/ac1-final-romance-mobile.png`.

## 근거의 범위

이번 AC1 실행은 공통 셸 4개 브라우저 검사와 설치/빌드 검증이다. 선행 수락된 AC2·AC3의 24개 직장 결말/4개 로맨스 엔딩, AC5의 연출, AC6의 재시작 복원 및 110개 테스트 결과는 각 최신 검증 문서를 참조한다. 이들을 이번에 다시 실행한 것으로 계산하지 않는다.

최종 live 증거의 현재 소스 정규화 SHA256 7/7 일치를 확인했다(`ac1-final-audit.json`). 유료 호출은 추가 0회, 누적 **12/12** 유지. 실제 OpenAI 대화 품질은 `final-live-evidence.json`의 집중 관찰 범위로 한정한다. 실제 휴대폰 키보드, 다른 브라우저, 장시간 사람 플레이 및 전체 상업 출시 적합성은 이번 판정 범위가 아니다.
