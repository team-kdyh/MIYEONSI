# AFTER HOURS — 최종 AC7 검증

검증일: 2026-11-21 (Asia/Seoul). 최종 successor Seed와 현재 작업 트리를 기준으로 검증했다. 실행 코드·원본 아트·실호출 증거·기존 저장은 보존했다. 이전 단계의 103개 테스트/8회 한도/수정 후 live 보류 판정은 [이전 QA](ac7-prior-QA.md)에 보존하며 현재 판정과 구별한다. 재실행 전 docs 전체는 `.ralph/ac7-final/prior-docs.zip`에 보관했다.

## 실행 명령과 결과

Windows 프로젝트 루트에서 실행한다. 새 설치는 `npm ci`, 브라우저 최초 설치는 `npx playwright install chromium`이다. 이번 검증은 이미 설치된 의존성과 Chromium을 사용했다. 설치·실행 검증은 [AC1](ac1-validation.md)에도 기록돼 있다.

| 명령 | 결과 | 로그 |
|---|---|---|
| `npm run build` | 타입 검사·Vite production build 통과 | [build](ac7-final-build-run.txt) |
| `npm test` | 110개 통과, 실패·건너뜀 0 | [unit](ac7-final-unit-run.txt) |
| `npx playwright test --config playwright.ac7-final.config.ts` | 18개 통과 (53.7초), 실패·건너뜀 0 | [browser](ac7-final-browser-run.txt) |
| `node scripts/generate-notices.mjs` | 현재 잠금 파일 기준 실행 의존성 68개의 라이선스 원문 재생성 | `THIRD_PARTY_NOTICES.txt` |

브라우저 검사는 `npm start`로 3037 포트의 새 서버를 띄우고 종료한다. `reuseExistingServer:false`, 빈 `OPENAI_API_KEY`, 실행별 `.ralph/ac7-final/data-*` 저장 폴더를 사용한다. 복구 단위 검사는 임시 폴더·별도 포트·mock 전송을 사용한다. 기존 3001 서버와 플레이어 저장은 건드리지 않는다. 일반 플레이는 README의 `play.cmd` / `stop.cmd` 또는 `npm start`를 사용한다.

## 요구별 검증

| 요구 | 수행한 검증 | 근거 |
|---|---|---|
| 모든 직장 미션 성공·실패 | 8미션 × 성공/부분성공/실패 = 24결말, 정상 새 게임에서 공개 HTTP 자유 입력. 같은 논거 반복은 진전 없음 | `tests/office.spec.ts`, [API 증거](ac2-api-evidence.json) |
| 4개 로맨스 엔딩 | 정상 새 게임부터 자유 입력으로 4결말 및 신뢰 부족 대비 경로. 별도 단위 검사에서 729개 선택 조합과 최대 18턴 종료 | `tests/romance.spec.ts`, `server/romance.test.ts`, [경로 증거](ac3-repair-evidence.json) |
| 의미 있는 다른 자유 입력 | 같은 고백 상태에서 수락/거절 3종/보류의 couple·confession-deferred 차이. 직장 제안의 18:00/18:20/미확보 차이 | `tests/ac7.spec.ts`, [대조 증거](ac7-routes-evidence.json) |
| 저장 복원 | 자동 저장·3슬롯·관계·대화·엔딩 새로고침 및 실제 서버 재시작 후 복구. 손상 저장·중복·전달 실패·오래된 탭도 검사 | `server/persistence.test.ts`, `tests/persistence.spec.ts`, [재시작 증거](ac7-persistence-evidence.json) |
| 입력 공격 | 지시 무시·즉시 승리/수치 주입·다른 장면 intent·잘못된 선택·501자 입력 거부, XSS 원문 렌더링 | `server/interpretation.test.ts`, `server/dialogue.test.ts`, `tests/play.spec.ts` |
| schema/timeout/429/취소 | 실제 HTTP 서버 + mock Responses 전송. 실패 시 상태·해금·버전 불변, 같은 requestId 재시도 1회 확정. 실제 10초 타임아웃 검사 | `server/recovery.test.ts`, [복구 증거](ac7-recovery-evidence.json) |
| 오류 UI | 문장 보존·같은 요청 재시도·취소·오류 표시. UI 주입 검사와 서버 복구 검사를 구별 | `tests/ac7.spec.ts`, [UI 복구 증거](ac7-browser-recovery-evidence.json) |
| 연출·모바일 | 두 해상도 × 일반/효과 감소의 4컨텍스트, 표현·배경·오디오 playing·입력 가림·키보드·설정 검사 | `tests/presentation.spec.ts`, [연출 증거](ac5-evidence.json) |

