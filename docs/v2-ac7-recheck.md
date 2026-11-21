# Generation 2 AC7 — 후보와 증거 재연결

최종 무료 검사: 타입 검사·빌드 종료0, 단위211/211, 기본 브라우저20/20, 별도 미술/행동11/11 통과. 실제 CMD 기동·종료·재실행 두 사이클 모두 성공했다. 초기 실패2건은 아래와 원문 로그에 보존한다. 이 결과로 미해결 의미 결함이나 실제 생성 재검증 부족이 해소되지는 않는다.

2026-11-21. **AC7 전체 승인 보류.** 현재 후보의 무료 검증과 이전 실제 모델 관찰을 구분한다. 원래 보고서 전체는 `v2-QA-generation1.md`에 보존했다. 기존 v1 12회와 v2 32회 원장은 변경하지 않았다. 추가 호출0회, 잔여0회. 이는 부모가 공개한 운영상한이며 사용자 지정 금액 예산이 아니다.

## 후보 및 파일 검사 범위

`v2-ac7-current/candidate.json`의 candidateId/sourceDigest는 소스·의존성 잠금·사용 자산·실행/검증 스크립트 전체 경로와 SHA256으로 특정한다. 문서·화면 증거 해시는 별도 목록이다. `scripts/index-v2-candidate.mjs`로 재생성할 수 있다. 다른 원본 작업 공간으로 통합했다고 주장하지 않는다.

프로젝트 루트에서 `play.cmd`, `stop.cmd`, `README.md`, `docs/v2-QA.md`의 실제 존재와 해시를 검사했다. manifest의 deliverables.paths는 배포 allowlist 전체의 재귀 목록이다. `.env`, 개인 저장, node_modules, 런타임 내부 기록은 의도적으로 제외한다. 제한 검색의 비교 예시로 `server/narrative.ts`와 `server/provider.ts` 두 경로를 지정했다. 이 범위에는 실행기/README/QA가 없으며 이는 전체 전달물 누락이 아니다. 이 두 경로가 원래 판정기가 실제 선택했던 경로라는 주장은 하지 않는다. 원래 판정기의 상세 입력 원문은 이번 문서에서 새로 확보하지 못했고 기존 보존 기록만 인용한다.

기존 `ralph-path-check.json`을 수정하지 않았다. 원문 판정 **“6/7; AC1–6 PASS; AC7 overridden to FAIL by spec_verifier”**, 최종 cancelled를 유지한다. 기록된 basenameMatch=false/relativePathMatch=true는 해당 경로 판정 범위 문제의 근거다. 새 실제 파일 목록은 추가 증거이며 원래 실패를 삭제하거나 7/7로 바꾸지 않는다. 이번 작업은 판정기·기준·런타임 signal·중첩 auto를 변경/실행하지 않았다.

## 실제 실행

`v2-ac7-current/runs.json`은 Windows/Node/PowerShell/작업 경로, 각 명령의 UTC 시작·종료·종료 코드·로그를 기록한다. `scripts/verify-v2-candidate.mjs`는 일반 검사에 빈 API키를 사용하며 브라우저는 격리된 mock transport다. 실제 모델 생성 품질 검사가 아니다.

- `npm run typecheck`, `npm run build`, `npm test`: 211/211 단위 검사, 실패/건너뜀0.
- `npx playwright test`: 화면·HTTP 저장/복원·중복 요청·음악 회귀. 별도 `playwright.v2-art.config.ts`: 제안/거절/수락·포즈/효과 감소·원응답 상태 화면. 최종 결과는 runs.json에 기록한다.
- 첫 기본 suite는19/20이었다. 음악 fixture가 데이트 수락을 완료로 취급해 보관실 이동이 거부됐다. 실제 후속 공동 활동·NPC 행동·시작 사건 reference를 추가하고 완료0→1 및 activeDate 해제를 검증했다. 두 번째 suite의 음악은 통과했고 저장 복구 검사1개가 실패했다(19/20). 해당 검사가 오류 UI가 사라진 즉시 별도 GET을 보내 복구 응답과 경합했다. 이제 실제 복구 GET 응답을 기다리고 HTTP200/원래 게임/슬롯 보존을 검증한다. 제품 판정 조건은 완화하지 않았다. 첫 실패 `browser.txt`, 두 번째 실패 `browser-retry.txt`를 보존하며 최종 재실행은 `runs-final.json`/`browser-final.txt`에 별도 기록한다.
- `npx tsx tests/v2-ac3-receipt-audit.ts`: 기존32개 응답을 각각 당시 저장에 재적용한다. 새 생성도 현재 후보의 연속17턴 대화도 아니다.
- `v2-ac7-current/launcher.json`: 실제 `play.cmd -NoBrowser -Port 3077` → HTTP200 → `stop.cmd` → 재실행 → 재종료. 개인 저장과 분리된 경로에서 turn 요청 없이 검사한다. CMD에 `%*` 전달만 추가하여 기본 실행을 유지한다. GUI 더블클릭/기본 브라우저 열기는 미실행이다.
- 첫 기동은 준비 완료 후 검증 스크립트가 반환되지 않아 중단했다. 처음에는 HTTP 조회를 의심해5초 제한 Node fetch로 바꿨으나 재발했다. CMD를 PowerShell 파이프라인 대신 숨김 프로세스로 실행하고 해당 프로세스만 기다리도록 바꾸자 반환됐다. 이후 Windows PowerShell의 ExitCode=null도 핸들을 먼저 확보해 해결했다. `launch-initial-interrupted.txt`, `launch-pipeline-interrupted.txt`, `launcher-harness-failure.json`을 보존하며 이 시도들을 성공한 전체 실행으로 집계하지 않는다. 최종 두 사이클은 모두 기동/종료 코드0, HTTP200, PID 소멸 확인이다.

