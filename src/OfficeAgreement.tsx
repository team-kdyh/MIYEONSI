import {missions, type MissionAgreement} from '../server/office';

export function OfficeMissionPicker({value,onChange}:{value:number;onChange:(n:number)=>void}){
 const m=missions[value];
 return <section className="office-contract"><label htmlFor="office-mission">직장 미션 선택</label><select id="office-mission" value={value} onChange={e=>onChange(Number(e.target.value))}>{missions.map((m,i)=><option key={m.id} value={i}>{i+1}. {m.title}</option>)}</select><p>{m.limit}턴 안에 아래 조건을 협상하세요. 자유 입력이나 제안 답변 모두 합의에 반영됩니다. 대사를 입력하면 그 내용이 선택한 제안보다 우선합니다.</p><ul>{m.terms.map(t=><li key={t.id}><strong>{t.label}</strong>: {t.required}<br/>허용 타협: {t.compromise}</li>)}</ul><p>실패 조건: {m.failure}</p></section>;
}
export function OfficeAgreementView({agreement}:{agreement:MissionAgreement}){
 const m=missions.find(m=>m.id===agreement.missionId)!;
 return <details className="office-contract" open><summary>현재 합의 · {agreement.turn} / {m.limit}턴</summary><ul>{m.terms.map(t=><li key={t.id}><strong>{t.label}</strong>: {agreement.secured[t.id]??'미확보'}<br/><small>목표 {t.required} · 허용 타협 {t.compromise}</small></li>)}</ul>{agreement.feedback&&<p role="status">{agreement.feedback}</p>}</details>;
}
