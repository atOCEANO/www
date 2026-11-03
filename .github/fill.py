import html
import json
import os
import re
import urllib.error
import urllib.request


API = "https://api.github.com"
SITE = "https://atoceano.org/"
VERSION = re.compile(r'(<span[^>]*data-repo="([^"]+)"[^>]*>)([^<]*)(</span>)')


def read(url, token=None):
    request = urllib.request.Request(url, headers={"User-Agent": "atoceano-pages"})
    if token is not None:
        request.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def latest(repo, token):
    try:
        release = read(API + "/repos/atOCEANO/" + repo + "/releases/latest", token)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return ""
        raise
    return json.loads(release)["tag_name"]


def shown(page):
    values = {}
    for match in VERSION.finditer(page):
        values["version of " + match.group(2)] = html.unescape(match.group(3)).strip()
    return values


def version(match):
    return match.group(1) + html.escape(versions[match.group(2)], quote=False) + match.group(4)


token = os.environ["GH_TOKEN"]
with open("index.html", encoding="utf-8") as source:
    page = source.read()

names = {match.group(2) for match in VERSION.finditer(page)}
versions = {name: latest(name, token) for name in names}
page = VERSION.sub(version, page)

changed = True
if os.environ.get("GITHUB_EVENT_NAME") == "schedule":
    try:
        changed = shown(read(SITE)) != shown(page)
    except OSError:
        pass

with open("index.html", "w", encoding="utf-8", newline="\n") as target:
    target.write(page)
with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
    output.write("changed=" + str(changed).lower() + "\n")
print(json.dumps(shown(page), indent=4))
print("changed:", changed)
