"""Refresh the published skill level tables. Run with Python 3; no packages needed."""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import time
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKILLS = 'Attack Strength Defence Ranged Prayer Magic Runecraft Construction Hitpoints Agility Herblore Thieving Crafting Fletching Slayer Hunter Mining Smithing Fishing Cooking Firemaking Woodcutting Farming Sailing'.split()
BASE = 'https://oldschool.runescape.wiki'

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.active = False
        self.level = None
        self.entries = []
        self.item = None
        self.nesting = 0
        self.anchor = None
        self.members = False
        self.levels = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'table':
            if 'level-up-table' in a.get('class', ''):
                self.active = True
            if self.active: self.depth += 1
        if not self.active: return
        if tag == 'th' and a.get('id', '').isdigit():
            level = int(a['id'])
            self.level = level if 1 <= level <= 99 else None
            if self.level: self.levels.add(level)
        if tag == 'td':
            if 'lvlupmem' in a.get('class', ''): self.members = True
            if 'lvlupfree' in a.get('class', ''): self.members = False
        if tag == 'li' and self.level:
            if self.item is None: self.item = {'text': [], 'links': [], 'images': [], 'members': self.members, 'level': self.level}
            self.nesting += 1
        if self.item is not None:
            if tag == 'a':
                title = a.get('title', '')
                href = a.get('href', '')
                self.anchor = title
                if href.startswith('/w/') and title and not title.startswith(('File:', 'Category:')):
                    link = {'title': title, 'url': BASE + href}
                    if link not in self.item['links']: self.item['links'].append(link)
            if tag == 'img' and self.anchor in SKILLS:
                self.item['text'].append(' ' + self.anchor + ' ')
            if tag == 'img' and self.anchor not in SKILLS + ['Quest points','Achievement Diary','Members','Free-to-play']:
                src = a.get('src','')
                if src.startswith('/images/') and not src.lower().endswith('.svg'):
                    image = {'url':BASE + src, 'title':self.anchor or a.get('alt','')}
                    if image not in self.item['images']: self.item['images'].append(image)
            if tag in ('br', 'p'): self.item['text'].append(' ')

    def handle_endtag(self, tag):
        if not self.active: return
        if tag == 'a': self.anchor = None
        if tag == 'li' and self.item is not None:
            self.nesting -= 1
            if self.nesting == 0:
                self.item['text'] = re.sub(r'\s+', ' ', ''.join(self.item['text'])).strip()
                if self.item['text']: self.entries.append(self.item)
                self.item = None
        if tag == 'table':
            self.depth -= 1
            if self.depth == 0: self.active = False

    def handle_data(self, data):
        if self.item is not None: self.item['text'].append(data)

def read_api(params):
    request = urllib.request.Request(BASE + '/api.php?' + urllib.parse.urlencode(params), headers={'User-Agent': 'GielinorPathwaysPrototype/0.2 (personal non-commercial skill planner)'})
    with urllib.request.urlopen(request, timeout=45) as response: return json.load(response)

def fetch(skill):
    cache = ROOT / 'sources' / (skill + '.json')
    raw = json.loads(cache.read_text(encoding='utf-8')) if cache.exists() and '--refresh' not in sys.argv else read_api({'action':'parse', 'page':skill + '/Level up table', 'prop':'text|revid', 'format':'json'})
    if 'parse' not in raw: raise RuntimeError(str(raw))
    parser = TableParser()
    parser.feed(raw['parse']['text']['*'])
    if len(parser.levels) < 90 or not parser.entries: raise RuntimeError('Incomplete level table: ' + skill)
    folder = ROOT / 'sources'
    folder.mkdir(exist_ok=True)
    (folder / (skill + '.json')).write_text(json.dumps(raw, ensure_ascii=False), encoding='utf-8')
    return skill, raw['parse']['revid'], parser

def main():
    rights = read_api({'action':'query','meta':'siteinfo','siprop':'rightsinfo','format':'json'})['query']['rightsinfo']
    data = {'retrieved':datetime.now(timezone.utc).isoformat(), 'license':rights, 'skills':{}, 'entries':[]}
    unique = {}
    # Two readers keep load modest. Every response is cached for inspection.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for skill, revision, parser in pool.map(fetch, SKILLS):
            data['skills'][skill] = {'revision':revision,'levels':sorted(parser.levels),'source':BASE + '/w/' + skill + '/Level_up_table'}
            for item in parser.entries:
                digest = hashlib.sha256((skill + str(item['level']) + item['text']).encode()).hexdigest()[:14]
                key = 'wiki-' + digest
                if key in unique:
                    unique[key]['members'] = unique[key]['members'] and item['members']
                else:
                    unique[key] = {'id':key, 'skill':skill, **item}
            print(skill, len(parser.entries), 'unlocks', flush=True)
    data['entries'] = list(unique.values())
    output = ROOT / 'dist' / 'wiki-data.mjs'
    output.write_text('export const wikiData = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('Wrote', len(data['entries']), 'unlocks from', len(data['skills']), 'skills', flush=True)

if __name__ == '__main__': main()
