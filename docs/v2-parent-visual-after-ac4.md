# v2 동작 통합 후속 시각 검토 — 진행 중 스냅샷

2026-11-21. AC4 worker가 활동 중인 `ralph-afterhours-v2-293c383da8` 작업 트리를 읽기만 했다. 실제 검사 시점의 `src/CharacterSprite.tsx`, `src/visualAssets.ts`, `src/style.css`와 PNG를 확인했다. 완성된 최종본 판정이 아니다. 유료 API 호출·Ralph 상태 조회·production 수정은 하지 않았다.

## 실제로 연 캡처

- `docs/qa-screenshots/v2-art/office-1440-neutral.png`
- `docs/qa-screenshots/v2-art/office-1440-listen.png`
- `docs/qa-screenshots/v2-art/office-390-watch.png`
- `docs/qa-screenshots/v2-art/romance-390-offer.png`
- `docs/qa-screenshots/v2-ui/title-1440-office.png` — 기존 타이틀 캡처이며 새로 촬영된 타이틀로 간주하지 않음.

`v2-art`의 가장 최근 나열된 파일은 2026-11-21 11:57 KST의 romance 포즈 캡처다. 캡처 하단에 오프라인 미리보기라고 표시된다. 이 자료는 에셋 렌더링 확인이며 실제 이야기·대사 품질을 증명하지 않는다.

## 확인된 개선

`.sprite{width:auto;aspect-ratio:3/4}`가 미디어 쿼리 뒤에 추가됐다. 원본 한 셀 543×724와 일치하는 비율이다. 모바일 헤드폰 건네기 캡처에서 유나 얼굴/상체가 이전의 좁게 눌린 인상에서 자연스러운 비율로 바뀌었고 손과 헤드폰이 대화창 위로 보인다. 부장의 시계 지적 포즈도 두 손과 시계가 보이며 얼굴·입력창을 가리지 않는다.

`visualAssets.ts`는 실제 새 PNG 셀을 인물별로 매핑한다. `CharacterSprite`가 선택된 sheet/column을 배경에 적용하고 응답 턴/포즈에 따라 다시 표시한다. 확인한 헤드폰/시계 캡처는 지문과 실제 포즈가 일치하므로, 초기 리뷰의 “지문만 있고 중립 포즈” 우려는 **이 두 예시에서는 해소**됐다. 모든 사건의 의미 적합성이나 애니메이션 재생 전체를 이 정지 화면으로 검증한 것은 아니다.

## 아직 남은 사항

### 1. 타이틀 인물의 종횡비 문제는 현재 소스에 남음

`.title-character`는 여전히 `inset:12% -2% 0; ... background ... /400% 100%`이고 모바일은 `inset:0 15% -45%`다. `.sprite`의 3:4 규칙은 다른 class인 `.title-character`에 적용되지 않는다. 기존 타이틀 캡처도 얼굴의 가로 늘어남을 보여 준다. 따라서 플레이 sprite 수정으로 타이틀까지 해결됐다고 기록하면 안 된다. 타이틀 전용 3:4 비율 적용과 새 데스크톱/모바일 캡처 확인이 필요하다.

### 2. boss-actions-a의 여백 정규화는 아직 통합되지 않음

현재 `SpriteCell`은 `sheet/column/label`뿐이고 `CharacterSprite`는 sheet/position만 style로 전달한다. source 검색에서 boss A 전용 scale/offset은 발견하지 못했다. 실제 `office-1440-neutral`과 `office-1440-listen` 비교에서도 listen 포즈의 머리가 아래로 약50px 내려가고 얼굴/몸이 작아져, 같은 카메라에서 캐릭터가 뒤로 물러난 듯한 차이가 난다.

원인은 생성 당시 셀 침범을 수정하며 boss A만 더 넓은 투명 여백을 갖게 된 것이다. 최종 boss A 불투명 범위는 대체로 y58–687이고 다른 시트는 약 y10–724다. `.ralph/v2-media/manifest.json`의 cell bbox가 근거다. 포즈별 균등 확대/수직 기준선 보정(대략 bottom-origin scale1.12 및 아래 이동5.8%를 시작점으로 시각 조정) 또는 공통 subject bbox 기반 렌더링이 필요하다. 원본 비율 자체를 찌그러뜨려 맞추면 안 된다.

## 현재 판단

본 플레이의 종횡비 수정과 새 동작 그림의 실제 연결은 확인됐다. 얼굴·손·입력의 가림은 선택한 포즈 화면에서 발견하지 못했다. **타이틀 인물 비율과 boss A 전환 시 크기·높이 일관성은 남아 있다.** 이는 활동 중 worker의 현재 스냅샷이며 최종 에셋에 대한 낙제/통과 판정으로 사용하지 않는다. 수정 뒤 같은 포즈 쌍 및 새 타이틀 캡처로 다시 확인하면 된다.