upstream 429는 서버 HTTP 400 응답 안의 429 오류 메시지로 검증한다. 프로필당 시간당 300회 제한은 별도의 실제 HTTP 429로 확인하고 다른 세션과 읽기는 계속 가능함을 검사한다. 한 시간 후 자동 해제까지 실제 대기하지 않았다. 모의 장애의 복구 성공을 실제 OpenAI 장애 복구 실험으로 표현하지 않는다.

## 두 모드 브라우저 완주와 캡처

`tests/ac7.spec.ts`는 1440×900 및 390×844 각각에서 직장 칼퇴 성공과 로맨스 진실 엔딩을 입력란·전송 버튼으로 완주한다. 네 실행 모두 pageerror 및 console error 0을 단언한다. [브라우저 증거](ac7-browser-evidence.json)에 초기 상태·모든 입력/응답·결말·오류 목록을 기록한다.

- [직장 데스크톱](qa-screenshots/ac7-office-1440.png), [직장 모바일](qa-screenshots/ac7-office-390.png)
- [로맨스 데스크톱](qa-screenshots/ac7-romance-1440.png), [로맨스 모바일](qa-screenshots/ac7-romance-390.png)

이번에 갱신된 네 캡처를 직접 열어 원본 캐릭터·배경·한글·결말·버튼을 확인했다. 모바일은 긴 내용을 세로 스크롤하며 가로 잘림은 없다. fullPage 캡처의 높이는 뷰포트보다 길다. AC5의 장면·입력 캡처 28개도 통합 검사에서 재생성했다. 28결말 전체는 공개 HTTP로, 대표 두 모드는 브라우저 UI로 검증한다. 모든 결말을 화면 클릭으로 완주했다는 뜻은 아니다. Node의 NO_COLOR/FORCE_COLOR 경고는 테스트 실행기의 환경 경고이며 게임 브라우저 콘솔 오류와 구별한다.

## 실제 OpenAI 증거의 범위

추가 유료 호출은 **0회**, 누적 **12/12**이다. 원장과 과거 1–8회 증거를 보존했다. [최종 검증](final-verification.md)과 [실호출 9–12](final-live-evidence.json)는 최종 수정 후의 별도 증거다. 당시 네 요청 모두 HTTP 200, schema 및 서버 검증을 통과했다. 이번에는 이 호출을 재실행하지 않았다.

- 9–10: 야근 거절과 요약본/18시 제안을 함께 한 자유 입력, 이어진 잔여 업무 담당·기한 제안으로 칼퇴 성공. 정상 공개 API 시작에서 연속 두 턴이다.
- 11–12: 공동 청취·빗소리/귤 기억 뒤 헤드폰 반환과 향 질문. 답변에서 플레이어의 빗소리/귤과 유나의 시나몬 취향을 명시적으로 구분했다.

[소스 감사](ac7-final-source-audit.json)에서 CRLF→LF만 정규화한 현재 소스 해시 7/7이 최종 실호출 기록과 일치함을 확인했다. provider 동작은 수정하지 않았다. 이 네 턴은 집중 사례의 개선 증거이며 임의 한국어 전체·장시간 대화·모든 미션/엔딩의 live 품질 보증이 아니다. 초기 역할/취향 혼동과 중간 결함은 [parent review](parent-review.md) 및 이전 QA의 역사적 결과다. 현재 완료 판정은 최신 회귀 검사와 최종 관찰 범위에 근거한다.

