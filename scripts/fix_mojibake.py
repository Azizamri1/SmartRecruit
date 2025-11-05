import os, io, re

SKIP_DIRS = re.compile(r'(?:^|[\\/])(?:node_modules|venv|\.venv|_archive|dist|build|coverage|\.git|__pycache__)(?:[\\/]|$)', re.I)
EXTS = {'.ts','.tsx','.js','.jsx','.css','.scss','.html','.md','.py','.txt'}

MAP = {
  'à': 'à','á':'á','â':'â','ä':'ä','ã':'ã','ç':'ç',
  'è':'è','é':'é','ê':'ê','ë':'ë',
  'ì':'ì','í':'í','î':'î','ï':'ï',
  'ñ':'ñ',
  'ò':'ò','ó':'ó','ô':'ô','ö':'ö','õ':'õ',
  'ù':'ù','ú':'ú','û':'û','ü':'ü',
  'ý':'ý','ÿ':'ÿ',

  'À':'À','Á':'Á','Â':'Â','Ä':'Ä','Ã':'Ã','Ç':'Ç',
  'È':'È','É':'É','Ê':'Ê','Ë':'Ë',
  'Ì':'Ì','Í':'Í','Î':'Î','Ï':'Ï',
  'Ñ':'Ñ',
  'Ò':'Ò','Ó':'Ó','Ô':'Ô','Ö':'Ö','Õ':'Õ',
  'Ù':'Ù','Ú':'Ú','Û':'Û','Ü':'Ü','ß':'ß',

  '…':'…','–':'–','—':'—','•':'•',
  '‘':'‘','’':'’','“':'“','â€\x9d':'”',
  '€':'€','™':'™','›':'›','‹':'‹','‡':'‡','‰':'‰','„':'„','‚':'‚',

  '©':'©','®':'®','°':'°','±':'±','·':'·',
  '½':'½','¼':'¼','¾':'¾','£':'£','¥':'¥','¢':'¢',
  '':'',
}

def should_process(path:str)->bool:
  if SKIP_DIRS.search(path):
    return False
  _, ext = os.path.splitext(path)
  return ext.lower() in EXTS

def fix_text(s:str)->str:
  for bad, good in MAP.items():
    s = s.replace(bad, good)
  return s

def main():
  changed = 0
  for root, dirs, files in os.walk('.'):
    # prune skip dirs
    dirs[:] = [d for d in dirs if not SKIP_DIRS.search(os.path.join(root,d))]
    for fn in files:
      path = os.path.join(root, fn)
      if not should_process(path):
        continue
      with io.open(path, 'r', encoding='utf-8', errors='strict') as f:
        try:
          txt = f.read()
        except UnicodeDecodeError:
          # if file isn't valid UTF-8, read as latin-1 then save as utf-8 after fixes
          with io.open(path, 'r', encoding='latin-1', errors='strict') as f2:
            txt = f2.read()
      fixed = fix_text(txt)
      if fixed != txt:
        with io.open(path, 'w', encoding='utf-8', newline='') as f:
          f.write(fixed)
        changed += 1
  print(f"Updated {changed} files.")

if __name__ == "__main__":
  main()
