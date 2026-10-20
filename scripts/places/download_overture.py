"""Bounded public-data download. Requires duckdb; no API key or database credentials.
python scripts/places/download_overture.py min_lng min_lat max_lng max_lat new.jsonl
"""
import json
import math
import re
import sys
from pathlib import Path
from urllib.request import urlopen
import duckdb

if len(sys.argv) != 6:
    raise SystemExit('Expected bounding box and new output file')
west, south, east, north = map(float, sys.argv[1:5])
if not all(map(math.isfinite, [west, south, east, north])) or not (25 <= west < east <= 45 and 35 <= south < north <= 43):
    raise SystemExit('Expected bounded Turkish launch region')
if (east-west)*(north-south) > 1:
    raise SystemExit('Split downloads into regions smaller than one square degree')
output = Path(sys.argv[5])
if output.exists():
    raise SystemExit('Output must be a new file')
with urlopen('https://stac.overturemaps.org/catalog.json', timeout=30) as response:
    release = json.load(response)['latest']
if not re.fullmatch(r'\d{4}-\d{2}-\d{2}\.\d+', release):
    raise SystemExit('Unexpected release identifier')
con = duckdb.connect()
con.execute("SET threads=2; SET memory_limit='512MB'; INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
con.execute('''SELECT id,names,addresses,taxonomy,basic_category,confidence,operating_status,sources,bbox
FROM read_parquet(?) WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?
AND (basic_category IN ('cafe','coffee_shop','bar','pub','cocktail_bar','nightclub','night_club','gym','fitness_centre','fitness_center')
OR taxonomy.primary IN ('cafe','coffee_shop','bar','pub','cocktail_bar','nightclub','night_club','gym','fitness_centre','fitness_center')
OR list_contains(taxonomy.hierarchy,'cafe') OR list_contains(taxonomy.hierarchy,'bar')
OR list_contains(taxonomy.hierarchy,'gym') OR list_contains(taxonomy.hierarchy,'night_club'))''',
    [f's3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*',west,east,south,north])
columns = [column[0] for column in con.description]
partial=output.with_suffix(output.suffix+'.partial')
count=0
with partial.open('x',encoding='utf-8',newline='\n') as stream:
    while True:
        batch=con.fetchmany(500)
        if not batch:
            break
        for row in batch:
            props=dict(zip(columns,row)); bbox=props.pop('bbox'); ident=props.pop('id')
            stream.write(json.dumps({'type':'Feature','id':ident,'geometry':{'type':'Point','coordinates':[bbox['xmin'],bbox['ymin']]},'properties':props},ensure_ascii=False)+'\n')
            count+=1
partial.rename(output)
print(json.dumps({'release':release,'downloaded':count,'file':str(output)}))
