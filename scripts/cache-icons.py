"""Cache small Wiki icons used on core paths and the first detailed skills."""
import base64
import concurrent.futures
import json
import pathlib
import urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
requests=json.loads((ROOT/'sources/icon-requests.json').read_text(encoding='utf-8'))
folder=ROOT/'sources/icon-cache'
folder.mkdir(exist_ok=True)
def download(url):
    import hashlib
    key=hashlib.sha256(url.encode()).hexdigest()+'.json'
    cache=folder/key
    if cache.exists(): return url,json.loads(cache.read_text())
    try:
        request=urllib.request.Request(url,headers={'User-Agent':'GielinorPathways/0.4 (personal non-commercial skill planner)'})
        with urllib.request.urlopen(request,timeout=15) as response:
            mime=response.headers.get_content_type()
            if mime not in ('image/png','image/gif','image/jpeg','image/webp'): return url,None
            data=response.read(150001)
        if len(data)>150000: return url,None
        result='data:'+mime+';base64,'+base64.b64encode(data).decode()
        cache.write_text(json.dumps(result))
        return url,result
    except Exception: return url,None
icons={}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for index,(url,data) in enumerate(pool.map(download,requests)):
        if data: icons[url]=data
        if (index+1)%50==0: print('Processed',index+1,'of',len(requests),'icons',flush=True)
(ROOT/'dist/icon-data.mjs').write_text('export const iconData='+json.dumps(icons,separators=(',',':'))+';\n',encoding='utf-8')
print('Cached',len(icons),'Wiki icons.',flush=True)