검사 전 docs 전체를 `artifacts/AC7-before-recheck-evidence.zip`으로 보존했다. 기존 trace/스크린샷 생성기는 동일 경로를 갱신하므로 원래 바이트는 별도 보관본에 남는다. 현재 결과는 manifest에 새 해시로 연결한다.

## 실호출과 변경 영향

manifest의 paid.receipts는32개 원장 예약 시각·ID·결과·원본 receipt 해시·현재 변경 파일을 연결한다. 32개 모두 관련 파일 변경으로 **fresh generation 재검증 필요**다. 24회 성공/8회 실패는 여러 버전의 역사적 관찰이며 현재 성공률이 아니다. 모든 입력·응답·전후 저장·제안/확정 상태는 `v2-live-01.json`–`v2-live-32.json`, 읽기용 `v2-live-transcript.md`, `v2-live-summary.json`에 보존한다.

| 관찰 | 원본 근거 | 현재 판정 범위 |
|---|---|---|
| 창의적 직장 대안/거절 | 04–06 음성메모·10시 원격 수정;08–09 담당/퇴근 미확정;30 결말 | 초기 의미 상태는 같지만 동일 바이트 저장에서 공통 후속+복원까지의 완전한 실제 대조 아님 |
| 17턴 로맨스 | 10,12–18,21,22,24–29,31; 실패/코드 수정/저장 복원 포함 | 현재 고정 후보로 처음부터10턴 이상 재생성한 기록 없음 |
| 기억과 주체 | 17 지호/배/귤 싫음 vs NPC시나몬;28 녹음 거절 회상 | 16 착석 날조와31 종이 주체 표현 오류도 보존 |
| 관계/데이트 | 24 NPC고백,25 명시 수락 couple,29 옥상 이동 | 새 lifecycle에서29는 dates=0/activeDate 시작. 옛 dates=1을 새 완료로 세지 않음 |
| 새 약속 | 31 파란 종이 기존 ID fulfilled | invitation/promise 중복과 대사 주체 혼동 위험 |
| 반사실 | 26과32의 동일12턴 couple/cafe narrative;32 옥상/이별 거절 유지 | 29와32는 동일 시작 아님. 양 모드의 대안/수락/거절·공통 후속·복원까지 실제 trace 부족 |

AC2 재검증의 양 모드 분기/저장과 AC3의 여덟 미션·14턴 기억·데이트 lifecycle은 deterministic 상태 검증이다. 이를 모델의 후속 반응이라 부르지 않는다. 모든 미션·결말마다 추가 유료 A/B를 해야 한다는 새 기준을 만들지 않지만, 계약이 요구한 동일 저장 분기·공통 후속 지속성과 바뀐 provider의 실제 관찰 부족은 남는다.

## 화면·음악·동작·독립 비평

현재 재생 캡처 `qa-screenshots/v2-ac4-boundaries/receipt-29-1440.png`와 `receipt-29-390.png`를 직접 열었다. 옥상 배경, 검지를 든 유나의 얼굴/손, 어두운 하단 대사창과 입력/전송이 모두 보인다. 데스크톱은 대사가 전부 읽히지만 모바일 마지막 문장은 내부 스크롤 아래로 잘린다. 자세는 감정 표현이며 지문의 걷기 동작 전체를 애니메이션으로 구현한 것은 아니다. 이 직접 검토는 새 독립 담당자의 비평이나 새로운 모델 관찰이 아니다.

