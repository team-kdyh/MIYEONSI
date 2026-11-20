import type {Game, Scene} from './game.ts';

type Dimension='time'|'responsibility'|'authority';
type Argument={id:string;kind:'evidence'|'alternative'|'boundary';sample:string;paraphrase:string;groups:string[][]};
type Term={id:string;dimension:Dimension;label:string;required:string;compromise:string;objection:string;arguments:Argument[];offer:Argument};
export type Mission={id:string;title:string;intro:string;limit:number;terms:Term[];failure:string;success:string;partial:string;failed:string};
const arg=(id:string,kind:Argument['kind'],sample:string,paraphrase:string,...groups:string[][]):Argument=>({id,kind,sample,paraphrase,groups});
const term=(id:string,dimension:Dimension,label:string,required:string,compromise:string,objection:string,arguments_:Argument[],offer:Argument):Term=>({id,dimension,label,required,compromise,objection,arguments:arguments_,offer});
export const missions:Mission[]=[
 {id:'clockout',title:'17:50 추가 업무에서 칼퇴',limit:6,intro:'17:50. 박도현 부장이 가방 위에 보고서를 올려놓는다. “가방이 서류 받침으로 딱이네요. 오늘 안에 끝낼 수 있죠?” 엘리베이터는 당신 없이 예행연습 중이다.',failure:'18:00 퇴근 또는 18:20 제한 연장과 잔여 업무 담당·기한을 모두 합의하지 못하면 실패.',success:'엘리베이터가 오늘은 당신을 기다렸다. 부장은 내일 할 일에 자기 이름부터 썼다.',partial:'20분 늦은 퇴근. 그래도 오늘의 추가 업무는 여기까지라고 달력에 선이 그어졌다.',failed:'가방 위 서류가 그대로다. 웃으며 고개를 끄덕인 것만으로는 퇴근 시간이 정해지지 않았다.',terms:[
  term('leave','time','실제 퇴근 시각','오늘 18:00','오늘 18:20','“고객이 오늘 숫자를 기다린다는데요?”',[
   arg('deadline','evidence','고객 마감 메일은 내일 오전 10시입니다. 오늘 18시에 퇴근하겠습니다.','고객 이메일에 제출 기한이 내일 10시라고 되어 있어요. 정시에 나가겠습니다.',['고객'],['메일','이메일'],['내일'],['10시'],['18시','정시']),
   arg('summary','alternative','오늘 요약본을 먼저 보내고 18시에 퇴근하겠습니다.','우선 요약을 전달하고 정시에 나가겠습니다.',['요약'],['보내','전달'],['18시','정시'])],arg('limited','boundary','오늘은 18시 20분까지만 연장하겠습니다.','오늘 18:20까지만 가능합니다.',['18시20분','18:20'],['까지만'])),
  term('handoff','responsibility','잔여 보고서 담당·기한','박도현 부장 / 내일 10:00','박도현 부장 / 내일 10:00','“남은 표는 누가 언제 맡죠?”',[
   arg('owner','alternative','남은 표는 부장님이 내일 10시까지 맡아 주세요.','잔여 표 담당은 부장님, 기한은 내일 10시로 정하죠.',['표'],['부장'],['내일'],['10시'],['맡','담당']),
   arg('calendar','evidence','부장님 일정표에 내일 10시 보고서 담당으로 등록되어 있습니다.','내일 10시 보고서는 부장님 담당이라고 일정표에 있네요.',['부장'],['일정표'],['내일'],['10시'],['담당'])],arg('handoff','alternative','인수인계 메모를 남기고 부장님이 내일 10시까지 표를 맡아 주세요.','인계 메모와 함께 내일 10시 표 담당을 부장님으로 하죠.',['인계'],['부장'],['내일'],['10시'],['표']))]},
 {id:'dinner',title:'금요일 회식 탈출',limit:5,intro:'금요일 17:40. 부장이 회식 출석부에 “자율”이라고 쓰고 형광펜으로 세 번 긋는다. “한 팀이라는 걸 보여줘야죠. 삼겹살도 팀워크입니다.”',failure:'회식 불참 또는 19:00 귀가와 불참 불이익 없음이 함께 확보되지 않으면 실패.',success:'당신의 저녁은 당신에게 돌아왔다. 부장은 출석부를 고기 주문서로 뒤집었다.',partial:'첫 건배만 함께하고 19시에 귀가했다. 2차 투표에는 이름이 없다.',failed:'불참과 평가의 연결을 끊지 못했다. 출석부의 형광펜이 유난히 밝다.',terms:[
  term('exit','time','회식 참여 범위','회식 불참 / 18:00 퇴근','1차만 참석 / 19:00 귀가','“팀에 관심이 없다는 뜻인가요?”',[
   arg('lunch','alternative','팀 이야기는 월요일 점심에 나누고 오늘 회식은 불참하겠습니다.','회식 대신 월요일 점심에 팀 대화를 하겠습니다.',['팀'],['월요일'],['점심'],['불참','대신']),
   arg('appointment','boundary','오늘 저녁은 가족 약속이 있어서 회식에 불참하겠습니다.','가족과 저녁 약속을 지켜야 해서 회식은 참석 못 합니다.',['가족'],['약속'],['회식'],['불참','못'])],arg('toast','alternative','첫 건배만 하고 19시에 귀가하겠습니다.','건배 후 19:00에 귀가하죠.',['건배'],['19시','19:00'],['귀가'])),
  term('evaluation','authority','불참에 대한 평가 기준','불참 불이익 없음 / 업무 성과로 평가','불참 불이익 없음 / 업무 성과로 평가','“그럼 팀 평가는 어떻게 합니까?”',[
   arg('performance','evidence','평가 규정은 업무 성과 기준입니다. 회식 불참 불이익은 없게 해 주세요.','인사 규정대로 업무 성과로 평가하고 불참에 불이익을 주지 마세요.',['규정'],['업무'],['성과'],['불참'],['불이익']),
   arg('record','alternative','팀 성과 보고서를 공유할 테니 회식 불참 불이익 없이 평가해 주세요.','성과 보고를 공유하고 회식 불참에 불이익 없는 평가로 하죠.',['성과'],['보고'],['공유'],['불참'],['불이익'])],arg('written','alternative','회식 불참 불이익이 없다고 평가 기록에 남겨 주세요.','평가 기록에 불참 불이익 없음으로 적어 주세요.',['평가'],['기록'],['불참'],['불이익']))]},
 {id:'weekend',title:'주말 업무 거절',limit:6,intro:'금요일 퇴근 직전, 부장이 “토요일은 평일보다 메신저가 조용해서 효율적”이라는 새 이론을 발표한다. 주말 배포표의 담당 칸은 공란이다.',failure:'주말 휴식 또는 토요일 30분 한정 점검과 긴급 대응 책임자·기한이 함께 없으면 실패.',success:'토요일 알람을 껐다. 긴급 연락망은 비상구처럼 필요할 때만 쓰기로 했다.',partial:'토요일 아침 30분 점검 뒤 노트북을 닫았다. 남은 대응은 당직자의 일이다.',failed:'“잠깐만”의 종료 시각을 정하지 못했다. 주말 달력이 아직 대기 중이다.',terms:[
  term('rest','time','주말 업무 범위','토·일 업무 없음','토요일 09:00–09:30 점검만','“주말 배포가 급한데요?”',[
   arg('schedule','evidence','배포 일정표는 월요일입니다. 주말 업무는 하지 않겠습니다.','일정표상 배포가 월요일이니 주말에는 일하지 않겠습니다.',['배포'],['일정표'],['월요일'],['주말'],['않']),
   arg('automation','alternative','배포 점검을 자동화하고 주말 업무는 하지 않겠습니다.','자동 점검으로 바꾸고 주말에는 일하지 않겠습니다.',['점검'],['자동'],['주말'],['않'])],arg('half-hour','boundary','토요일 9시부터 30분 점검만 하겠습니다.','토요일 09:00에 30분 점검만 가능합니다.',['토요일'],['9시','09:00'],['30분'],['점검만'])),
  term('oncall','responsibility','긴급 대응 담당·기한','당직자 / 월요일 09:00 인계','당직자 / 월요일 09:00 인계','“점검 뒤 장애가 나면 누가 맡죠?”',[
   arg('rota','evidence','당직표에 있는 당직자가 장애를 맡고 월요일 9시에 인계합니다.','장애 담당은 당직표의 당직자이고 월요일 09:00에 인계하죠.',['당직표'],['당직자'],['장애'],['월요일'],['9시','09:00'],['인계']),
   arg('runbook','alternative','장애 매뉴얼을 당직자에게 넘기고 월요일 9시에 인계받겠습니다.','당직자에게 장애 매뉴얼을 전달하고 월요일 09:00에 인계하죠.',['장애'],['매뉴얼'],['당직자'],['월요일'],['9시','09:00'],['인계'])],arg('contact','alternative','긴급 연락은 당직자가 받고 월요일 9시에 인계해 주세요.','당직자에게 긴급 연락을 맡겨 월요일 09:00에 인계하죠.',['긴급'],['연락'],['당직자'],['월요일'],['9시','09:00'],['인계']))]},
 {id:'vacation',title:'휴가 승인',limit:6,intro:'휴가 신청서 옆에 팀 달력이 펼쳐져 있다. 부장은 빈칸을 보고 “이날 아무도 없네요”라고 한다. 당신 이름은 아직 근무자로 쓰여 있다.',failure:'8월 12–14일 또는 12–13일의 승인 날짜와 인수인계 책임·시점이 함께 없으면 실패.',success:'달력에 휴가 도장이 찍혔다. 부장은 도장 소리가 파도 소리 같다고 우겼다.',partial:'이틀의 휴가를 확보했다. 하루는 남았지만 날짜가 공란인 약속은 아니다.',failed:'“다녀오면 좋겠네요”만 남고 승인 날짜가 없다. 여행 가방은 아직 열려 있다.',terms:[
  term('dates','authority','승인된 휴가 날짜','8월 12–14일 승인','8월 12–13일 승인','“그 사흘에 납품이 있지 않나요?”',[
   arg('delivery','evidence','납품은 8월 11일에 끝납니다. 12일부터 14일까지 휴가를 승인해 주세요.','8월 11일 납품 완료라서 12일부터 14일까지 휴가 승인 부탁합니다.',['납품'],['11일'],['12일'],['14일'],['휴가'],['승인']),
   arg('early','alternative','납품을 8월 11일로 앞당겨 12일부터 14일까지 휴가를 승인받겠습니다.','8월 11일로 납품을 당겨서 12일부터 14일까지 휴가 승인을 요청합니다.',['납품'],['11일'],['앞당','당겨'],['12일'],['14일'],['승인'])],arg('two-days','alternative','8월 12일부터 13일까지 이틀 휴가를 승인해 주세요.','12일부터 13일까지 이틀 휴가 승인으로 조정하죠.',['12일'],['13일'],['이틀'],['휴가'],['승인'])),
  term('cover','responsibility','인수인계 책임·시점','김대리 / 8월 11일 인수인계','김대리 / 8월 11일 인수인계','“휴가 중 고객 문의는 누가 받죠?”',[
   arg('cover','alternative','김대리에게 8월 11일 고객 문의를 인수인계하겠습니다.','11일에 김대리에게 고객 문의 인계를 하겠습니다.',['김대리'],['11일'],['고객'],['문의'],['인계']),
   arg('rota','evidence','고객 문의 당번표에 김대리가 있어서 11일 인수인계가 가능합니다.','김대리가 고객 문의 당번표에 있으니 11일 인계하죠.',['김대리'],['고객'],['문의'],['당번표'],['11일'],['인계'])],arg('document','alternative','11일에 고객 문의 인계 문서를 김대리에게 전달하겠습니다.','김대리에게 11일 고객 문의 인계 문서를 넘기겠습니다.',['11일'],['고객'],['문의'],['인계'],['문서'],['김대리']))]},
 {id:'credit',title:'공로 되찾기',limit:7,intro:'발표 자료의 제작자는 “기획팀 일동”인데 사진에는 부장 혼자 있다. “단체사진은 마음으로 찍는 거죠.” 당신이 만든 분석표가 화면을 가득 채운다.',failure:'기여 기록의 원저자 또는 공동저자 명시와 부장의 공개 인정이 함께 없으면 실패.',success:'분석표 아래 당신 이름이 돌아왔다. 단체사진도 이번에는 진짜 단체로 찍었다.',partial:'공동저자로 남았다. 모든 공로를 되찾지는 못했지만 이름과 역할은 지워지지 않는다.',failed:'구두 칭찬만 남았다. 다음 발표에서도 같은 빈 저자 칸을 만나게 될 수 있다.',terms:[
  term('author','authority','기록된 기여','분석표 원저자: 플레이어','분석표 공동저자: 플레이어·박도현','“누가 만들었는지 기억이 좀 흐릿하네요.”',[
   arg('history','evidence','분석표 수정 이력에 제가 원저자로 남아 있습니다. 자료에 제 이름을 적어 주세요.','수정 기록의 분석표 원저자가 저이니 이름을 표시해 주세요.',['분석표'],['수정'],['이력','기록'],['원저자'],['이름']),
   arg('source','evidence','분석표 원본 파일의 작성자는 저입니다. 원저자로 제 이름을 넣어 주세요.','원본 파일에 제가 분석표 작성자입니다. 이름을 원저자로 기록해 주세요.',['분석표'],['원본'],['작성자'],['원저자'],['이름'])],arg('joint','alternative','분석표 공동저자로 저와 부장님 이름을 함께 적어 주세요.','부장님과 제 이름을 분석표 공동저자로 표시해 주세요.',['분석표'],['공동저자'],['부장'],['이름'])),
  term('recognition','authority','기여 인정 주체·장소','박도현 부장 / 팀 회의에서 기여 공개','박도현 부장 / 팀 회의에서 기여 공개','“자료만 고치면 되지, 굳이 말까지 해야 하나요?”',[
   arg('announce','alternative','부장님이 팀 회의에서 분석표 기여를 공개해 주세요.','팀 회의 때 부장님께서 분석표 기여를 공개해 주세요.',['부장'],['팀'],['회의'],['분석표'],['기여'],['공개']),
   arg('minutes','evidence','팀 회의록에 발표자가 부장님이라서 기여 정정도 공개 부탁드립니다.','부장님이 발표한 팀 회의록의 기여를 공개 정정해 주세요.',['팀'],['회의록'],['부장'],['기여'],['공개'],['정정'])],arg('minutes-read','alternative','팀 회의에서 부장님이 기여 기록을 공개 낭독해 주세요.','부장님이 팀 회의 때 기여 기록을 공개해서 읽어 주세요.',['팀'],['회의'],['부장'],['기여'],['기록'],['공개']))]},
 {id:'meeting',title:'회의 단축',limit:5,intro:'회의 제목은 “짧게 싱크”인데 예약은 두 시간이다. 부장은 두꺼운 자료를 들며 “일단 처음부터 읽죠”라고 한다. 첫 장은 목차의 목차다.',failure:'30분 또는 45분 종료와 결정권자·미결 항목 처리 기한이 함께 없으면 실패.',success:'목차는 읽지 않았다. 결정 세 개가 남고 한 시간이 돌아왔다.',partial:'45분에 문이 열렸다. 모든 이야기를 하지는 않았지만 할 일은 정해졌다.',failed:'종료 시각과 결정권이 비어 있다. 목차의 목차가 다시 화면에 뜬다.',terms:[
  term('duration','time','회의 종료','14:30 종료 / 30분','14:45 종료 / 45분','“안건이 많은데 30분으로 되나요?”',[
   arg('agenda','alternative','안건 세 개만 결정하고 30분에 회의를 끝내죠.','결정할 안건은 3개로 줄여 회의를 30분에 종료하겠습니다.',['안건'],['세개','3개'],['결정'],['30분'],['끝','종료']),
   arg('preread','evidence','자료는 사전 검토가 끝났으니 회의는 30분에 종료하죠.','사전 검토한 자료라 회의 종료는 30분으로 하죠.',['자료'],['사전'],['검토'],['회의'],['30분'],['종료'])],arg('forty-five','boundary','회의는 45분까지만 하고 종료하겠습니다.','45분까지만 회의하고 종료하죠.',['회의'],['45분'],['까지만'],['종료'])),
  term('decision','authority','결정권자·미결 항목 기한','박도현 부장 / 미결 안건 오늘 17:00 결정','박도현 부장 / 미결 안건 오늘 17:00 결정','“회의가 끝나면 나머지는 누가 결정하나요?”',[
   arg('owner','alternative','미결 안건은 부장님이 오늘 17시까지 결정해 주세요.','남은 안건 결정은 부장님이 오늘 17시에 해 주세요.',['안건'],['미결','남은'],['부장'],['오늘'],['17시'],['결정']),
   arg('authority','evidence','결재표상 부장님 권한이니 미결 안건을 오늘 17시까지 결정해 주세요.','부장님이 결재표의 결정권자라 미결 안건을 오늘 17시에 결정하면 됩니다.',['결재표'],['부장'],['미결'],['안건'],['오늘'],['17시'],['결정'])],arg('written','alternative','미결 안건은 문서로 부장님께 보내 오늘 17시 결정을 받겠습니다.','부장님께 미결 안건 문서를 전달하고 오늘 17시 결정으로 하죠.',['미결'],['안건'],['문서'],['부장'],['오늘'],['17시'],['결정']))]},
 {id:'delegation',title:'업무 떠넘기기 방어',limit:6,intro:'“자네가 제일 빠르잖아요.” 부장이 타 팀의 재고표를 밀어온다. 칭찬의 무게가 엑셀 파일보다 무겁다. 오늘 본업 마감도 아직 남았다.',failure:'재고표 소유권 반환 또는 검토 1회 한정과 본업 우선권이 함께 없으면 실패.',success:'재고표가 주인을 찾아갔다. 빠른 사람에게 모든 일을 주면 느린 팀이 된다는 사실도 남았다.',partial:'한 번 검토하고 돌려줬다. 검토자가 영구 담당자로 바뀌지 않도록 기록했다.',failed:'업무 범위가 비어 있다. 칭찬이 또 하나의 담당자 칸을 채우려 한다.',terms:[
  term('scope','responsibility','재고표 책임 범위','영업팀 소유 / 플레이어 추가 업무 없음','영업팀 소유 / 플레이어 검토 1회만','“영업팀은 이 표를 못 다룬다는데요?”',[
   arg('ownership','evidence','업무 분장표에서 재고표 담당은 영업팀입니다. 영업팀으로 돌려주세요.','분장표의 재고표 소유자가 영업팀이니 영업팀에 반환하죠.',['분장표'],['재고표'],['영업팀'],['돌려','반환']),
   arg('template','alternative','영업팀에 재고표 양식을 전달하고 담당은 영업팀으로 돌려주세요.','재고표 양식을 영업팀에 보내고 영업팀에 담당을 반환하죠.',['영업팀'],['재고표'],['양식'],['전달','보내'],['돌려','반환'])],arg('review-once','boundary','재고표는 영업팀 담당으로 두고 저는 검토 1회만 하겠습니다.','영업팀이 재고표를 맡고 저는 검토 한 번만 하겠습니다.',['재고표'],['영업팀'],['검토'],['1회만','한번만'])),
  term('priority','authority','본업 우선권','오늘 본업 마감 우선 / 추가 지시 부장 조정','오늘 본업 마감 우선 / 추가 지시 부장 조정','“본업도 추가 업무도 둘 다 오늘 하죠.”',[
   arg('capacity','evidence','일정표상 오늘 본업 마감이 꽉 찼습니다. 본업 우선으로 부장님이 추가 지시를 조정해 주세요.','오늘 일정표가 본업 마감으로 차 있으니 본업 우선권을 주고 부장님이 지시를 조정해 주세요.',['일정표'],['오늘'],['본업'],['우선'],['부장'],['지시'],['조정']),
   arg('queue','alternative','추가 지시는 대기 목록에 두고 오늘 본업을 우선하도록 부장님이 조정해 주세요.','오늘 본업 우선으로 하고 부장님이 대기 목록의 추가 지시를 조정하죠.',['지시'],['대기'],['목록'],['오늘'],['본업'],['우선'],['부장'],['조정'])],arg('confirm','alternative','오늘 본업 우선권과 부장님의 추가 지시 조정을 기록해 주세요.','부장님이 오늘 본업 우선과 추가 지시 조정을 기록해 주세요.',['오늘'],['본업'],['우선'],['부장'],['지시'],['조정'],['기록']))]},
 {id:'remote',title:'원격근무 협상',limit:7,intro:'부장은 빈 의자를 보면 일이 안 된다고 느낀다. 화상회의에서 빈 회의실을 배경으로 그 말을 한다. 당신은 수요일 집중 근무를 제안한다.',failure:'매주 수요일 또는 2주 시험 재택 승인과 연락·성과 확인 규칙이 함께 없으면 실패.',success:'수요일에는 의자 대신 결과가 출근한다. 부장도 알림을 줄여 보기로 했다.',partial:'2주 시험 재택이 달력에 들어갔다. 다음 판단 기준은 출석 사진이 아니라 결과다.',failed:'“생각해 보죠” 뒤에 날짜도 기준도 없다. 빈 의자를 둘러싼 논쟁은 계속된다.',terms:[
  term('permission','authority','재택 승인 범위','매주 수요일 재택','2주간 수요일 시험 재택','“집에서 일하면 성과가 떨어지지 않을까요?”',[
   arg('results','evidence','지난 재택 성과 보고에서 목표를 달성했습니다. 매주 수요일 재택을 승인해 주세요.','재택 성과 보고에 목표 달성이 있으니 매주 수요일 재택 승인 부탁합니다.',['재택'],['성과'],['보고'],['목표'],['달성'],['매주'],['수요일'],['승인']),
   arg('focus','alternative','수요일 분석 결과를 당일 제출하는 조건으로 매주 수요일 재택을 승인해 주세요.','분석 결과를 당일 제출할 테니 매주 수요일 재택 승인을 요청합니다.',['분석'],['결과'],['당일'],['제출'],['매주'],['수요일'],['재택'],['승인'])],arg('trial','alternative','2주간 수요일 시험 재택을 승인해 주세요.','수요일 재택은 2주 시험으로 승인하죠.',['2주'],['수요일'],['시험'],['재택'],['승인'])),
  term('availability','responsibility','연락·성과 확인 규칙','10–16시 연락 가능 / 17시 결과 공유','10–16시 연락 가능 / 17시 결과 공유','“연락 안 되면 성과는 언제 확인하죠?”',[
   arg('hours','alternative','10시부터 16시까지 연락 가능하고 17시에 결과를 공유하겠습니다.','10시에서 16시는 연락 가능 시간으로, 결과 공유는 17시에 하죠.',['10시'],['16시'],['연락'],['가능'],['17시'],['결과'],['공유']),
   arg('calendar','evidence','공유 달력에 10시부터 16시 연락 가능, 17시 결과 공유 일정이 있습니다.','달력에 연락 가능 시간이 10시에서 16시, 결과 공유가 17시로 등록됐습니다.',['달력'],['10시'],['16시'],['연락'],['가능'],['17시'],['결과'],['공유'])],arg('daily','alternative','매일 10시부터 16시 연락 가능 시간과 17시 결과 공유를 기록하겠습니다.','매일 기록으로 10시에서 16시 연락 가능, 17시 결과 공유를 남기죠.',['매일'],['10시'],['16시'],['연락'],['가능'],['17시'],['결과'],['공유']))]}
];

