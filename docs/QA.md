# AFTER HOURS — AC7 검증 기록

검증일: 2026-11-21. 대상: 이 문서가 있는 Windows 작업 트리의 최종 소스. AC7의 검증 범위와 실제 결과를 기록한다. **전체 게임의 출시 승인은 아니다. AC4의 live 대사 취향 귀속 품질은 보류 상태다.**

## 재현 명령과 결과

프로젝트 루트에서 `npm ci`, 최초 한 번 `npx playwright install chromium` 후 아래 명령을 순서대로 실행한다. 이번 실행은 기존 설치된 의존성과 Chromium을 사용했다.

| 명령 | 이번 실행 결과 | 로그 |
|---|---|---|
| `npm run build` | TypeScript 검사와 Vite production build 통과 | `ac7-build-run.txt` |
| `npm test` | 103개 통과, 실패·건너뜀 0 | `ac7-unit-run.txt` |
| `npx playwright test` | 18개 통과 (53.6초), 실패·건너뜀 0 | `ac7-browser-run.txt` |
| `npm start` | 브라우저 검증이 같은 시작 명령으로 서버를 기동함 | 로컬 플레이 `http://127.0.0.1:3001` |

Playwright는 3017 포트의 새 서버를 시작하며 OPENAI_API_KEY를 빈 값으로 설정한다. 일반 검증은 offline 또는 mock Responses 전송만 사용한다. 실제 키를 읽어 유료 호출하는 live-smoke 명령은 이번 검증에서 실행하지 않았다. 원장은 **8/8회 소진** 상태이며 추가 호출 0회다.

## 요구별 검증 근거

| 요구 | 정상 시작부터 수행한 검증 | 증거 |
|---|---|---|
| 모든 직장 미션 성공/실패 | 8개 미션 각각 성공·부분성공·실패, 총 24결말. 공개 `/api/new`와 자유 입력 `/api/turn`, 상태 주입 없음 | `tests/office.spec.ts`, `ac2-api-evidence.json` |
| 4개 로맨스 엔딩 | 공개 새 게임과 자유 입력으로 네 결말 및 신뢰 부족 대비 경로. 연인·데이트 사실 확인 | `tests/romance.spec.ts`, `ac3-repair-evidence.json` |
| 의미 있는 입력 차이 | 동일 고백 장면에서 수락 vs 거절 3종 vs 보류; couple/고백 보류 사실 비교. 직장 제안에 따라 18:00/18:20/미확보 비교 | `tests/ac7.spec.ts`, `ac7-routes-evidence.json` |
| 반복과 새 근거 구별 | 같은 논거의 바꿔 말하기는 추가 진전 없음. 다른 반론의 새 근거만 추가 조건 확보 | `server/office.test.ts`, `ac2-api-evidence.json` |
| 입력 공격 방어 | 지시 무시·승리/점수 주입·다른 장면 intent·잘못된 선택·501자 거부, XSS는 원문 텍스트 렌더링 | `server/interpretation.test.ts`, `server/dialogue.test.ts`, `tests/play.spec.ts` |
| 저장 복원 | 자동 저장·3개 슬롯·관계·로그·엔딩 새로고침 및 실제 서버 재시작 후 복원. 충돌·손상·전달 실패·같은 요청 재시도 | `server/persistence.test.ts`, `tests/persistence.spec.ts`, `ac7-persistence-evidence.json`, `ac6-repair-evidence.json` |
| schema/timeout/429/취소 복구 | 모의 upstream 오류와 실제 10초 타이머 후 game·해금·버전 불변, 같은 requestId 재시도 정확히 1회 확정 | `server/recovery.test.ts`, `ac7-recovery-evidence.json` |
| 오류 UI 복구 | 오류 문구, 작성 문장 보존, 같은 요청 재시도, 취소 후 재시도 버튼 | `tests/ac7.spec.ts`, `ac7-browser-recovery-evidence.json` |

서버 복구 검사는 실제 HTTP 서버에 테스트 전용 Responses 전송 모형을 연결한다. upstream 429는 서버의 오류 응답(현재 HTTP 400)에 포함된 429 메시지로 검증하고, 프로필 시간당 300회 제한은 HTTP 429로 별도 검증한다. 다른 세션과 읽기 가능도 확인한다. 한 시간 후 자동 해제의 실제 대기 검증은 하지 않았다. UI 오류 주입만으로 실제 upstream 회복을 주장하지 않는다.

단위 검증은 로맨스 729개 선택 조합, 유한 장 전이, bounded history에서 사라진 발화의 확정 사실 유지, 모델 문장으로 합의·엔딩을 조작할 수 없음을 포함한다. 저장 파일 손상은 복구 시험에만 사용하며 엔딩 도달 증거와 구분한다.

## 대표 두 모드 브라우저 완주와 화면

