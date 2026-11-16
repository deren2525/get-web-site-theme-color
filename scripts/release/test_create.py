import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from create import prepare_release, publish


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.event = {
            "repository": {"full_name": "owner/repo"},
            "pull_request": {
                "merged": True,
                "base": {"ref": "main"},
                "head": {"ref": "develop", "repo": {"full_name": "owner/repo"}},
                "merge_commit_sha": "merged-sha",
                "body": "## リリース内容\n- 修正\n\n## 確認内容\n- CI成功\n",
            },
        }
        self.config = "export default { manifest: { version: '2.5.0' } }"
        self.template = "## 変更内容\n\n{{changes}}\n{{pull_requests}}\n"

    def prepare(self):
        return prepare_release(self.event, self.config, self.template)

    def test_notes_exclude_internal_verification_and_use_merge_commit(self):
        payload = self.prepare()
        self.assertEqual(payload["body"], "## 変更内容\n\n- 修正\n")
        self.assertEqual(payload["tag_name"], "v2.5.0")
        self.assertEqual(payload["target_commitish"], "merged-sha")

    def test_related_prs_and_crlf(self):
        self.event["pull_request"]["body"] += "\n## 対象PR\n- #12 修正\n- [#13](https://example.com) 更新\n"
        self.event["pull_request"]["body"] = self.event["pull_request"]["body"].replace("\n", "\r\n")
        self.assertIn("## 関連PR\n\n- #12 修正", self.prepare()["body"])
        self.assertIn("- [#13]", self.prepare()["body"])

    def test_empty_pr_section_is_omitted(self):
        self.event["pull_request"]["body"] += "\n## 対象PR\n- なし\n"
        self.assertNotIn("関連PR", self.prepare()["body"])
        self.assertNotIn("なし", self.prepare()["body"])

    def test_missing_changes_and_wrong_branch_are_rejected(self):
        self.event["pull_request"]["body"] = "## 確認内容\nCI成功"
        with self.assertRaises(ValueError):
            self.prepare()
        self.event["pull_request"]["head"]["ref"] = "feature"
        with self.assertRaises(ValueError):
            self.prepare()

    @patch("create.api")
    def test_existing_release_is_not_overwritten(self, api):
        api.return_value = {"html_url": "existing"}
        publish("owner/repo", self.prepare())
        self.assertEqual(api.call_count, 1)

    @patch("create.api")
    def test_missing_release_is_created_but_auth_errors_fail(self, api):
        payload = self.prepare()
        api.side_effect = [HTTPError("url", 404, "missing", {}, None), {"html_url": "new"}]
        publish("owner/repo", payload)
        api.assert_called_with("/repos/owner/repo/releases", payload)
        api.side_effect = HTTPError("url", 403, "forbidden", {}, None)
        with self.assertRaises(HTTPError):
            publish("owner/repo", payload)


if __name__ == "__main__":
    unittest.main()
