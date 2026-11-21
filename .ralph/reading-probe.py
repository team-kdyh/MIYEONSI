from pathlib import Path
import shutil
root=Path.cwd();probe=root/'.ralph/reading-probe';probe.mkdir(exist_ok=True)
for folder in ['src','server','public','tests']:
 shutil.copytree(root/folder,probe/folder,dirs_exist_ok=True)
for f in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html']:
 shutil.copyfile(root/f,probe/f)
(probe/'docs').mkdir(exist_ok=True)
for f in ['v2-live-02.json','v2-live-03.json','v2-live-20.json']:
 shutil.copyfile(root/'docs'/f,probe/'docs'/f)
print(probe)