현재 회귀의 1440×900/390×844 PNG(`qa-screenshots/v2-ui`, `v2-art`, `v2-ac4-boundaries`)와 JSON trace를 후보 evidence 해시에 연결한다. `v2-ac4-captured-{1440,390}.json`은 실제 원응답 상태를 현재 UI로 표시했으며 새 호출 화면이 아니다. AC4 보고서는 인물별12그림, 손 가림·소품 불일치 수정, 제안/거절/확정 이동 및 효과 감소를 기록한다.

`v2-audio-office-path.json`, `v2-audio-romance-path.json`은 브라우저의8초 유지/2초 fade/장면 전환 근거다. 음소거·음량 지속도 mock 흐름이다. 실제 모델이 모든 포즈/곡을 자연 발생시켰다고 주장하지 않는다. 사람 청취/몰입감 평가는 미실행이다.

`v2-independent-critique.md`는 별도 읽기 전용 담당자가 당시32개 원응답과 실제 PNG를 검토한 비평이다. 응답성04 커피 농담, 인물성10–17 감각 취향/종이배, 기억17/28, 사건 영향06/26 말뿐인 진행, 속도 중앙2943.5ms/최대4192ms, 가독성390px 내부 스크롤을 인용한다. 이것은 변경된 현재 UI/provider의 새로운 독립 승인이나 최종 코드 실대화 검증이 아니다.

## 출처와 남은 작업

부모의 후속 독립 감사 `v2-parent-followup-review.md`도 확인했다. 거기 명시한 narrative SHA256 `a5abec4c7ef351c548048887b82cf403295ac35eb7e36028730aef56a85709ef`는 현재 파일과 같다. 별개 내일 회의 문장이 현재 데이트 시작을 막는 경우, 플레이어 약속을 NPC 이행으로 바꾸는 경우, 명시적 미완료를 완료로 인정하는 경우, NPC의 미래 약속을 행동 없이 완료로 인정하는 경우가 보고돼 있다. 이번 AC7에서는 해당 독립 probe를 직접 재실행하거나 이 서사 로직을 수정하지 않았다. 기존211개 검사의 통과가 이 네 보고를 해소하지 않으며 **미해결 의미 결함**으로 남긴다. 따라서 현재 ZIP은 승인된 출시본이 아니라 결함과 검증 공백을 포함한 검토용 후보다.

자산 출처/프롬프트: `public/assets/generation-manifest.json`, `public/assets/v2/generation-manifest.json`, `public/assets/audio-v2/manifest.json`. 공식 자료 연구와 링크는 보존한 generation1 QA에 있다. 이번 작업에서 웹을 다시 확인했다고 주장하지 않는다. 의존성 잠금 파일을 바꾸지 않았으며 THIRD_PARTY_NOTICES와 v1 원본을 보존한다.

배포 명령은 `powershell -File scripts/package-local.ps1`, 검사 명령은 `powershell -File scripts/audit-v2-package.ps1`이다. `artifacts/AFTER-HOURS-local.zip`과 SHA256 sidecar를 만들며 archive 경로 전체 및 필수5파일(실행기2, README, QA, 후보 manifest)의 내용 해시를 검사한다. 이 후속 archive 감사는 자기 참조를 피하기 위해 `v2-ac7-current/package-audit.json`에 별도로 기록한다. ZIP을 새 Windows 설치에 풀어 의존성부터 설치하는 검사는 미실행이며 현재 작업 트리에서의 실제 기동과 구분한다.

첫 패키징은 배포 입력 docs 안에 실행 로그를 쓰면서 그 파일을 동시에 압축하려 해 파일 잠금으로 실패했다(`package-run.txt`/`package-run.json`, 종료1). 원문을 보존하고 로그 출력을 배포 대상 밖 `.ralph/v2-ac7-package`로 옮겨 다시 실행한다. 최종 실행 메타데이터와 archive 감사는 압축 후의 외부 sidecar이므로 ZIP 내부 manifest의 자기 참조 대상에 포함하지 않는다.

현재 후보는 로컬 기술 검증 대상으로 전달할 수 있으나 변경된 provider의 실대화, 동일 저장 양 모드 분기/공통 후속 지속성, 현재 자료의 새 독립 대화 비평은 미검증이다. 호출상한이 소진되어 승인된 범위에서 완료할 수 없다. 이전 성공·mock·재생·과거0.94를 대신 사용하지 않는다. AC_COMPLETE:7 및 TASK_COMPLETE를 선언하지 않는다.
