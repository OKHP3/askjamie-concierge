from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "audit-repo.py"
SPEC = importlib.util.spec_from_file_location("audit_repo", SCRIPT)
assert SPEC and SPEC.loader
audit_repo = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit_repo)


class AuditRepoTests(unittest.TestCase):
    def test_pre_delete_tip_change_holds_and_emits_no_deletion_commands(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._init_repo(root)
            self._git(root, "switch", "-q", "-c", "feature/cleanup")
            (root / "reviewed.txt").write_text("reviewed\n", encoding="utf-8")
            self._git(root, "add", "reviewed.txt")
            self._git(root, "commit", "-qm", "reviewed work")
            reviewed_head = self._git(root, "rev-parse", "HEAD").strip()

            (root / "moved.txt").write_text("changed\n", encoding="utf-8")
            self._git(root, "add", "moved.txt")
            self._git(root, "commit", "-qm", "moved branch tip")

            check = audit_repo.prepare_branch_deletion(
                root,
                "feature/cleanup",
                reviewed_head,
            )
            self.assertEqual(check["bucket"], "review")
            self.assertEqual(check["reviewed_head"], reviewed_head)
            self.assertEqual(
                check["current_head"],
                self._git(root, "rev-parse", "HEAD").strip(),
            )
            self.assertEqual(check["deletion_commands"], [])

    def test_pre_delete_matching_tip_keeps_remote_first_sequence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._init_repo(root)
            self._git(root, "switch", "-q", "-c", "feature/cleanup")
            (root / "reviewed.txt").write_text("reviewed\n", encoding="utf-8")
            self._git(root, "add", "reviewed.txt")
            self._git(root, "commit", "-qm", "reviewed work")
            reviewed_head = self._git(root, "rev-parse", "HEAD").strip()

            self._add_remote(root, "upstream")
            check = audit_repo.prepare_branch_deletion(
                root,
                "feature/cleanup",
                reviewed_head,
                remote="upstream",
            )
            self.assertEqual(check["bucket"], "delete")
            self.assertEqual(check["reviewed_head"], reviewed_head)
            self.assertEqual(check["current_head"], reviewed_head)
            self.assertEqual(check["deletion_commands"], [
                ["git", "push", f"--force-with-lease=refs/heads/feature/cleanup:{reviewed_head}",
                 "upstream", ":refs/heads/feature/cleanup"],
                ["git", "branch", "-d", "feature/cleanup"],
            ])

    def test_remote_tip_change_holds_even_when_local_tip_is_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._init_repo(root)
            self._git(root, "branch", "feature/cleanup")
            reviewed = self._git(root, "rev-parse", "HEAD").strip()
            self._add_remote(root)
            self._git(root, "commit", "--allow-empty", "-qm", "new remote work")
            advanced = self._git(root, "rev-parse", "HEAD").strip()
            self._git(root, "push", "origin", "HEAD:refs/heads/feature/cleanup")
            check = audit_repo.prepare_branch_deletion(root, "feature/cleanup", reviewed)
            self.assertEqual(check["bucket"], "review")
            self.assertEqual(check["current_head"], reviewed)
            self.assertEqual(check["remote_head"], advanced)
            self.assertEqual(check["deletion_commands"], [])

    def test_lease_rejects_remote_advance_after_plan_and_preserves_branch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._init_repo(root)
            self._git(root, "branch", "feature/cleanup")
            reviewed = self._git(root, "rev-parse", "HEAD").strip()
            self._add_remote(root)
            check = audit_repo.prepare_branch_deletion(root, "feature/cleanup", reviewed)
            self._git(root, "commit", "--allow-empty", "-qm", "new remote work")
            advanced = self._git(root, "rev-parse", "HEAD").strip()
            self._git(root, "push", "origin", "HEAD:refs/heads/feature/cleanup")
            # A fetch must not weaken the explicit expected-SHA lease.
            self._git(root, "fetch", "origin")
            result = subprocess.run(check["deletion_commands"][0], cwd=root,
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(advanced, self._git(root, "ls-remote", "origin", "refs/heads/feature/cleanup"))

    def test_matching_lease_deletes_only_the_reviewed_remote_branch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self._init_repo(root)
            self._git(root, "branch", "feature/cleanup")
            reviewed = self._git(root, "rev-parse", "HEAD").strip()
            self._add_remote(root)
            check = audit_repo.prepare_branch_deletion(root, "feature/cleanup", reviewed)
            subprocess.run(check["deletion_commands"][0], cwd=root, check=True,
                           capture_output=True, text=True)
            self.assertEqual(self._git(root, "ls-remote", "origin", "refs/heads/feature/cleanup"), "")
            self.assertIn(reviewed, self._git(root, "ls-remote", "origin", "refs/heads/main"))

    def test_missing_remote_branch_and_unavailable_remote_fail_closed(self) -> None:
        for has_remote in (False, True):
            with self.subTest(has_remote=has_remote), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self._init_repo(root)
                if has_remote:
                    self._add_remote(root)
                self._git(root, "branch", "feature/cleanup")
                reviewed = self._git(root, "rev-parse", "HEAD").strip()
                with self.assertRaises(audit_repo.AuditError):
                    audit_repo.prepare_branch_deletion(root, "feature/cleanup", reviewed)

    def test_cli_nested_root_audits_the_entire_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            self._init_repo(root)
            nested = root / "docs" / "nested"
            nested.mkdir(parents=True)
            detritus = root / "attached_assets"
            detritus.mkdir()
            (detritus / "note.txt").write_text("tracked", encoding="utf-8")
            (root / "Bad Name.txt").write_text("outside nested root", encoding="utf-8")
            self._git(root, "add", "attached_assets/note.txt")
            result = subprocess.run([sys.executable, str(SCRIPT), "--root", str(nested),
                                     "--base", "main"], check=True, capture_output=True, text=True)
            report = json.loads(result.stdout)
            self.assertEqual(Path(report["root"]), root)
            self.assertIn("Bad Name.txt", [item["path"] for item in report["naming_violations"]])
            self.assertEqual(report["detritus_folders"], [
                {"folder": "attached_assets", "tracked_file_count": 1},
            ])

    def test_cli_rejects_missing_deletion_approval_details(self) -> None:
        invalid_invocations = [
            (["--reviewed-head", "reviewed-sha"], "--check-delete requires --branch"),
            (["--branch", "feature/cleanup"], "--check-delete requires --reviewed-head"),
        ]
        for arguments, expected_error in invalid_invocations:
            with self.subTest(arguments=arguments), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self._init_repo(root)

                result = subprocess.run(
                    [
                        sys.executable,
                        str(SCRIPT),
                        "--root",
                        str(root),
                        "--check-delete",
                        *arguments,
                    ],
                    check=False,
                    capture_output=True,
                    text=True,
                )

                self.assertNotEqual(result.returncode, 0)
                error_report = json.loads(result.stdout)
                self.assertEqual(error_report["error"], expected_error)
                self.assertNotIn("deletion_commands", error_report)
                self.assertNotIn('"bucket": "delete"', result.stdout)

    def test_naming_exceptions_and_violations(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in [
                "SiteTokens.css", "useDebounce.ts", "ChatPane.tsx",
                "My Document.md", "README.md", "robots.txt", "my_file.json",
                "photo.PNG",
            ]:
                (root / name).write_text("x", encoding="utf-8")
            violations = {
                item["path"]: item["reason"]
                for item in audit_repo.audit_naming(root)
            }
            self.assertEqual(violations["SiteTokens.css"], "mixed/camel/Pascal case")
            self.assertEqual(violations["My Document.md"], "contains spaces")
            self.assertEqual(violations["my_file.json"], "uses underscores instead of hyphens")
            self.assertEqual(violations["photo.PNG"], "uppercase extension")
            self.assertNotIn("useDebounce.ts", violations)
            self.assertNotIn("ChatPane.tsx", violations)
            self.assertNotIn("README.md", violations)
            self.assertNotIn("robots.txt", violations)

    def test_nested_detritus_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            nested = root / "docs" / "attached_assets"
            nested.mkdir(parents=True)
            (nested / "note.txt").write_text("x", encoding="utf-8")
            folders = audit_repo.audit_detritus(root)
            self.assertEqual(folders[0]["folder"], "docs/attached_assets")

    def test_missing_base_fails_visibly(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            with self.assertRaises(audit_repo.AuditError):
                audit_repo.ensure_base(root, "origin/main")

    @staticmethod
    def _git(root: Path, *args: str) -> str:
        result = subprocess.run(
            ["git", *args],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout

    def _init_repo(self, root: Path) -> None:
        self._git(root, "init", "-q", "-b", "main")
        self._git(root, "config", "user.email", "test@example.com")
        self._git(root, "config", "user.name", "Audit Test")
        (root / "README.md").write_text("fixture\n", encoding="utf-8")
        self._git(root, "add", "README.md")
        self._git(root, "commit", "-qm", "initial")

    def _add_remote(self, root: Path, name: str = "origin") -> Path:
        remote = root / ".git" / "test-remote.git"
        self._git(root, "init", "--bare", "-q", str(remote))
        self._git(root, "remote", "add", name, str(remote))
        self._git(root, "push", name, "--all")
        return remote


if __name__ == "__main__":
    unittest.main()
