import urllib.request
import re

url = "https://en.wikipedia.org/wiki/Nestl%C3%A9"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    html = response.read().decode('utf-8')

match = re.search(r'src="(//upload\.wikimedia\.org/wikipedia/[a-z]+/thumb/[^"]+Nestl%C3%A9.*?\.svg)[/"]', html)
if match:
    svg_thumb = "https:" + match.group(1)
    svg_url = re.sub(r'/thumb(/.*\.svg)/.*', r'\1', svg_thumb)
    
    print("Found SVG URL:", svg_url)
    req = urllib.request.Request(svg_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            svg_data = response.read().decode('utf-8')
        
        svg_data = re.sub(r'fill="[^"]+"', '', svg_data)
        svg_data = svg_data.replace('<svg', '<svg fill="#5D4037"')
        
        with open("src/assets/images/logo.svg", "w", encoding="utf-8") as f:
            f.write(svg_data)
        print("Logo downloaded and colored successfully.")
    except Exception as e:
        print("Error downloading SVG:", e)
else:
    print("Could not find the SVG logo on Wikipedia.")
