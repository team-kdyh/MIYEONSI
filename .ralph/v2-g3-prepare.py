from pathlib import Path
import shutil,json,hashlib
root=Path(__file__).resolve().parent.parent;probe=root/'.ralph/v2-g3-review-probe'
worker=Path('C:/Users/gjtjw/.ouroboros/worktrees/대화형 스토리진행/ralph-afterhours-v2-revision-14128a7')
assert probe.is_relative_to(root) and (probe/'server/revision-response-scope.test.ts').is_file()
for folder in ['src','public','tests','scripts']:
 shutil.copytree(root/folder,probe/folder,dirs_exist_ok=True)
for name in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','play.cmd','stop.cmd','THIRD_PARTY_NOTICES.txt']:
 shutil.copyfile(root/name,probe/name)
for name in ['v2-live-02.json','v2-live-03.json','v2-live-20.json']:shutil.copyfile(root/'docs'/name,probe/'docs'/name)
for name in ['music.test.ts','visual-binding.test.ts','commitment-revisions-retraction.test.ts']:shutil.copyfile(root/'server'/name,probe/'server'/name)
shutil.copyfile(worker/'tests/v2-participation.spec.ts',probe/'tests/v2-participation.spec.ts')
shutil.copyfile(worker/'tests/commitment-transport.mjs',probe/'tests/commitment-transport.mjs')
p=probe/'playwright.config.ts';text=p.read_text(encoding='utf8');assert "'v2-prop-withdrawal.spec.ts'" in text
p.write_text(text.replace("'v2-prop-withdrawal.spec.ts'","'v2-prop-withdrawal.spec.ts','v2-participation.spec.ts'"),encoding='utf8')
p=probe/'server/index.ts';text=(root/'server/index.ts').read_text(encoding='utf8');needle='commitDialogue(p.game,choice??null,text.trim(),reply)';assert text.count(needle)==1
p.write_text(text.replace(needle,needle[:-1]+',requestId)'),encoding='utf8')
p=probe/'server/narrative.ts';text=p.read_text(encoding='utf8');old='이미 수락한 약속의 다른 내용은 commitmentRevisions로 명시해야 합니다.';new='약속 내용이 달라졌지만 변경에 대한 합의를 확인하지 못했습니다. 기존 약속은 그대로 유지됩니다.'
assert old in text;p.write_text(text.replace(old,new),encoding='utf8')
p=probe/'server/commitment-revisions.ts';text=p.read_text(encoding='utf8');parent=(root/'server/commitment-revisions.ts').read_text(encoding='utf8')
block=parent[parent.index('// The quoted assent'):parent.index('// A bounded literal')]
assert 'function retractsAfter' not in text;text=text.replace('// A bounded literal',block+'// A bounded literal',1)
needle=' if([text.slice(text.indexOf(a.playerQuote)';assert needle in text
text=text.replace(needle,' if(retractsAfter(text,a.playerQuote)||retractsAfter(line,a.npcQuote))return false;\n'+needle,1);p.write_text(text,encoding='utf8')
print('Prepared isolated combined G3 snapshot; original workspace and active worker untouched.')
