from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]


class MagazineBlankViewTests(unittest.TestCase):
    def test_controller_registers_as_feature_orb_view(self):
        source = (ROOT / "magazine/view/magazine-view-controller.js").read_text(encoding="utf-8")
        self.assertIn("api.register(VIEW_ID", source)
        self.assertIn("title: 'Magazine'", source)
        self.assertIn("shortLabel: 'Magazine'", source)
        self.assertIn("window.__liveEarthMagazineViewInstalled = true", source)
        self.assertIn("live-earth-feature-views-ready", source)

    def test_view_is_full_screen_and_empty(self):
        source = (ROOT / "magazine/view/magazine-view-controller.js").read_text(encoding="utf-8")
        self.assertIn("position:fixed", source)
        self.assertIn("inset:0", source)
        self.assertIn("background:#030509", source)
        self.assertIn("root = document.createElement('section')", source)
        for forbidden in (
            "innerHTML", "loadFeed", "fetch(",
            "LiveEarthUniversalPDFViewer", "LiveEarthUniversalEditorialEngine",
            "source_adapter", "LIVE FEEDS", "<h1", "<article"
        ):
            self.assertNotIn(forbidden, source)

    def test_feature_activation_and_close_hide_the_surface(self):
        source = (ROOT / "magazine/view/magazine-view-controller.js").read_text(encoding="utf-8")
        self.assertIn("root.hidden = false", source)
        self.assertIn("root.hidden = true", source)
        self.assertIn("api.open(VIEW_ID, 'api')", source)
        self.assertIn("api.close('api')", source)
        self.assertIn("api.isActive(VIEW_ID)", source)

    def test_update_manager_loads_magazine_controller(self):
        source = (ROOT / "update-manager.js").read_text(encoding="utf-8")
        self.assertIn("./magazine/view/magazine-view-controller.js", source)
        self.assertIn("window.__liveEarthMagazineViewInstalled", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
