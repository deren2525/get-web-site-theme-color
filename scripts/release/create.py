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
    payload = {**payload, "body": release_notes(repository, payload)}
    release = api(releases, payload)
    print(f"Created release: {release['html_url']}")


def release_notes(repository, payload):
    generated = api(f"/repos/{repository}/releases/generate-notes", {
        "tag_name": payload["tag_name"],
        "target_commitish": payload["target_commitish"],
    })["body"].replace("\r\n", "\n")
    pr_numbers = dict.fromkeys(re.findall(
        rf"https://github\.com/{re.escape(repository)}/pull/(\d+)\b", generated
    ))
    changes = []
    for number in pr_numbers:
        pr = api(f"/repos/{repository}/pulls/{number}")
        if pr.get("merged_at"):
            changes.extend(section(pr.get("body") or "", "リリース内容").splitlines())
    if not any(line.strip() for line in changes):
        changes = section(payload["body"], "リリース内容").splitlines()
    # Keep the first occurrence when multiple release PRs repeat a change.
    changes = list(dict.fromkeys(line for line in changes if line.strip()))
    if not changes:
        raise ValueError("No release content found for this release range")
    changelog, separator, comparison = generated.partition("**Full Changelog**:")
    template = Path(".github/release-notes-template.md").read_text()
    notes = template.replace("{{changelog}}", changelog.strip()).replace(
        "{{changes}}", "\n".join(changes)
    ).strip()
    if separator:
        notes += f"\n\n{separator} {comparison.strip()}"
    return notes + "\n"


if __name__ == "__main__":
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    payload = prepare_release(
        event,
        Path("wxt.config.ts").read_text(),
        Path(".github/release-notes-template.md").read_text(),
    )
    publish(event["repository"]["full_name"], payload)
