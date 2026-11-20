# 공식 자료와 AFTER HOURS 적용

2026-11-21 공식 페이지를 직접 확인했다. 아래는 구조적 참고이며 원작의 캐릭터·대사·이미지·음악을 사용하지 않았다.

| 공식 출처 | 관찰 | 이 프로젝트의 적용과 차별화 |
|---|---|---|
| [DDLC Plus](https://ddlc.plus/) | 로맨스와 심리 공포의 전환, 해금 이미지, 음악 플레이어, 고해상도 비주얼을 소개한다. | 성인 사운드 아키비스트와 연애한 뒤 대화 녹음 편집을 발견하는 원본 이야기. 원작 학교/문예부/인물/메타 파일 연출을 복제하지 않고 게임 내부 기록만 다룬다. 원본 표정 시트와 음악·엔딩 수집을 구현했다. |
| [Sukeban 공식 VA-11 HALL-A press kit](https://sukeban.moe/press/sheet.php?p=Cyberpunk_Bartender_Action+VA-11+HALL-A) | 바텐딩을 통해 인물 이야기를 듣고 제공하는 음료가 대화에 영향을 주는 구조를 설명한다. | 대화 속 구체적인 업무 조건·반납·약속·편집 비교 행동이 서버의 합의와 관계 사실을 바꾸도록 설계했다. 바텐딩이나 원작 세계관을 옮기지 않았다. |
| [inkle ink](https://www.inklestudios.com/ink/) | 분기 서사 작성·실행·검증을 위한 언어와 편집기를 소개한다. | 장 진입/완료/미해결/턴 상한과 엔딩 우선순위를 TypeScript 계약으로 명시했다. ink 런타임 자체를 사용하지는 않는다. |
| [OpenAI Quickstart](https://developers.openai.com/api/docs/quickstart) | 서버 환경변수 인증과 Responses API 사용의 공식 출발점. | 키는 서버 `.env` 또는 프로세스 환경변수만 사용한다. HTTP 공개 응답과 검증 증거에는 키를 넣지 않는다. |
| [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | JSON schema를 통한 출력 구조 제한과 refusal/불완전 응답 처리. | strict schema, 추가 필드 금지, 대사 600자/출력 700토큰 상한, 정본 ID 재검증. 구조 검증과 대사의 사실 정확성은 별개다. 실제 smoke에서 역할·기억 오류가 관찰되어 QA에 남겼다. |

이 표의 적용 방법은 공식 문서의 보증이 아닌 이 프로젝트의 설계 판단이다.
