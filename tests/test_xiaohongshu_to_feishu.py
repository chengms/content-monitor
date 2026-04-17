import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "xiaohongshu_to_feishu.py"


def load_module():
    spec = importlib.util.spec_from_file_location("xiaohongshu_to_feishu", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class XiaohongshuToFeishuTests(unittest.TestCase):
    def setUp(self):
        self.module = load_module()

    def test_parse_heat_handles_basic_values(self):
        self.assertEqual(self.module.parse_heat("1.2万"), 12000)
        self.assertEqual(self.module.parse_heat("123"), 123)
        self.assertEqual(self.module.parse_heat(""), 0)

    def test_parse_env_file_reads_key_values(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_path = Path(tmpdir) / ".env.local"
            env_path.write_text(
                "# comment\n"
                "FEISHU_APP_ID=app-id\n"
                "FEISHU_APP_SECRET=secret-value\n"
                "EMPTY=\n",
                encoding="utf-8",
            )

            result = self.module.parse_env_file(env_path)

        self.assertEqual(result["FEISHU_APP_ID"], "app-id")
        self.assertEqual(result["FEISHU_APP_SECRET"], "secret-value")
        self.assertEqual(result["EMPTY"], "")

    def test_build_run_plan_for_each_mode(self):
        self.assertEqual(
            self.module.build_run_plan("dry-run"),
            {"write_local": False, "sync_feishu": False},
        )
        self.assertEqual(
            self.module.build_run_plan("dry-run-local"),
            {"write_local": True, "sync_feishu": False},
        )
        self.assertEqual(
            self.module.build_run_plan("live"),
            {"write_local": True, "sync_feishu": True},
        )

    def test_get_feishu_config_allows_skipping_validation(self):
        config = self.module.get_feishu_config({}, required=False)
        self.assertEqual(config["app_id"], "")
        self.assertEqual(config["table_id"], "")

    def test_get_feishu_config_requires_all_fields_when_live(self):
        with self.assertRaises(ValueError) as ctx:
            self.module.get_feishu_config({"FEISHU_APP_ID": "only-one"}, required=True)

        self.assertIn("FEISHU_APP_SECRET", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