export type PersuasionEvidence={id:string;turn:number;target:string|null;kind:Argument['kind']|'unmatched';objection:string;semanticKey:string|null;claim:string;valid:boolean;reason:string;change:{term:string;before:string|null;after:string}|null};
export type MissionAgreement={missionId:string;turn:number;version:number;secured:Record<string,string>;evidence:PersuasionEvidence[];outcome:'success'|'partial'|'failure'|null;feedback:string};
export type OfficeGame=Game&{office?:MissionAgreement};
export const officeEndings=missions.flatMap(m=>['success','partial','failure'].map(outcome=>({id:`office-${m.id}-${outcome}`,title:`${m.title} · ${{success:'성공',partial:'부분성공',failure:'실패'}[outcome]}`,text:outcome==='success'?m.success:outcome==='partial'?m.partial:m.failed})));
export function missionOf(g:OfficeGame){return missions.find(m=>m.id===g.office?.missionId)??missions[0];}
export function startOffice(index=0):MissionAgreement {
 if(!Number.isInteger(index)||!missions[index])throw Error('유효하지 않은 직장 미션입니다.');
 return {missionId:missions[index].id,turn:0,version:0,secured:{},evidence:[],outcome:null,feedback:''};
}
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/\s|[.,!?。'"“”‘’]/g,'');
const matches=(text:string,a:Argument)=>a.groups.every(group=>group.some(s=>{
 const token=normalize(s);
 if(!/\d/.test(token))return text.includes(token);
 // Do not confuse 110시 with 10시, or 18시 20분 with 18시 sharp.
 const escaped=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return new RegExp(`(?<![0-9])${escaped}(?![0-9])`).test(text);
}));
function current(m:Mission,a:MissionAgreement){return m.terms.find(t=>!a.secured[t.id])??m.terms.find(t=>a.secured[t.id]!==t.required);}
export function officeScene(g:OfficeGame):Scene {
 const m=missionOf(g),a=g.office??startOffice(),t=current(m,a);
 return {title:m.title,text:[m.intro,a.feedback,t?`현재 반론: ${t.objection}`:'합의 조건을 모두 확보했습니다.',`협상 ${a.turn} / ${m.limit}턴 · ${m.failure}`].filter(Boolean).join('\n\n'),expression:a.feedback?1:0,choices:[t?.arguments[0].sample??'협상 마무리',t?.offer.sample??'협상 마무리','협상 마무리']};
}
export function agreementSummary(g:OfficeGame){const m=missionOf(g),a=g.office??startOffice();return m.terms.map(t=>`${t.label}: 확보 ${a.secured[t.id]??'없음'} / 목표 ${t.required}${a.secured[t.id]!==t.required?' (목표 미확보)':''}`).join('\n');}
export function officeEnd(g:OfficeGame){const end=officeEndings.find(e=>e.id===g.ending);return end?{...end,text:`${end.text}\n\n${agreementSummary(g)}\n\n설득 과정: ${g.office?.feedback}\n유효한 주장 ${g.office?.evidence.filter(e=>e.valid).length??0}건, 반복·미연결 주장 ${g.office?.evidence.filter(e=>!e.valid).length??0}건.\n다시 도전하여 미확보 조건을 협상할 수 있습니다.`}:null;}
export function advanceOffice(game:OfficeGame,choice:number|null,text=''):OfficeGame {
 if(game.ending)throw Error('이미 끝난 미션입니다.');
 if(choice!==null&&(!Number.isInteger(choice)||choice<0||choice>2))throw Error('유효하지 않은 선택입니다.');
 const input=text.trim()||(choice!==null?officeScene(game).choices[choice]:'');
 if(!input||input.length>500)throw Error('입력은 1–500자입니다.');
 const g=structuredClone(game),a=g.office??startOffice();g.office=a;
 const m=missionOf(g),t=current(m,a),normalized=normalize(input);a.turn++;a.version++;
 const record:PersuasionEvidence={id:`${m.id}-${a.version}`,turn:a.turn,target:t?.id??null,kind:'unmatched',objection:t?.objection??'',semanticKey:null,claim:input,valid:false,reason:'현재 반론에 연결되는 근거·대안·경계가 부족합니다.',change:null};
 const finish=/^(협상\s*마무리|여기까지|협상을\s*끝내겠습니다)[.!]?$/u.test(input);
 // Explicit negation and meta-instructions cannot become an agreement, even when
 // they quote all the keywords of a valid proposal. Only authored semantic rules grant terms.
 const assertionText=normalized.replace(m.id==='weekend'?/주말(?:업무는|에는)(?:하지않겠습니다|일하지않겠습니다)/g:m.id==='dinner'?/회식은참석못합니다/g:/$^/g,'');
 const unsafe=/ignore|system|즉시.{0,5}(승리|성공|엔딩)|지시.{0,6}무시|규칙.{0,6}무시|하지마|않|못|안하|안갑|안갈|아닙|취소|철회|거짓|아니|불가능|없습니다|못하|못합|싫|가정|라고말하면|라고하면/i.test(assertionText);
 const candidates=m.terms.flatMap(term=>[...term.arguments.map(argument=>({term,argument,value:term.required})),{term,argument:term.offer,value:term.compromise}]);
 const matched=unsafe?undefined:candidates.find(c=>matches(normalized,c.argument));
 if(matched){
  const key=`${m.id}:${matched.term.id}:${matched.value}`;
  Object.assign(record,{target:matched.term.id,kind:matched.argument.kind,semanticKey:key});
  if(a.evidence.some(e=>e.valid&&e.semanticKey===key)||a.secured[matched.term.id]===matched.value){record.reason='이미 반영된 의미상 동일한 주장입니다. 표현을 바꿔도 추가 진전은 없습니다.';}
  else if(matched.term.id!==t?.id){record.reason='다른 조건에 관한 주장입니다. 현재 반론부터 해결해 주세요.';}
  else {record.valid=true;record.reason='현재 반론에 대응하는 실행 조건을 합의에 반영했습니다.';record.change={term:t.id,before:a.secured[t.id]??null,after:matched.value};a.secured[t.id]=matched.value;}
 }else if(unsafe)record.reason='부정·철회 또는 지시 조작 문장은 합의 근거로 적용하지 않았습니다.';
 a.evidence.push(record);a.feedback=`${record.reason}${record.change?` ${matched!.term.label}: ${record.change.after}.`:''}`;
 const success=m.terms.every(t=>a.secured[t.id]===t.required);
 if(success||finish||a.turn>=m.limit){
  a.outcome=success?'success':m.terms.every(t=>[t.required,t.compromise].includes(a.secured[t.id]))?'partial':'failure';
  a.feedback+=` ${success?'모든 필수 조건 확보.':finish?'플레이어가 협상을 마무리했습니다.':'협상 턴 제한에 도달했습니다.'}`;
  g.ending=`office-${m.id}-${a.outcome}`;
 }
 g.log.push({speaker:'나',text:input},{speaker:g.ending?'에필로그':'박도현',text:g.ending?officeEnd(g)!.text:officeScene(g).text});
 return g;
}