## 에셋·음원·스토리 출처

| 항목 | 출처·사용 조건 기록 |
|---|---|
| 성인 유나·박도현 각 4표정, office/cafe | 부모가 image_gen으로 생성한 원본 PNG. `public/assets/generation-manifest.json`에 프롬프트·조건 |
| riverside/archive | image_gen 원본, `public/assets/supplemental-manifest.json` |
| evening/archive-theme/chime/tape WAV | 프로젝트 고유 절차적 작곡, 외부 샘플 없음. `public/assets/audio-manifest.json` |
| 한국어 인물·8미션·6장·28결말 | 프로젝트 원본 `server/office.ts`, `server/romance.ts`. 성인 로맨스·사운드 아카이브 이야기 |
| 공식 연구·차별화 | [research.md](research.md)의 DDLC Plus / Sukeban / ink / OpenAI 공식 링크와 적용 설명 |
| 글꼴 | OS 시스템 sans-serif, 별도 외부 폰트 파일 없음 |
| 실행 의존성 | `THIRD_PARTY_NOTICES.txt`: 설치된 68개 runtime 패키지 원문, `scripts/generate-notices.mjs`로 재생성 |

원작 게임의 인물·대사·아트·음원을 복제하지 않는 프로젝트 방향을 유지한다. 원본 PNG와 음원은 이번 검증에서 수정하지 않았다. 현재 에셋 크기·해시·잠금 파일·고지문 해시는 소스 감사에 기록했다. 잠금 파일에 선행 AC 변경이 있어 고지문을 재생성했으며 README의 실행/종료 및 라이선스 안내도 확인했다.

## 배포 전 남은 실제 항목

- 사람의 장시간 플레이와 더 넓은 한국어 자유 대화 평가. offline 규칙의 부정·복합 문장 범위와 live 확률적 대사의 역할/기억 정확성은 별도 품질 관리가 필요하다. 추가 실호출은 현재 소진된 한도 밖이므로 별도 승인·예산이 필요하다.
- 실제 모바일 소프트웨어 키보드/IME, Safari·Firefox, 스크린리더, 실제 스피커의 청취 품질 검증. 현재 증거는 Windows Chromium과 모바일 화면 에뮬레이션이다.
- 생성 에셋 서비스 약관·번들 라이선스의 출시 용도 검토, 플랫폼 등급·개인정보 안내, 유료 API 운영 예산 결정. 고지문 보존은 법률 적합성 보증이 아니다.
- 공개 서비스로 바꾸려면 로컬 실행 전제를 별도 검토하고 운영·보안·저장 배포 절차를 검증해야 한다. 이번 범위에서 공개 배포·구매·스토어 등록은 하지 않았다.

테스트 통과는 상업 출시나 모든 자연어 표현의 정확성을 보증하지 않는다. 미커밋 변경을 포함하므로 재현 버전은 최종 파일별 해시 인덱스로 식별한다. 이전 AC별 수치·로그는 각 실행 당시 기록이며 이번 통합 결과와 구별한다.

## 통합 판정

**AC7 통과.** 빌드, 자동 검사 110/110, 브라우저/공개 API 검사 18/18을 통과했다. 대표 네 UI 실행의 콘솔 오류는 0이며 모든 요구 검증과 캡처·출처·출시 전 한계를 기록했다. 추가 유료 호출 없이 기존 12/12를 유지했다. [최종 아티팩트 인덱스](ac7-final-artifact-index.json)는 이 검증의 소스·증거·스크린샷 SHA256을 기록한다. 이는 로컬 출시 후보의 명시된 검증 범위에 대한 판정이며 상업 출시 보증이 아니다.