`tests/ac7.spec.ts`는 desktop 1440×900과 mobile 390×844 각각에서 직장 칼퇴 성공 및 로맨스 진실 엔딩을 실제 입력란과 전송 버튼으로 완주한다. 각 실행의 pageerror와 console error가 0임을 단언한다. 이력·응답·초기 상태·스크린샷 경로는 `ac7-browser-evidence.json`에 기록한다.

- `qa-screenshots/ac7-office-1440.png`
- `qa-screenshots/ac7-office-390.png`
- `qa-screenshots/ac7-romance-1440.png`
- `qa-screenshots/ac7-romance-390.png`

최종 네 캡처를 직접 열어 캐릭터·배경·한글·결말 버튼과 모바일 줄바꿈을 확인했다. 가로 잘림은 없으며 직장 결말은 긴 세로 스크롤을 사용한다. 최종 캡처는 전환 효과가 끝난 뒤 보존한다. fullPage이므로 PNG 높이는 viewport보다 길 수 있다. AC5의 28개 화면과 입력·음악·효과 감소·음소거 검사는 `ac5-evidence.json` 및 `qa-screenshots/ac5-*.png`에 별도로 있다. 모든 28결말은 공개 HTTP로, 대표 두 모드는 브라우저 입력으로 검증한다. 모든 결말을 화면 클릭으로 완주했다는 뜻은 아니다.

## 실제 OpenAI 증거와 남은 결함

`api-smoke-ledger.json`의 누적 8/8회. 1–3회는 `ac7-live-initial-evidence.json`, 4–6회는 `ac7-live-evidence.json`, 7–8회는 `ac4-repair-live-evidence.json`에 당시 입력·응답·소스 해시가 있다. 모두 Responses API 연결 및 strict schema 검증은 통과했으나, 이것을 대사 품질 전체 통과로 계산하지 않는다.

초기 호출에서 인물이 자신을 제삼자로 부르거나 플레이어를 유나로 부르는 역할 혼동과 취향 오귀속이 관찰됐다. 역할별 대화 이력과 분리된 인물 설정을 적용한 7번 호출은 자연스러운 요약/여섯 시 퇴근 제안으로 18:00 조건을 확보했다. 8번은 빗소리·귤 기억을 회상하고 플레이어를 유나로 부르지 않았다. 그러나 시나몬 문장은 취향 주체가 모호했다.

이후 주체 명시 프롬프트, 공동 청취 사실의 과잉 귀속 제거, 회상 ID와 대사 분리, live none 보호 및 직장 부정 경계·의미 중복 처리를 수리했다. 구조·회귀 검증은 통과하지만 마지막 수정 이후 실제 API 재검증은 예산 소진으로 수행하지 않았다. **AC4 완전 품질 통과는 보류**이며 상세 범위는 `ac4-validation.md`를 따른다. 이전 live 응답을 현재 소스의 응답으로 제시하거나 mock 성공으로 대체하지 않는다.

## 에셋·음원·스토리 출처

| 항목 | 출처와 보관 위치 |
|---|---|
| 유나·박도현 각 4표정 및 office/cafe PNG | 부모가 OpenAI image_gen으로 만든 원본. `public/assets/generation-manifest.json`에 프롬프트·사용 조건 |
| riverside/archive PNG | 같은 생성 방식. `public/assets/supplemental-manifest.json` |
| evening/archive-theme/chime/tape WAV | 프로젝트 고유 절차적 작곡, 외부 샘플 없음. `public/assets/audio-manifest.json` |
| 한국어 인물·8미션·6장·28결말 | 프로젝트 원본 `server/office.ts`, `server/romance.ts`. 성인 인물·사운드 아카이브 설정 |
| 연구 및 차별화 | `research.md`의 공식 DDLC Plus / Sukeban / ink 및 OpenAI 문서 |
| 글꼴 | OS 시스템 sans-serif, 외부 폰트 파일 없음 |

원본 PNG는 이번 작업에서 수정하지 않았다. 기존 게임의 인물·대사·아트·음원을 복제하지 않았다.

## 배포 전에 남은 실제 항목

- live 역할·취향 귀속 수정의 실제 재검증과 전체 대화 품질 평가. 현재 8회 계약 한도 내 추가 검증은 불가능하다.
- 규칙 기반 offline 한국어 부정·복합 문장의 범위 확대 및 사람의 장시간 플레이테스트. live와 offline 이해 능력이 같다고 주장하지 않는다.
- 실제 모바일 키보드/IME, Safari·Firefox, 스크린리더 검증.
- 생성 에셋 서비스 약관과 번들 의존성 라이선스 검토, 플랫폼별 등급·개인정보 안내, 유료 API 운영 예산 결정.

공개 배포·구매·스토어 등록은 하지 않았다. 테스트 통과는 상업 출시나 모든 자연어 표현의 정확성을 보증하지 않는다. 미커밋 변경이 있으므로 재현 버전은 Git HEAD와 함께 `ac7-artifact-index.json`의 파일별 SHA256을 기준으로 확인한다. 이전 AC별 문서의 테스트 수는 각 실행 당시 기록이다.

