# AC 4 검증 근거

검증일: 2026-11-21. 기준 커밋: `a050bc15e7f2f3fe040418d0c57215b3ecffa0b3`에 적용한 작업 트리. 정확한 소스 SHA-256은 `ac4-source-hashes.json` 참조.

## 구현과 공식 근거

- 서버만 루트 `.env` 또는 프로세스의 `OPENAI_API_KEY`를 읽는다. `OPENAI_MODEL` 기본값은 `gpt-4.1-mini`다. 키를 응답이나 로그에 넣지 않는다.
- [공식 quickstart](https://developers.openai.com/api/docs/quickstart)의 Responses API를 사용한다.
- [공식 Structured Outputs 가이드](https://developers.openai.com/api/docs/guides/structured-outputs)에 따라 `text.format`에 `type: json_schema`, `strict: true`, 모든 속성 required 및 `additionalProperties: false`를 지정한다. 서버에서 별도로 동일한 허용 값과 참조를 재검증한다.
- AI가 자유 서술로 새 사실을 확정하지 못하도록 저술된 장면별 대사, 제한된 추측, 정본 ID 참조로 출력 공간을 제한했다. 이는 무제한 자연어 생성이 아닌 선택형 AI 대화다. 한국어 발화와 회상 기록은 실제 API 결과를 검증한 후 표시하며, 실패 시 오프라인으로 자동 대체하지 않는다.
- 정본은 최근 대화와 별도로 입력에 전달한다. 정본의 사실은 사건 ID, 버전, 확정 시각을 갖는다. 선택한 의도와 상대가 실제로 승인한 합의를 혼동하지 않도록 선택 사실을 명시한다. 자유 입력이나 모델 대사는 이 사실을 덮어쓸 수 없다.
- 모델 출력은 상태 변경 권한이 없다. 서버의 제안 답변 선택 및 작성된 장면 사건만 정본에 추가된다. 사용자 주장, 인물 추측, 모델 대사, 검증 사건을 구분한다.

## 실행 결과 / VerificationEvidence

| 주장 (모두 AC 4) | 정상 초기 조건 및 허용 경로 | 관찰 결과 / 최종 상태 | 증거 |
|---|---|---|---|
| 대화 이력 밖의 확정 사실 유지 | romance 시작 → 선택 2 → 자유 입력 20회 | 대화 12항목으로 축소, 초기 기록 제거 후에도 정본 완전 일치, step 1 및 미종료 유지 | `server/dialogue.test.ts` |
| 충돌·schema 불일치 거부 | office 시작 → 허용 외 대사/추측/ID/추가 속성 후보 | 예외 발생, 원본 상태 변경 없음 | `server/dialogue.test.ts` |
| 공식 API 요청 및 엄격한 응답 검사 | 가짜 fetch 사용, 메모리 내 테스트용 가짜 키 | URL, strict schema, 정본 입력, store false, 700토큰 확인; incomplete/refusal/429/잘못된 JSON 출력 거부; abort 전달 확인 | `server/dialogue.test.ts` |
| 정상 게임·HTML 안전 표시 | 실제 Chromium, 새 쿠키, 두 모드 시작 | 제안 답변으로 6장면 완료, 저장/불러오기/컬렉션 유지, 390px 모바일 확인, HTML 입력은 텍스트 표시 | `tests/play.spec.ts` |
| 자유 대화/재시도/한도 | 새 romance → 선택 2 → 같은 요청 재전송 → 자유 대화 99회 | 첫 응답 재전송은 완전히 동일, 내용 변경 및 오래된 버전 거부, 첫 사실 유지, 101번째 시도 거부 | `tests/play.spec.ts` |
| 제공자 구분과 오류 복구 | 키를 빈 환경변수로 고정한 별도 테스트 서버, UI에서 OpenAI 선택 | API 키 오류 표시, 같은 요청 재시도에서도 오류 유지, 장면 진행 없음, 명시적으로 offline 전환 가능 | `tests/play.spec.ts` |

`npm test`: 12/12 통과. 기존 총 1,458개 분기 경로 검증 포함.

`npm run build`: strict 타입 검사 및 Vite 빌드 통과.

`npx playwright test`: 4/4 통과 (최종 7.5초). 포트 3017에서 이번 소스의 서버를 강제로 새로 시작한다. 기존 3001 서버를 재사용했던 초기 시도는 유효한 검증으로 세지 않았고, 해당 설정을 고친 뒤 전부 재실행했다.

## 입증 범위와 미검증 범위

- mock: API 요청 구조, 오류·출력 검증, 취소 신호 전달. 실제 OpenAI가 아님.
- offline/브라우저: 입력, 정본 유지, 재시도, 상태 버전 충돌, 한도, 저장 및 UI 복구 경로. 테스트 서버는 `OPENAI_API_KEY=''`로 실제 호출을 방지한다.
- 실제 API: 이번 AC 실행 0회. 모델의 실서비스 응답 품질, 계정에서의 모델 가용성, 지연 및 실제 서비스 schema 수락은 **미검증**이다. 실제 API 성공을 주장하지 않는다. 이전 전체 실행의 누적 smoke 횟수는 이 작업 트리에서 확인할 수 없어 추가 호출을 하지 않았다. 향후에는 누적 기록 확인 후 총 8회 이내에서만 실행해야 한다.
- 서버의 10초 타이머와 연결 종료 시 abort는 구현되어 있다. 실제 서비스에서 10초 이상 걸리는 응답 및 사용자가 취소하는 네트워크 경쟁 상황은 별도 실서비스 검증을 하지 않았다.
- 자유 대화는 장면 진행을 하지 않는다. 분기는 제안 답변의 검증된 의도만 반영한다. AI 대사 선택 폭은 제한되어 있으며 무제한 자연어 창작 품질을 입증한 결과가 아니다.

재현: `npm test`, `npm run build`, `npx playwright test`. 테스트는 유료 API를 호출하지 않는다. 브라우저 화면 산출물은 Git에서 제외되는 `test-results/`에 생성한다.
