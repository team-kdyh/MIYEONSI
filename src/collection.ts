type Ending={id:string;title:string;text:string};

/** Battle win/loss are discoverable; retain old partial endings only when unlocked. */
export function collectionCatalogue<T extends Ending>(groups:Record<string,T[]>,unlocked:string[]){
 return Object.fromEntries(Object.entries(groups).map(([mode,items])=>[mode,items.filter(item=>!/^office-.+-(partial|closed|agreed)$/.test(item.id)||unlocked.includes(item.id))]));
}

/** Gallery themes must not invent the old script's specific events in a new AI story. */
export function collectionSummary(ending:Ending,current?:{ending:string|null;end?:{text:string}|null}|null){
 if(current?.ending===ending.id&&current.end?.text)return current.end.text;
 if(/^office-.+-success$/.test(ending.id))return '대화를 통해 협상을 유리하게 마쳤습니다.';
 if(/^office-.+-failure$/.test(ending.id))return '이번 협상에서는 원하는 결과를 얻지 못했습니다. 같은 미션에 다시 도전할 수 있습니다.';
 if(/^office-.+-partial$/.test(ending.id))return '서로 양보할 수 있는 조건을 찾아 협상을 마쳤습니다.';
 const themes:Record<string,string>={
  'romance-0':'반복을 멈추고 두 사람의 관계를 다시 정리하는 결말입니다.',
  'romance-1':'같은 기록에 머무르기로 선택한 결말입니다.',
  'romance-2':'관계를 끝내고 각자의 시간으로 돌아가는 결말입니다.',
  'romance-3':'기록의 변화를 확인하고 원본을 복원하는 결말입니다.'
 };
 return themes[ending.id]??ending.text;
}
