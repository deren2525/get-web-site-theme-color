"""Publish release notes from a merged develop-to-main PR."""

import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def section(body, heading):
    match = re.search(
        rf"^##\s+{re.escape(heading)}\s*\n(.*?)(?=^##\s|\Z)",
        body.replace("\r\n", "\n"),
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def prepare_release(event, config, template):
    pr = event["pull_request"]
    if not (
        pr["merged"]
        and pr["base"]["ref"] == "main"
        and pr["head"]["ref"] == "develop"
        and pr["head"]["repo"]["full_name"] == event["repository"]["full_name"]
    ):
        raise ValueError("Expected a merged develop-to-main PR from this repository")
    version = re.search(
        r"\bmanifest\s*:\s*\{\s*.*?\bversion\s*:\s*['\"](\d+\.\d+\.\d+)['\"]",
        config,
        re.DOTALL,
    )
    if not version:
        raise ValueError("Cannot read manifest.version from wxt.config.ts")
    changes = section(pr["body"] or "", "リリース内容")
    if not changes:
        raise ValueError("Release PR must contain a nonempty リリース内容 section")
    # Only include actual PR entries, never a 'none' placeholder.
    entries = [
        line for line in section(pr["body"], "対象PR").splitlines()
        if re.match(r"^\s*[-*]\s+(?:#\d+\b|\[#\d+\]\()", line)
    ]
    related = "\n## 関連PR\n\n" + "\n".join(entries) if entries else ""
    notes = template.replace("{{changes}}", changes).replace("{{pull_requests}}", related)
    tag = "v" + version.group(1)
    return {
        "tag_name": tag,
        "name": tag,
        "target_commitish": pr["merge_commit_sha"],
        "body": notes.strip() + "\n",
    }


def api(path, payload=None):
    request = Request(
        f"{os.environ.get('GITHUB_API_URL', 'https://api.github.com')}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={
            "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def publish(repository, payload):
    releases = f"/repos/{repository}/releases"
    try:
        existing = api(f"{releases}/tags/{payload['tag_name']}")
    except HTTPError as error:
        if error.code != 404:
            raise
    else:
        print(f"Release already exists; leaving unchanged: {existing['html_url']}")
        return
    release = api(releases, payload)
    print(f"Created release: {release['html_url']}")


if __name__ == "__main__":
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    payload = prepare_release(
        event,
        Path("wxt.config.ts").read_text(),
        Path(".github/release-notes-template.md").read_text(),
    )
    publish(event["repository"]["full_name"], payload)
