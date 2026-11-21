import {missions, type MissionAgreement} from '../server/office';

export function OfficeMissionPicker({value,onChange}:{value:number;onChange:(n:number)=>void}){
 const m=missions[value];
 return <section className="office-contract"><label htmlFor="office-mission">직장 미션 선택</label><select id="office-mission" value={value} onChange={e=>onChange(Number(e.target.value))}>{missions.map((m,i)=><option key={m.id} value={i}>{i+1}. {m.title}</option>)}</select><p>{m.intro}</p><p>두 게이지는 100에서 시작합니다. 새로운 근거나 대안으로 설득하면 부장의 버티기가, 부장이 강하게 밀어붙이면 내 여유가 줄어듭니다. 먼저 0이 되는 쪽이 패배합니다.</p><p>압박을 짚어 반박하면 방어로 여유를 되찾거나 반격할 수 있어요. 다른 논거를 이어가면 연계 보너스! 같은 주장 반복에는 추가 피해가 없고, 질문과 농담은 편하게 해도 됩니다. 정해진 답이나 대화 횟수 제한은 없습니다.</p></section>;
}
export function OfficeAgreementView({agreement}:{agreement:MissionAgreement}){
 const m=missions.find(m=>m.id===agreement.missionId)!;
 return <details className="office-contract" open><summary>현재 합의 · {agreement.turn} / {m.limit}턴</summary><ul>{m.terms.map(t=><li key={t.id}><strong>{t.label}</strong>: {agreement.secured[t.id]??'미확보'}<br/><small>목표 {t.required} · 허용 타협 {t.compromise}</small></li>)}</ul>{agreement.feedback&&<p role="status">{agreement.feedback}</p>}</details>;
}
