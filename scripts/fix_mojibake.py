import os, io, re

SKIP_DIRS = re.compile(r'(?:^|[\\/])(?:node_modules|venv|\.venv|_archive|dist|build|coverage|\.git|__pycache__)(?:[\\/]|$)', re.I)
EXTS = {'.ts','.tsx','.js','.jsx','.css','.scss','.html','.md','.py','.txt'}

MAP = {
  'Ã ': 'à','Ã¡':'á','Ã¢':'â','Ã¤':'ä','Ã£':'ã','Ã§':'ç',
  'Ã¨':'è','Ã©':'é','Ãª':'ê','Ã«':'ë',
  'Ã¬':'ì','Ã­':'í','Ã®':'î','Ã¯':'ï',
  'Ã±':'ñ',
  'Ã²':'ò','Ã³':'ó','Ã´':'ô','Ã¶':'ö','Ãµ':'õ',
  'Ã¹':'ù','Ãº':'ú','Ã»':'û','Ã¼':'ü',
  'Ã½':'ý','Ã¿':'ÿ',

  'Ã€':'À','Ã':'Á','Ã‚':'Â','Ã„':'Ä','Ãƒ':'Ã','Ã‡':'Ç',
  'Ãˆ':'È','Ã‰':'É','ÃŠ':'Ê','Ã‹':'Ë',
  'ÃŒ':'Ì','Ã':'Í','ÃŽ':'Î','Ã':'Ï',
  'Ã‘':'Ñ',
  'Ã’':'Ò','Ã“':'Ó','Ã”':'Ô','Ã–':'Ö','Ã•':'Õ',
  'Ã™':'Ù','Ãš':'Ú','Ã›':'Û','Ãœ':'Ü','ÃŸ':'ß',

  'â€¦':'…','â€“':'–','â€”':'—','â€¢':'•',
  'â€˜':'‘','â€™':'’','â€œ':'“','â€\x9d':'”',
  'â‚¬':'€','â„¢':'™','â€º':'›','â€¹':'‹','â€¡':'‡','â€°':'‰','â€ž':'„','â€š':'‚',

  'Â©':'©','Â®':'®','Â°':'°','Â±':'±','Â·':'·',
  'Â½':'½','Â¼':'¼','Â¾':'¾','Â£':'£','Â¥':'¥','Â¢':'¢',
  'Â ':'',
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
