import {missions, type MissionAgreement} from '../server/office';

export function OfficeMissionPicker({value,onChange}:{value:number;onChange:(n:number)=>void}){
 const m=missions[value];
 return <section className="office-contract"><label htmlFor="office-mission">직장 미션 선택</label><select id="office-mission" value={value} onChange={e=>onChange(Number(e.target.value))}>{missions.map((m,i)=><option key={m.id} value={i}>{i+1}. {m.title}</option>)}</select><p>퇴근 전 남은 일을 두고 부장과 대화하세요. 당신만의 해결 방법을 제안할 수 있습니다.</p></section>;
}
export function OfficeAgreementView({agreement}:{agreement:MissionAgreement}){
 const m=missions.find(m=>m.id===agreement.missionId)!;
 return <details className="office-contract" open><summary>현재 합의 · {agreement.turn} / {m.limit}턴</summary><ul>{m.terms.map(t=><li key={t.id}><strong>{t.label}</strong>: {agreement.secured[t.id]??'미확보'}<br/><small>목표 {t.required} · 허용 타협 {t.compromise}</small></li>)}</ul>{agreement.feedback&&<p role="status">{agreement.feedback}</p>}</details>;
}
